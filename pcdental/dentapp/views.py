import logging
import mimetypes
import os

from django.contrib.auth import get_user_model
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

from .models import AIProcessingJob, Appointment, CTScan, Dentist, DentistPatientLink, Patient
from .serializers import (
    ActivePatientSerializer,
    AIProcessingJobSerializer,
    AppointmentSerializer,
    CTScanSerializer,
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
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, job_id):
        job = generics.get_object_or_404(
            AIProcessingJob.objects.select_related('ct_scan', 'ct_scan__dentist_patient_link', 'ct_scan__dentist_patient_link__patient', 'ct_scan__dentist_patient_link__patient__patient'),
            job_id=job_id,
        )
        dentist_profile, patient_profile = _get_role_profiles(request)
        link = job.ct_scan.dentist_patient_link
        if dentist_profile and link.dentist_id != dentist_profile.pk:
            raise PermissionDenied('You cannot request a draft for this job.')
        if patient_profile and link.patient_id != patient_profile.pk:
            raise PermissionDenied('You cannot request a draft for this job.')
        if not dentist_profile and not patient_profile:
            raise PermissionDenied('Unauthorized.')

        job.status = 'draft_ready'
        job.draft_report = (
            'Draft report generated in fallback mode. Segmentation service is not connected yet. '
            'Dentist review is required before finalization.'
        )
        job.save(update_fields=['draft_report', 'status', 'updated_at'])

        return Response(AIProcessingJobSerializer(job, context={'request': request}).data, status=status.HTTP_200_OK)


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