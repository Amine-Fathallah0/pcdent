import logging
import mimetypes
import os

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
from django.http import FileResponse, Http404
from django.utils import timezone
from django.utils.encoding import smart_str
from rest_framework import generics, permissions, serializers, status
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

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .consumers import user_group_name
from .models import (
    AIProcessingJob,
    AnnotatedScan,
    Appointment,
    Conversation,
    CTScan,
    DentalReport,
    Dentist,
    DentistAvailabilityOverride,
    DentistPatientLink,
    DentistSchedule,
    Message,
    Notification,
    Patient,
)
from .notifications import notify
from .scheduling import (
    MAX_HORIZON_DAYS,
    MAX_RANGE_DAYS,
    MIN_LEAD_HOURS,
    available_slots_for_range,
    has_conflict,
)
from .tasks import analyze_ct_scan_and_generate_report
from .serializers import (
    ActivePatientSerializer,
    AIProcessingJobSerializer,
    AnnotatedScanSerializer,
    AppointmentSerializer,
    ConversationSerializer,
    CTScanSerializer,
    DentalReportSerializer,
    DentistAvailabilityOverrideSerializer,
    DentistPatientLinkSerializer,
    DentistRegistrationSerializer,
    DentistScheduleSerializer,
    JobReviewDecisionSerializer,
    MessageSerializer,
    NotificationSerializer,
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
        'is_admin': user.is_admin,
    }


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, _view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)


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

        appt_date = serializer.validated_data['appointment_date']
        duration = serializer.validated_data.get('duration', 30)
        _validate_proposal_window(appt_date)

        force = bool(self.request.data.get('force_override'))
        if has_conflict(link.dentist, appt_date, duration):
            if patient_profile or not force:
                raise serializers.ValidationError(
                    {'detail': 'Time conflict with an existing appointment.', 'conflict': True}
                )

        # Patient-created → pending_dentist; Dentist-created → confirmed.
        initial_status = 'pending_dentist' if patient_profile else 'confirmed'
        appt = serializer.save(
            status=initial_status,
            last_proposed_by=self.request.user,
        )

        if initial_status == 'pending_dentist':
            notify(link.dentist.dentist, 'appointment_requested', appt)
        else:
            notify(link.patient.patient, 'appointment_modified', appt)


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


# ─── Messaging ───────────────────────────────────────────────────────────────

def _conversations_for(user):
    """All conversations the given user participates in (active links only)."""
    return (
        Conversation.objects
        .filter(dentist_patient_link__is_active=True)
        .filter(
            Q(dentist_patient_link__dentist__dentist=user)
            | Q(dentist_patient_link__patient__patient=user)
        )
        .select_related(
            'dentist_patient_link__dentist__dentist',
            'dentist_patient_link__patient__patient',
        )
    )


def _conversation_participants(conversation):
    return (
        conversation.dentist_patient_link.dentist.dentist,
        conversation.dentist_patient_link.patient.patient,
    )


def _broadcast(group_name, payload):
    layer = get_channel_layer()
    if layer is None:
        return
    async_to_sync(layer.group_send)(group_name, payload)


def _mark_conversation_read(conversation, reader):
    """Mark every message NOT sent by ``reader`` as read and notify the sender."""
    updated = (
        conversation.messages
        .filter(is_read=False)
        .exclude(sender=reader)
        .update(is_read=True)
    )
    if not updated:
        return 0
    dentist_user, patient_user = _conversation_participants(conversation)
    other = patient_user if reader.pk == dentist_user.pk else dentist_user
    _broadcast(user_group_name(other.user_id), {
        'type': 'chat.read',
        'conversation_id': conversation.id,
        'reader_id': str(reader.user_id),
    })
    return updated


