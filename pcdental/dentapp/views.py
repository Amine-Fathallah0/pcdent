import logging
import mimetypes
import os

from django.contrib.auth import get_user_model
from django.db.models import Count
from django.http import FileResponse, Http404
from django.utils import timezone
from django.utils.encoding import smart_str
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import AIProcessingJob, AnnotatedScan, Appointment, CTScan, Dentist, DentalReport, DentistPatientLink, Patient
from .tasks import analyze_ct_scan_and_generate_report
from .serializers import (
    ActivePatientSerializer,
    AIProcessingJobSerializer,
    AnnotatedScanSerializer,
    AppointmentSerializer,
    CTScanSerializer,
    DentalReportSerializer,
    DentistPatientLinkSerializer,
    DentistRegistrationSerializer,
    JobReviewDecisionSerializer,
    PatientRegistrationSerializer,
    PendingLinkSerializer,
    UserSerializer,
)

User = get_user_model()
audit_logger = logging.getLogger('security.audit')


def _client_ip(request):
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def _build_auth_payload(user, is_dentist: bool):
    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)
    return {
        'refresh': str(refresh),
        'access': access,
        'token': access,
        'user_id': str(user.user_id),
        'email': user.email,
        'full_name': user.full_name,
        'is_dentist': is_dentist,
    }


def _get_role_profiles(request):
    if not hasattr(request, '_role_profiles'):
        user = request.user
        request._role_profiles = (
            Dentist.objects.filter(dentist=user, deleted_at__isnull=True).first(),
            Patient.objects.filter(patient=user, deleted_at__isnull=True).first(),
        )
    return request._role_profiles


def _get_authorized_job(request, job_id):
    job = generics.get_object_or_404(
        AIProcessingJob.objects.select_related(
            'ct_scan',
            'ct_scan__dentist_patient_link',
            'ct_scan__dentist_patient_link__patient',
            'ct_scan__dentist_patient_link__patient__patient',
        ),
        job_id=job_id,
    )
    link = job.ct_scan.dentist_patient_link
    dentist_profile, patient_profile = _get_role_profiles(request)
    is_authorized = (
        (dentist_profile and link.dentist_id == dentist_profile.pk)
        or (patient_profile and link.patient_id == patient_profile.pk)
    )
    if not is_authorized:
        raise PermissionDenied('You do not have access to this job.')
    return job


class DentistTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_input = attrs.get('username', '')
        if username_input and '@' in username_input:
            user = User.objects.filter(email__iexact=username_input).first()
            if user:
                attrs['username'] = user.username
        data = super().validate(attrs)
        is_dentist = Dentist.objects.filter(dentist=self.user).exists()
        data.update(_build_auth_payload(self.user, is_dentist=is_dentist))
        return data


class LoginView(TokenObtainPairView):
    serializer_class = DentistTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request, *args, **kwargs):
        username = request.data.get('username', '')
        try:
            response = super().post(request, *args, **kwargs)
        except Exception:
            audit_logger.warning(
                'auth.login.failed username=%s ip=%s reason=exception',
                username,
                _client_ip(request),
            )
            raise

        if response.status_code == status.HTTP_200_OK:
            audit_logger.info('auth.login.success username=%s ip=%s', username, _client_ip(request))
        else:
            audit_logger.warning(
                'auth.login.failed username=%s ip=%s status=%s',
                username,
                _client_ip(request),
                response.status_code,
            )
        return response

class DentistRegistrationView(generics.CreateAPIView):
    """
    API view to register a new dentist along with a new user account.
    """
    queryset = Dentist.objects.all()
    serializer_class = DentistRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'register'

    def create(self, request, *args, **kwargs):
        email = request.data.get('email', '')
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            dentist = serializer.save()
        except Exception:
            audit_logger.warning(
                'auth.register.dentist.failed email=%s ip=%s',
                email,
                _client_ip(request),
            )
            raise

        audit_logger.info(
            'auth.register.dentist.success email=%s user_id=%s ip=%s',
            dentist.dentist.email,
            dentist.dentist.user_id,
            _client_ip(request),
        )
        return Response(_build_auth_payload(dentist.dentist, is_dentist=True), status=status.HTTP_201_CREATED)

