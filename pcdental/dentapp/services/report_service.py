import logging

from django.conf import settings

from ..dental_report_generator import DentalReport, DentalReportGenerator

logger = logging.getLogger(__name__)


class ReportGenerationService:
    def __init__(self, api_key: str | None = None, timeout: int | None = None):
        self._api_key = api_key or getattr(settings, 'OPENROUTER_API_KEY', None)
        self._timeout = timeout or getattr(settings, 'REPORT_GENERATION_TIMEOUT', 30)

    def generate_report(self, detections: list[dict], patient_info: dict) -> str:
        generator = DentalReportGenerator(api_key=self._api_key, timeout=self._timeout)
        report: DentalReport = generator.generate(detections, patient_info)
        return report.text

    def handle_error(self, exc: Exception) -> None:
        # Log full details server-side; never expose to caller.
        logger.error("Report generation failed: %s", exc, exc_info=True)
        raise RuntimeError("Report generation failed. Please try again later.")
