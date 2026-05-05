"""
Unified CT-scan analysis task: YOLO inference + report generation in one shot.
Fires automatically via post_save signal on CTScan creation (see dentapp/signals.py).
"""
import logging
import os

from celery import shared_task
from django.core.files.base import ContentFile
from django.utils import timezone
from PIL import Image

from ..models import AIProcessingJob, AnnotatedScan, CTScan, DentalReport
from ..services.report_service import ReportGenerationService
from ..services.yolo_service import YOLOInferenceService

logger = logging.getLogger(__name__)

# Module-level singleton — loaded once per Celery worker process, reused across all task invocations.
_yolo_service: YOLOInferenceService | None = None


def _get_yolo_service() -> YOLOInferenceService:
    global _yolo_service
    if _yolo_service is None:
        _yolo_service = YOLOInferenceService()
    return _yolo_service


def _build_patient_info(ct_scan: CTScan) -> dict:
    patient = ct_scan.patient   # always set via non-null FK chain
    dentist = ct_scan.dentist
    dob = patient.date_of_birth.isoformat() if patient and patient.date_of_birth else "N/A"
    name = patient.patient.full_name if patient else "Anonymous"
    dentist_name = f"Dr. {dentist.dentist.full_name}" if dentist else "N/A"
    return {
        "name": name,
        "dob": dob,
        "exam_date": ct_scan.uploaded_at.date().isoformat(),
        "dentist": dentist_name,
    }


def _create_error_report(ct_scan: CTScan, message: str) -> DentalReport:
    existing = DentalReport.objects.filter(ct_scan=ct_scan).first()
    if existing:
        if existing.status != 'error':
            return existing
        existing.error_message = message
        existing.save(update_fields=['error_message', 'updated_at'])
        return existing
    return DentalReport.objects.create(
        ct_scan=ct_scan,
        patient=ct_scan.patient,
        dentist=ct_scan.dentist,
        raw_detections=[],
        report_text='',
        status='error',
        error_message=message,
    )


def _sync_processing_job(
    ct_scan: CTScan,
    job_status: str,
    draft_report: str = '',
    mask_bytes: bytes = b'',
    label_map: dict | None = None,
) -> None:
    """Update the AIProcessingJob created by CTScanListCreateView to reflect Flow-B outcome.

    Non-fatal: a missing or already-finalized job is silently skipped so a lookup
    failure never breaks the DentalReport pipeline.
    """
    try:
        job = (
            AIProcessingJob.objects
            .filter(ct_scan=ct_scan)
            .order_by('-created_at')
            .first()
        )
        if job is None or job.status in ('finalized', 'dentist_reviewed'):
            return
        update_fields = ['status', 'completed_at', 'updated_at']
        job.status = job_status
        job.completed_at = timezone.now()
        if draft_report:
            job.draft_report = draft_report
            update_fields.append('draft_report')
        if not job.annotated_image:
            annotated = AnnotatedScan.objects.filter(ct_scan=ct_scan).order_by('-created_at').first()
            if annotated and annotated.image_overlay:
                job.annotated_image = annotated.image_overlay
                update_fields.append('annotated_image')
        if mask_bytes and not job.mask_image:
            mask_name = f'mask_{ct_scan.pk}_{timezone.now().strftime("%Y%m%d%H%M%S")}.png'
            job.mask_image.save(mask_name, ContentFile(mask_bytes), save=False)
            update_fields.append('mask_image')
        if label_map and not job.mask_label_map:
            job.mask_label_map = label_map
            update_fields.append('mask_label_map')
        job.save(update_fields=update_fields)
    except Exception as exc:
        logger.warning("analyze task: AIProcessingJob sync failed for scan %s: %s", ct_scan.pk, exc)