class PatientRegistrationView(generics.CreateAPIView):
    """
    API view to register a new patient along with a new user account.
    """
    queryset = Patient.objects.all()
    serializer_class = PatientRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'register'

    def create(self, request, *args, **kwargs):
        email = request.data.get('email', '')
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            patient = serializer.save()
        except Exception:
            audit_logger.warning(
                'auth.register.patient.failed email=%s ip=%s',
                email,
                _client_ip(request),
            )
            raise

        audit_logger.info(
            'auth.register.patient.success email=%s user_id=%s ip=%s',
            patient.patient.email,
            patient.patient.user_id,
            _client_ip(request),
        )
        return Response(_build_auth_payload(patient.patient, is_dentist=False), status=status.HTTP_201_CREATED)

class UserDetailView(APIView):
    """
    API View to retrieve the current authenticated user's details.
    Used to verify login.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = UserSerializer(request.user).data
        dentist = Dentist.objects.filter(dentist=request.user, deleted_at__isnull=True).first()
        if dentist:
            data['is_dentist'] = True
            data['location'] = dentist.location
            data['contact_number'] = dentist.contact_number
            data['dentist_code'] = dentist.dentist_code
        else:
            data['is_dentist'] = False
            data['location'] = None
            data['contact_number'] = None
            data['dentist_code'] = None
        return Response(data)

class LogoutView(APIView):
    """
    API View to logout the current user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({"detail": "Refresh token required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(refresh_token).blacklist()
        except (InvalidToken, TokenError):
            audit_logger.warning(
                'auth.logout.invalid_token user_id=%s ip=%s',
                request.user.user_id,
                _client_ip(request),
            )
            return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
        audit_logger.info('auth.logout.success user_id=%s ip=%s', request.user.user_id, _client_ip(request))
        return Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)


class AppointmentListCreateView(generics.ListCreateAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dentist_profile, patient_profile = _get_role_profiles(self.request)
        queryset = (
            Appointment.objects
            .filter(deleted_at__isnull=True)
            .select_related(
                'dentist_patient_link__dentist__dentist',
                'dentist_patient_link__patient__patient',
            )
        )

        if dentist_profile:
            return queryset.filter(dentist_patient_link__dentist=dentist_profile)
        if patient_profile:
            return queryset.filter(dentist_patient_link__patient=patient_profile)
        return queryset.none()

    def perform_create(self, serializer):
        link = serializer.validated_data['dentist_patient_link']
        dentist_profile, patient_profile = _get_role_profiles(self.request)
        if not dentist_profile and not patient_profile:
            raise PermissionDenied('You are not linked to appointment resources.')
        if dentist_profile and link.dentist_id != dentist_profile.pk:
            raise PermissionDenied('You cannot create appointments for another dentist.')
        if patient_profile and link.patient_id != patient_profile.pk:
            raise PermissionDenied('You cannot create appointments for another patient.')
        serializer.save()


class DentistPatientLinkListView(generics.ListAPIView):
    serializer_class = DentistPatientLinkSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dentist_profile, patient_profile = _get_role_profiles(self.request)
        queryset = DentistPatientLink.objects.filter(is_active=True)

        if dentist_profile:
            return queryset.filter(dentist=dentist_profile)
        if patient_profile:
            return queryset.filter(patient=patient_profile)
        return queryset.none()


class AppointmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dentist_profile, patient_profile = _get_role_profiles(self.request)
        queryset = (
            Appointment.objects
            .filter(deleted_at__isnull=True)
            .select_related(
                'dentist_patient_link__dentist__dentist',
                'dentist_patient_link__patient__patient',
            )
        )
        if dentist_profile:
            return queryset.filter(dentist_patient_link__dentist=dentist_profile)
        if patient_profile:
            return queryset.filter(dentist_patient_link__patient=patient_profile)
        return queryset.none()

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=['deleted_at'])


class AppointmentTypeSuggestionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        dentist_profile, _ = _get_role_profiles(request)
        if not dentist_profile:
            return Response([])
        suggestions = (
            Appointment.objects
            .filter(
                dentist_patient_link__dentist=dentist_profile,
                deleted_at__isnull=True,
                appointment_type__gt='',
            )
            .values('appointment_type')
            .annotate(count=Count('appointment_type'))
            .filter(count__gte=3)
            .order_by('-count')
            .values_list('appointment_type', flat=True)
        )
        return Response(list(suggestions))


class CTScanListCreateView(generics.ListCreateAPIView):
    serializer_class = CTScanSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        dentist_profile, patient_profile = _get_role_profiles(self.request)
        queryset = (
            CTScan.objects
            .filter(deleted_at__isnull=True)
            .select_related(
                'dentist_patient_link__dentist__dentist',
                'dentist_patient_link__patient__patient',
            )
        )

        if dentist_profile:
            return queryset.filter(dentist_patient_link__dentist=dentist_profile)
        if patient_profile:
            return queryset.filter(dentist_patient_link__patient=patient_profile)
        return queryset.none()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        link = serializer.validated_data['dentist_patient_link']
        dentist_profile, patient_profile = _get_role_profiles(request)
        if not dentist_profile and not patient_profile:
            raise PermissionDenied('You are not linked to CT scan resources.')
        if dentist_profile and link.dentist_id != dentist_profile.pk:
            raise PermissionDenied('You cannot upload scans for another dentist.')
        if patient_profile and link.patient_id != patient_profile.pk:
            raise PermissionDenied('You cannot upload scans for another patient.')

        scan = serializer.save(uploaded_by_user=request.user)
        job = AIProcessingJob.objects.create(
            ct_scan=scan,
            status='segmentation_pending',
            is_fallback_mode=True,
        )

        payload = {
            'scan': CTScanSerializer(scan, context={'request': request}).data,
            'job': AIProcessingJobSerializer(job, context={'request': request}).data,
        }
        return Response(payload, status=status.HTTP_201_CREATED)


class CTScanFileView(APIView):
    """
    Stream the raw CT scan file to authorized users only.

    Replaces relying on Django's public ``/media/`` URL, which had no
    authentication and would only work with ``DEBUG=True``. Only the dentist
    or the patient on the scan's link may download it.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        scan = generics.get_object_or_404(
            CTScan.objects.select_related('dentist_patient_link'),
            pk=pk,
            deleted_at__isnull=True,
        )

        link = scan.dentist_patient_link
        dentist_profile, patient_profile = _get_role_profiles(request)
        is_authorized = (
            (dentist_profile and link.dentist_id == dentist_profile.pk)
            or (patient_profile and link.patient_id == patient_profile.pk)
        )
        if not is_authorized:
            raise PermissionDenied('You do not have access to this scan.')

        if not scan.file:
            raise Http404('Scan file is missing.')

        try:
            file_handle = scan.file.open('rb')
        except FileNotFoundError as exc:
            raise Http404('Scan file is missing on disk.') from exc

        filename = os.path.basename(scan.file.name)
        content_type, _ = mimetypes.guess_type(filename)
        response = FileResponse(
            file_handle,
            as_attachment=False,
            content_type=content_type or 'application/octet-stream',
        )
        response['Content-Disposition'] = (
            f'inline; filename="{smart_str(filename)}"'
        )
        # Private medical data — do not let proxies/CDNs cache it.
        response['Cache-Control'] = 'private, no-store'
        return response


class AIProcessingJobListView(generics.ListAPIView):
    serializer_class = AIProcessingJobSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dentist_profile, patient_profile = _get_role_profiles(self.request)
        queryset = AIProcessingJob.objects.select_related('ct_scan', 'ct_scan__dentist_patient_link', 'ct_scan__dentist_patient_link__patient', 'ct_scan__dentist_patient_link__patient__patient')

        if dentist_profile:
            return queryset.filter(ct_scan__dentist_patient_link__dentist=dentist_profile)
        if patient_profile:
            return queryset.filter(ct_scan__dentist_patient_link__patient=patient_profile)
        return queryset.none()


class AIProcessingJobDetailView(generics.RetrieveAPIView):
    serializer_class = AIProcessingJobSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'job_id'

    def get_queryset(self):
        dentist_profile, patient_profile = _get_role_profiles(self.request)
        queryset = AIProcessingJob.objects.select_related('ct_scan', 'ct_scan__dentist_patient_link', 'ct_scan__dentist_patient_link__patient', 'ct_scan__dentist_patient_link__patient__patient')
        if dentist_profile:
            return queryset.filter(ct_scan__dentist_patient_link__dentist=dentist_profile)
        if patient_profile:
            return queryset.filter(ct_scan__dentist_patient_link__patient=patient_profile)
        return queryset.none()


class AIProcessingJobGenerateDraftView(APIView):
    """Re-trigger unified analysis (YOLO + report) for a failed or pending job.

    Blocked if an active (non-error) report already exists — use the
    dental-report edit/confirm endpoints instead.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, job_id):
        job = _get_authorized_job(request, job_id)
        ct_scan = job.ct_scan

        active_report = DentalReport.objects.filter(
            ct_scan=ct_scan,
            deleted_at__isnull=True,
        ).exclude(status='error').first()
        if active_report:
            return Response(
                {'detail': 'An active report already exists. Edit or confirm it instead.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Soft-delete any lingering error reports so the task can create a fresh one.
        DentalReport.objects.filter(
            ct_scan=ct_scan,
            status='error',
            deleted_at__isnull=True,
        ).update(deleted_at=timezone.now(), status='deleted')

        job.status = 'queued'
        job.draft_report = ''
        job.error_message = ''
        job.save(update_fields=['status', 'draft_report', 'error_message', 'updated_at'])

        analyze_ct_scan_and_generate_report.delay(ct_scan.pk)

        return Response(AIProcessingJobSerializer(job, context={'request': request}).data, status=status.HTTP_202_ACCEPTED)


class AIProcessingJobAnnotatedImageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, job_id):
        job = _get_authorized_job(request, job_id)
        if not job.annotated_image:
            raise Http404('Annotated image is missing.')

        try:
            file_handle = job.annotated_image.open('rb')
        except FileNotFoundError as exc:
            raise Http404('Annotated image is missing on disk.') from exc

        filename = os.path.basename(job.annotated_image.name)
        response = FileResponse(file_handle, as_attachment=False, content_type='image/png')
        response['Content-Disposition'] = f'inline; filename="{smart_str(filename)}"'
        response['Cache-Control'] = 'private, no-store'
        return response


class AIProcessingJobMaskImageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, job_id):
        job = _get_authorized_job(request, job_id)
        if not job.mask_image:
            raise Http404('Mask image is missing.')

        try:
            file_handle = job.mask_image.open('rb')
        except FileNotFoundError as exc:
            raise Http404('Mask image is missing on disk.') from exc

        filename = os.path.basename(job.mask_image.name)
        response = FileResponse(file_handle, as_attachment=False, content_type='image/png')
        response['Content-Disposition'] = f'inline; filename="{smart_str(filename)}"'
        response['Cache-Control'] = 'private, no-store'
        return response


class AIProcessingJobReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, job_id):
        serializer = JobReviewDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        dentist_profile, _ = _get_role_profiles(request)
        if not dentist_profile:
            raise PermissionDenied('Only dentists can review or finalize reports.')

        job = generics.get_object_or_404(
            AIProcessingJob.objects.select_related('ct_scan', 'ct_scan__dentist_patient_link', 'ct_scan__dentist_patient_link__patient', 'ct_scan__dentist_patient_link__patient__patient'),
            job_id=job_id,
            ct_scan__dentist_patient_link__dentist=dentist_profile,
        )

        decision = serializer.validated_data['decision']
        job.dentist_notes = serializer.validated_data.get('dentist_notes', '')
        if decision == 'finalized':
            job.status = 'finalized'
            job.completed_at = timezone.now()
        else:
            job.status = 'dentist_reviewed'
        job.save(update_fields=['dentist_notes', 'status', 'completed_at', 'updated_at'])

        return Response(AIProcessingJobSerializer(job, context={'request': request}).data, status=status.HTTP_200_OK)

class ActivePatientListView(generics.ListAPIView):
    serializer_class = ActivePatientSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dentist_profile, _ = _get_role_profiles(self.request)
        if not dentist_profile:
            raise PermissionDenied('Only dentists can view their patients.')
        return (
            DentistPatientLink.objects
            .filter(dentist=dentist_profile, is_active=True)
            .select_related('patient__patient')
        )