class ConversationListView(generics.ListAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return _conversations_for(self.request.user).order_by('-last_message_at', '-created_at')


class ConversationMessagesView(APIView):
    """GET — load the last 100 messages and mark unseen ones as read.
    POST — send a new message and broadcast it to both participants.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_conversation(self, request, pk):
        return generics.get_object_or_404(_conversations_for(request.user), pk=pk)

    def get(self, request, pk):
        conv = self._get_conversation(request, pk)
        messages_qs = conv.messages.order_by('-created_at')[:100]
        messages = list(reversed(messages_qs))
        _mark_conversation_read(conv, request.user)
        data = MessageSerializer(messages, many=True).data
        return Response(data)

    def post(self, request, pk):
        conv = self._get_conversation(request, pk)
        content = (request.data.get('content') or '').strip()
        if not content:
            return Response({'detail': 'Message content cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(content) > 5000:
            return Response({'detail': 'Message is too long.'}, status=status.HTTP_400_BAD_REQUEST)

        message = Message.objects.create(
            conversation=conv,
            sender=request.user,
            content=content,
            is_read=False,
        )
        conv.last_message_at = message.created_at
        conv.save(update_fields=['last_message_at'])

        payload = MessageSerializer(message).data

        dentist_user, patient_user = _conversation_participants(conv)
        for participant in (dentist_user, patient_user):
            _broadcast(user_group_name(participant.user_id), {
                'type': 'chat.message',
                'conversation_id': conv.id,
                'message': payload,
            })

        return Response(payload, status=status.HTTP_201_CREATED)


class ConversationReadView(APIView):
    """Mark all messages from the other party as read. Idempotent."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        conv = generics.get_object_or_404(_conversations_for(request.user), pk=pk)
        _mark_conversation_read(conv, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


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


# ─── Admin Views ─────────────────────────────────────────────────────────────

class AdminStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        return Response({
            'total_dentists': Dentist.objects.filter(deleted_at__isnull=True).count(),
            'verified_dentists': Dentist.objects.filter(deleted_at__isnull=True, is_verified=True).count(),
            'pending_dentists': Dentist.objects.filter(deleted_at__isnull=True, is_verified=False).count(),
            'total_patients': Patient.objects.filter(deleted_at__isnull=True).count(),
            'total_appointments': Appointment.objects.count(),
            'total_ai_jobs': AIProcessingJob.objects.count(),
        })


class AdminDentistListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        dentists = (
            Dentist.objects
            .filter(deleted_at__isnull=True)
            .select_related('dentist')
            .annotate(patient_count=Count('dentistpatientlink'))
        )
        data = [
            {
                'id': str(d.dentist.user_id),
                'full_name': d.dentist.full_name,
                'email': d.dentist.email,
                'location': d.location,
                'contact_number': d.contact_number,
                'dentist_code': d.dentist_code,
                'is_verified': d.is_verified,
                'patient_count': getattr(d, 'patient_count', 0),
            }
            for d in dentists
        ]
        return Response(data)


class AdminVerifyDentistView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, dentist_id):
        dentist = generics.get_object_or_404(Dentist, dentist__user_id=dentist_id, deleted_at__isnull=True)
        dentist.is_verified = True
        dentist.save(update_fields=['is_verified'])
        return Response({'status': 'verified'})


class AdminSuspendDentistView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def post(self, request, dentist_id):
        dentist = generics.get_object_or_404(Dentist, dentist__user_id=dentist_id, deleted_at__isnull=True)
        dentist.is_verified = False
        dentist.save(update_fields=['is_verified'])
        return Response({'status': 'suspended'})


class AdminPatientListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get(self, request):
        patients = (
            Patient.objects
            .filter(deleted_at__isnull=True)
            .select_related('patient')
            .annotate(appointment_count=Count('dentistpatientlink__appointment'))
        )
        data = [
            {
                'id': str(p.patient.user_id),
                'full_name': p.patient.full_name,
                'email': p.patient.email,
                'contact_number': p.contact_number,
                'date_of_birth': p.date_of_birth.isoformat(),
                'appointment_count': getattr(p, 'appointment_count', 0),
            }
            for p in patients
        ]
        return Response(data)


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
            "jobs": "/jobs/",
            "conversations": "/conversations/",
            "notifications": "/notifications/",
        }
    })


# ─── Scheduling: dentist availability + slot computation ─────────────────────