@shared_task(bind=True, max_retries=2, default_retry_delay=10)
def analyze_ct_scan_and_generate_report(self, ct_scan_id: int) -> dict:
    try:
        ct_scan = (
            CTScan.objects
            .select_related(
                'dentist_patient_link__patient__patient',
                'dentist_patient_link__dentist__dentist',
            )
            .get(pk=ct_scan_id)
        )
    except CTScan.DoesNotExist:
        logger.error("analyze task: CTScan %s not found", ct_scan_id)
        return {"error": "CTScan not found", "ct_scan_id": ct_scan_id}

    if not ct_scan.file:
        _create_error_report(ct_scan, "Scan file is missing.")
        _sync_processing_job(ct_scan, 'failed')
        return {"error": "Scan file missing", "ct_scan_id": ct_scan_id}

    ext = os.path.splitext(ct_scan.file.name)[1].lower()
    if ext not in {'.jpg', '.jpeg', '.png'}:
        _create_error_report(ct_scan, "Only PNG/JPG images are supported for analysis.")
        _sync_processing_job(ct_scan, 'failed')
        return {"error": "Unsupported file type", "ct_scan_id": ct_scan_id}

    # ── Step 1: open image ──────────────────────────────────────────────────
    try:
        image = Image.open(ct_scan.file).convert('RGB')
    except Exception as exc:
        logger.error("analyze task: cannot open image for scan %s: %s", ct_scan_id, exc)
        _create_error_report(ct_scan, "Unable to open scan image.")
        _sync_processing_job(ct_scan, 'failed')
        return {"error": "Image open failed", "ct_scan_id": ct_scan_id}

    # ── Steps 2+3: YOLO inference + segmentation mask overlay ─────────────
    # Single model pass — mask overlay used when the model has segmentation
    # heads (prettier); falls back to bbox overlay for detection-only models.
    yolo = _get_yolo_service()
    try:
        detections, overlay_bytes, mask_bytes, label_map = yolo.infer_and_overlay_with_mask(image)
    except Exception as exc:
        logger.error("analyze task: YOLO inference failed for scan %s: %s", ct_scan_id, exc, exc_info=True)
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=int(self.default_retry_delay * (2 ** self.request.retries)))
        report = _create_error_report(ct_scan, "Model inference failed.")
        _sync_processing_job(ct_scan, 'failed')
        return {"error": "YOLO failed", "report_id": report.pk}

    try:
        annotated_scan = AnnotatedScan(ct_scan=ct_scan, image_format='png')
        filename = f'annotated_{ct_scan_id}_{timezone.now().strftime("%Y%m%d%H%M%S")}.png'
        annotated_scan.image_overlay.save(filename, ContentFile(overlay_bytes), save=True)
    except Exception as exc:
        logger.warning("analyze task: overlay save failed for scan %s: %s", ct_scan_id, exc)

    # ── Step 4: generate report ─────────────────────────────────────────────
    patient_info = _build_patient_info(ct_scan)
    report_service = ReportGenerationService()
    try:
        report_text = report_service.generate_report(detections, patient_info)
    except Exception as exc:
        logger.error("analyze task: report generation failed for scan %s: %s", ct_scan_id, exc, exc_info=True)
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=int(self.default_retry_delay * (2 ** self.request.retries)))
        report = _create_error_report(ct_scan, "Report generation failed.")
        _sync_processing_job(ct_scan, 'failed')
        return {"error": "Report generation failed", "report_id": report.pk}

    # ── Step 5: persist DentalReport ───────────────────────────────────────
    existing = DentalReport.objects.filter(ct_scan=ct_scan).exclude(status='error').first()
    if existing:
        logger.info("analyze task: report already exists for scan %s, skipping duplicate", ct_scan_id)
        _sync_processing_job(ct_scan, 'draft_ready', draft_report=existing.report_text, mask_bytes=mask_bytes, label_map=label_map)
        return {"success": True, "report_id": existing.pk, "ct_scan_id": ct_scan_id}

    report = DentalReport.objects.create(
        ct_scan=ct_scan,
        patient=ct_scan.patient,
        dentist=ct_scan.dentist,
        raw_detections=detections,
        report_text=report_text,
        status='auto_generated',
        error_message='',
    )

    logger.info(
        "analyze task: report %s created for scan %s (%d detections)",
        report.pk, ct_scan_id, len(detections),
    )

    # ── Step 6: bridge to AIProcessingJob ──────────────────────────────────────
    _sync_processing_job(ct_scan, 'draft_ready', draft_report=report_text, mask_bytes=mask_bytes, label_map=label_map)

    return {"success": True, "report_id": report.pk, "ct_scan_id": ct_scan_id}