class PendingLinkListView(generics.ListAPIView):
    serializer_class = PendingLinkSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dentist_profile, _ = _get_role_profiles(self.request)
        if not dentist_profile:
            raise PermissionDenied('Only dentists can view pending requests.')
        return (
            DentistPatientLink.objects
            .filter(dentist=dentist_profile, is_active=False)
            .select_related('patient__patient')
        )


class LinkApproveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        dentist_profile, _ = _get_role_profiles(request)
        if not dentist_profile:
            raise PermissionDenied('Only dentists can approve requests.')
        link = generics.get_object_or_404(
            DentistPatientLink, pk=pk, dentist=dentist_profile, is_active=False
        )
        link.is_active = True
        link.save(update_fields=['is_active'])
        return Response({'detail': 'Patient accepted.'}, status=status.HTTP_200_OK)


class LinkRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        dentist_profile, _ = _get_role_profiles(request)
        if not dentist_profile:
            raise PermissionDenied('Only dentists can reject requests.')
        link = generics.get_object_or_404(
            DentistPatientLink, pk=pk, dentist=dentist_profile, is_active=False
        )
        link.delete()
        return Response({'detail': 'Patient request rejected.'}, status=status.HTTP_200_OK)


class DentistPatientLinkRequestView(APIView):
    """Patient enters a dentist's DR-XXXX code to send a connection request."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        dentist_code = request.data.get('dentist_code', '').strip().upper()
        if not dentist_code:
            return Response({'detail': 'dentist_code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        _, patient_profile = _get_role_profiles(request)
        if not patient_profile:
            raise PermissionDenied('Only patients can send connection requests.')

        try:
            dentist = Dentist.objects.get(dentist_code=dentist_code, deleted_at__isnull=True)
        except Dentist.DoesNotExist:
            return Response({'detail': 'No dentist found with that code.'}, status=status.HTTP_404_NOT_FOUND)

        existing = DentistPatientLink.objects.filter(dentist=dentist, patient=patient_profile).first()
        if existing:
            msg = 'You are already connected to this dentist.' if existing.is_active else 'A pending request already exists for this dentist.'
            return Response({'detail': msg}, status=status.HTTP_400_BAD_REQUEST)

        link = DentistPatientLink.objects.create(
            dentist=dentist,
            patient=patient_profile,
            is_active=False,
        )
        return Response(DentistPatientLinkSerializer(link).data, status=status.HTTP_201_CREATED)


# ─── DentalReport ViewSet ────────────────────────────────────────────────────

class DentalReportListView(generics.ListAPIView):
    serializer_class = DentalReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dentist_profile, patient_profile = _get_role_profiles(self.request)
        qs = (
            DentalReport.objects
            .filter(deleted_at__isnull=True)
            .select_related('patient__patient', 'dentist__dentist', 'edited_by')
        )
        if dentist_profile:
            qs = qs.filter(ct_scan__dentist_patient_link__dentist=dentist_profile)
        elif patient_profile:
            qs = qs.filter(ct_scan__dentist_patient_link__patient=patient_profile)
        else:
            return qs.none()

        # Optional filters
        params = self.request.query_params
        if ct_scan_id := params.get('ct_scan__id'):
            qs = qs.filter(ct_scan_id=ct_scan_id)
        if patient_id := params.get('patient__id'):
            qs = qs.filter(patient__patient__user_id=patient_id)
        if report_status := params.get('status'):
            qs = qs.filter(status=report_status)
        if created_after := params.get('created_after'):
            qs = qs.filter(created_at__date__gte=created_after)
        if created_before := params.get('created_before'):
            qs = qs.filter(created_at__date__lte=created_before)
        return qs


class DentalReportDetailView(generics.RetrieveAPIView):
    serializer_class = DentalReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dentist_profile, patient_profile = _get_role_profiles(self.request)
        qs = DentalReport.objects.filter(deleted_at__isnull=True).select_related(
            'patient__patient', 'dentist__dentist', 'edited_by'
        )
        if dentist_profile:
            return qs.filter(ct_scan__dentist_patient_link__dentist=dentist_profile)
        if patient_profile:
            return qs.filter(ct_scan__dentist_patient_link__patient=patient_profile)
        return qs.none()


class DentalReportUpdateView(generics.UpdateAPIView):
    """PATCH only — edits report_text; blocks changes once confirmed."""
    serializer_class = DentalReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['patch']

    def get_queryset(self):
        dentist_profile, _ = _get_role_profiles(self.request)
        if not dentist_profile:
            return DentalReport.objects.none()
        return DentalReport.objects.filter(
            ct_scan__dentist_patient_link__dentist=dentist_profile,
            deleted_at__isnull=True,
        )

    def partial_update(self, request, *args, **kwargs):
        report = self.get_object()
        if report.status == 'confirmed':
            raise PermissionDenied('This report has been confirmed and is now immutable.')
        report.report_text = request.data.get('report_text', report.report_text)
        report.edit_count += 1
        report.edited_by = request.user
        report.status = 'edited'
        report.save(update_fields=['report_text', 'edit_count', 'edited_by', 'status', 'updated_at'])
        return Response(DentalReportSerializer(report, context={'request': request}).data)


class DentalReportConfirmView(APIView):
    """POST /dental-reports/{id}/confirm/ — marks report confirmed (immutable)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        dentist_profile, _ = _get_role_profiles(request)
        if not dentist_profile:
            raise PermissionDenied('Only dentists can confirm reports.')
        report = generics.get_object_or_404(
            DentalReport.objects.filter(
                ct_scan__dentist_patient_link__dentist=dentist_profile,
                deleted_at__isnull=True,
            ),
            pk=pk,
        )
        if report.status == 'confirmed':
            return Response({'detail': 'Already confirmed.'}, status=status.HTTP_200_OK)
        report.status = 'confirmed'
        report.save(update_fields=['status', 'updated_at'])
        return Response(DentalReportSerializer(report, context={'request': request}).data)