class DentistScheduleView(APIView):
    """GET/PUT the dentist's recurring weekly schedule (replace whole list)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        dentist_profile, _ = _get_role_profiles(request)
        if not dentist_profile:
            raise PermissionDenied('Only dentists have a schedule.')
        entries = DentistSchedule.objects.filter(dentist=dentist_profile)
        return Response(DentistScheduleSerializer(entries, many=True).data)

    def put(self, request):
        dentist_profile, _ = _get_role_profiles(request)
        if not dentist_profile:
            raise PermissionDenied('Only dentists can edit a schedule.')
        data = request.data if isinstance(request.data, list) else request.data.get('entries', [])
        serializer = DentistScheduleSerializer(data=data, many=True)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            DentistSchedule.objects.filter(dentist=dentist_profile).delete()
            DentistSchedule.objects.bulk_create([
                DentistSchedule(dentist=dentist_profile, **entry)
                for entry in serializer.validated_data
            ])
        entries = DentistSchedule.objects.filter(dentist=dentist_profile)
        return Response(DentistScheduleSerializer(entries, many=True).data)


class DentistAvailabilityOverrideListCreateView(generics.ListCreateAPIView):
    serializer_class = DentistAvailabilityOverrideSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dentist_profile, _ = _get_role_profiles(self.request)
        if not dentist_profile:
            return DentistAvailabilityOverride.objects.none()
        return DentistAvailabilityOverride.objects.filter(dentist=dentist_profile)

    def perform_create(self, serializer):
        dentist_profile, _ = _get_role_profiles(self.request)
        if not dentist_profile:
            raise PermissionDenied('Only dentists can manage availability overrides.')
        serializer.save(dentist=dentist_profile)


class DentistAvailabilityOverrideDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = DentistAvailabilityOverrideSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dentist_profile, _ = _get_role_profiles(self.request)
        if not dentist_profile:
            return DentistAvailabilityOverride.objects.none()
        return DentistAvailabilityOverride.objects.filter(dentist=dentist_profile)


class DentistAvailableSlotsView(APIView):
    """Compute available start times for a dentist over a date range.

    Query params: start_date, end_date (ISO YYYY-MM-DD), duration (minutes, default 30).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, dentist_id):
        try:
            dentist = Dentist.objects.get(pk=dentist_id, deleted_at__isnull=True)
        except Dentist.DoesNotExist:
            return Response({'detail': 'Dentist not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Patients can only query dentists they have an active link with.
        dentist_profile, patient_profile = _get_role_profiles(request)
        if patient_profile and not DentistPatientLink.objects.filter(
            dentist=dentist, patient=patient_profile, is_active=True
        ).exists():
            raise PermissionDenied('You are not connected to this dentist.')
        if dentist_profile and dentist_profile.pk != dentist.pk:
            raise PermissionDenied('Dentists can only query their own slots.')

        from datetime import date as _date
        try:
            start_date = _date.fromisoformat(request.query_params.get('start_date', ''))
            end_date = _date.fromisoformat(request.query_params.get('end_date', ''))
            duration = int(request.query_params.get('duration', 30))
        except ValueError:
            return Response(
                {'detail': 'start_date, end_date (YYYY-MM-DD) and integer duration are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if end_date < start_date:
            return Response({'detail': 'end_date must be on or after start_date.'}, status=status.HTTP_400_BAD_REQUEST)
        if (end_date - start_date).days > MAX_RANGE_DAYS:
            return Response(
                {'detail': f'Range cannot exceed {MAX_RANGE_DAYS} days.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        slots = available_slots_for_range(dentist, start_date, end_date, duration)
        return Response({
            'dentist_id': dentist_id,
            'duration': duration,
            'min_lead_hours': MIN_LEAD_HOURS,
            'max_horizon_days': MAX_HORIZON_DAYS,
            'slots': slots,
        })


# ─── Appointment workflow actions ────────────────────────────────────────────

def _get_appointment_for_user(request, pk):
    """Fetch an appointment that the user is a participant on. Raises 404/403."""
    appt = generics.get_object_or_404(
        Appointment.objects.select_related(
            'dentist_patient_link__dentist__dentist',
            'dentist_patient_link__patient__patient',
        ),
        pk=pk,
        deleted_at__isnull=True,
    )
    dentist_profile, patient_profile = _get_role_profiles(request)
    link = appt.dentist_patient_link
    if dentist_profile and link.dentist_id == dentist_profile.pk:
        return appt, 'dentist'
    if patient_profile and link.patient_id == patient_profile.pk:
        return appt, 'patient'
    raise PermissionDenied('You do not have access to this appointment.')


def _participants(appt):
    return (
        appt.dentist_patient_link.dentist.dentist,
        appt.dentist_patient_link.patient.patient,
    )


def _other_party(appt, user):
    dentist_user, patient_user = _participants(appt)
    return patient_user if user.pk == dentist_user.pk else dentist_user


def _validate_proposal_window(start_dt):
    now = timezone.now()
    if start_dt < now + timezone.timedelta(hours=MIN_LEAD_HOURS):
        raise serializers.ValidationError(
            f'Appointment must be at least {MIN_LEAD_HOURS} hours from now.'
        )
    if start_dt > now + timezone.timedelta(days=MAX_HORIZON_DAYS):
        raise serializers.ValidationError(
            f'Appointment cannot be more than {MAX_HORIZON_DAYS} days away.'
        )


class AppointmentCounterProposeView(APIView):
    """Propose a new time/duration. Counter increments. Either party may call
    while their counterpart's proposal is on the table.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        appt, role = _get_appointment_for_user(request, pk)

        if role == 'dentist' and appt.status != 'pending_dentist':
            return Response({'detail': "It's not your turn to propose."}, status=status.HTTP_400_BAD_REQUEST)
        if role == 'patient' and appt.status != 'pending_patient':
            return Response({'detail': "It's not your turn to propose."}, status=status.HTTP_400_BAD_REQUEST)
        if appt.counter_proposal_count >= Appointment.MAX_COUNTER_PROPOSALS:
            return Response(
                {'detail': 'Maximum counter-proposals reached. Accept or decline instead.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_date_raw = request.data.get('appointment_date')
        new_duration = request.data.get('duration', appt.duration)
        new_note = request.data.get('proposal_note', '')

        if not new_date_raw:
            return Response({'detail': 'appointment_date is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            new_date = serializers.DateTimeField().to_internal_value(new_date_raw)
            new_duration = int(new_duration)
        except (serializers.ValidationError, ValueError):
            return Response({'detail': 'Invalid appointment_date or duration.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            _validate_proposal_window(new_date)
        except serializers.ValidationError as err:
            return Response({'detail': err.detail[0] if isinstance(err.detail, list) else str(err.detail)},
                            status=status.HTTP_400_BAD_REQUEST)

        force = bool(request.data.get('force_override'))
        if has_conflict(appt.dentist_patient_link.dentist, new_date, new_duration, exclude_id=appt.pk):
            if role == 'patient' or not force:
                return Response(
                    {'detail': 'Time conflict with an existing appointment.', 'conflict': True},
                    status=status.HTTP_409_CONFLICT,
                )

        appt.appointment_date = new_date
        appt.duration = new_duration
        appt.proposal_note = new_note
        appt.counter_proposal_count += 1
        appt.last_proposed_by = request.user
        appt.status = 'pending_patient' if role == 'dentist' else 'pending_dentist'
        appt.save(update_fields=[
            'appointment_date', 'duration', 'proposal_note',
            'counter_proposal_count', 'last_proposed_by', 'status', 'updated_at',
        ])

        notify(_other_party(appt, request.user), 'appointment_counter_proposed', appt)
        return Response(AppointmentSerializer(appt).data)


class AppointmentAcceptView(APIView):
    """Accept the current proposal — moves to 'confirmed'."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        appt, role = _get_appointment_for_user(request, pk)

        if role == 'dentist' and appt.status != 'pending_dentist':
            return Response({'detail': "Nothing pending your acceptance."}, status=status.HTTP_400_BAD_REQUEST)
        if role == 'patient' and appt.status != 'pending_patient':
            return Response({'detail': "Nothing pending your acceptance."}, status=status.HTTP_400_BAD_REQUEST)

        force = bool(request.data.get('force_override'))
        if has_conflict(appt.dentist_patient_link.dentist, appt.appointment_date, appt.duration, exclude_id=appt.pk):
            if role == 'patient' or not force:
                return Response(
                    {'detail': 'Time conflict with an existing appointment.', 'conflict': True},
                    status=status.HTTP_409_CONFLICT,
                )

        appt.status = 'confirmed'
        appt.save(update_fields=['status', 'updated_at'])

        notify(_other_party(appt, request.user), 'appointment_accepted', appt)
        return Response(AppointmentSerializer(appt).data)


class AppointmentDeclineView(APIView):
    """Decline the current proposal — moves to 'cancelled'. Negotiation ends."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        appt, role = _get_appointment_for_user(request, pk)

        if appt.status not in ('pending_dentist', 'pending_patient'):
            return Response({'detail': 'No pending proposal to decline.'}, status=status.HTTP_400_BAD_REQUEST)
        if role == 'dentist' and appt.status != 'pending_dentist':
            return Response({'detail': "Not your turn."}, status=status.HTTP_400_BAD_REQUEST)
        if role == 'patient' and appt.status != 'pending_patient':
            return Response({'detail': "Not your turn."}, status=status.HTTP_400_BAD_REQUEST)

        appt.status = 'cancelled'
        appt.cancelled_by = request.user
        appt.cancellation_reason = request.data.get('reason', '')
        appt.save(update_fields=['status', 'cancelled_by', 'cancellation_reason', 'updated_at'])

        notify(_other_party(appt, request.user), 'appointment_declined', appt)
        return Response(AppointmentSerializer(appt).data)


class AppointmentCancelView(APIView):
    """Cancel a non-terminal appointment. Either party can call."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        appt, _role = _get_appointment_for_user(request, pk)

        if appt.status in Appointment.TERMINAL_STATUSES:
            return Response({'detail': 'Appointment is already in a terminal state.'}, status=status.HTTP_400_BAD_REQUEST)

        appt.status = 'cancelled'
        appt.cancelled_by = request.user
        appt.cancellation_reason = request.data.get('reason', '')
        appt.save(update_fields=['status', 'cancelled_by', 'cancellation_reason', 'updated_at'])

        notify(_other_party(appt, request.user), 'appointment_cancelled', appt)
        return Response(AppointmentSerializer(appt).data)


class AppointmentCompleteView(APIView):
    """Dentist marks an appointment as completed. Only allowed once the
    appointment date has passed.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        appt, role = _get_appointment_for_user(request, pk)
        if role != 'dentist':
            raise PermissionDenied('Only the dentist can mark completed.')

        if appt.appointment_date > timezone.now():
            return Response({'detail': 'Cannot complete a future appointment.'}, status=status.HTTP_400_BAD_REQUEST)
        # Allow flipping no_show → completed within 7 days; reject otherwise.
        if appt.status == 'cancelled':
            return Response({'detail': 'Cancelled appointments cannot be completed.'}, status=status.HTTP_400_BAD_REQUEST)
        if appt.status == 'no_show':
            if timezone.now() - appt.appointment_date > timezone.timedelta(days=7):
                return Response({'detail': 'Beyond 7-day correction window.'}, status=status.HTTP_400_BAD_REQUEST)

        appt.status = 'completed'
        appt.save(update_fields=['status', 'updated_at'])
        return Response(AppointmentSerializer(appt).data)


class AppointmentNoShowView(APIView):
    """Dentist marks an appointment as no_show. Same time guards as completion."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        appt, role = _get_appointment_for_user(request, pk)
        if role != 'dentist':
            raise PermissionDenied('Only the dentist can mark no-show.')

        if appt.appointment_date > timezone.now():
            return Response({'detail': 'Cannot mark a future appointment as no-show.'}, status=status.HTTP_400_BAD_REQUEST)
        if appt.status == 'cancelled':
            return Response({'detail': 'Cancelled appointments cannot be marked no-show.'}, status=status.HTTP_400_BAD_REQUEST)
        if appt.status == 'completed':
            if timezone.now() - appt.appointment_date > timezone.timedelta(days=7):
                return Response({'detail': 'Beyond 7-day correction window.'}, status=status.HTTP_400_BAD_REQUEST)

        appt.status = 'no_show'
        appt.save(update_fields=['status', 'updated_at'])
        return Response(AppointmentSerializer(appt).data)


# ─── Notifications ────────────────────────────────────────────────────────────

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user).select_related(
            'related_appointment',
            'related_appointment__dentist_patient_link__dentist__dentist',
            'related_appointment__dentist_patient_link__patient__patient',
        )
        if self.request.query_params.get('unread') == 'true':
            qs = qs.filter(is_read=False)
        return qs


class NotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            raise Http404('Notification not found.')
        if not notif.is_read:
            notif.is_read = True
            notif.read_at = timezone.now()
            notif.save(update_fields=['is_read', 'read_at'])
        return Response(NotificationSerializer(notif).data)


class NotificationReadAllView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(
            is_read=True, read_at=timezone.now()
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