class DentalReportDeleteView(APIView):
    """DELETE /dental-reports/{id}/ — soft delete; preserves audit trail."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        dentist_profile, _ = _get_role_profiles(request)
        if not dentist_profile:
            raise PermissionDenied('Only dentists can delete reports.')
        report = generics.get_object_or_404(
            DentalReport.objects.filter(
                ct_scan__dentist_patient_link__dentist=dentist_profile,
            ),
            pk=pk,
        )
        report.deleted_at = timezone.now()
        report.status = 'deleted'
        report.save(update_fields=['deleted_at', 'status', 'updated_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── AnnotatedScan ViewSet ───────────────────────────────────────────────────

class AnnotatedScanListView(generics.ListAPIView):
    serializer_class = AnnotatedScanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dentist_profile, patient_profile = _get_role_profiles(self.request)
        qs = AnnotatedScan.objects.select_related('ct_scan__dentist_patient_link')
        if dentist_profile:
            qs = qs.filter(ct_scan__dentist_patient_link__dentist=dentist_profile)
        elif patient_profile:
            qs = qs.filter(ct_scan__dentist_patient_link__patient=patient_profile)
        else:
            return qs.none()
        if ct_scan_id := self.request.query_params.get('ct_scan__id'):
            qs = qs.filter(ct_scan_id=ct_scan_id)
        return qs


class AnnotatedScanImageView(APIView):
    """Stream the annotated overlay image to authorized users."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        scan = generics.get_object_or_404(
            AnnotatedScan.objects.select_related('ct_scan__dentist_patient_link'),
            pk=pk,
        )
        link = scan.ct_scan.dentist_patient_link
        dentist_profile, patient_profile = _get_role_profiles(request)
        if not (
            (dentist_profile and link.dentist_id == dentist_profile.pk)
            or (patient_profile and link.patient_id == patient_profile.pk)
        ):
            raise PermissionDenied('You do not have access to this scan.')

        if not scan.image_overlay:
            raise Http404('Overlay image is missing.')

        try:
            fh = scan.image_overlay.open('rb')
        except FileNotFoundError as exc:
            raise Http404('Overlay image is missing on disk.') from exc

        filename = os.path.basename(scan.image_overlay.name)
        resp = FileResponse(fh, as_attachment=False, content_type='image/png')
        resp['Content-Disposition'] = f'inline; filename="{smart_str(filename)}"'
        resp['Cache-Control'] = 'private, no-store'
        return resp


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_root(request):
    return Response({
        "message": "Welcome to the Dentist API",
        "endpoints": {
            "login": "/login/",
            "logout": "/logout/",
            "register_dentist": "/dentists/register/",
            "register_patient": "/patients/register/",
            "me": "/me/",
            "appointments": "/appointments/",
            "cases": "/ct-scans/",
            "jobs": "/jobs/"
        }
    })