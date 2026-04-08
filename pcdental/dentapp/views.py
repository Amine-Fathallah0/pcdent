from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import AIProcessingJob, Appointment, CTScan, Dentist, DentistPatientLink, Patient
from .serializers import (
    AIProcessingJobSerializer,
    AppointmentSerializer,
    CTScanSerializer,
    DentistPatientLinkSerializer,
    DentistRegistrationSerializer,
    JobReviewDecisionSerializer,
    PatientRegistrationSerializer,
    UserSerializer,
)

User = get_user_model()


def _build_auth_payload(user):
    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)
    is_dentist = Dentist.objects.filter(dentist=user).exists()
    return {
        'refresh': str(refresh),
        'access': access,
        'token': access,
        'user_id': str(user.user_id),
        'email': user.email,
        'full_name': user.full_name,
        'is_dentist': is_dentist,
    }


def _get_role_profiles(user):
    dentist_profile = Dentist.objects.filter(dentist=user, deleted_at__isnull=True).first()
    patient_profile = Patient.objects.filter(patient=user, deleted_at__isnull=True).first()
    return dentist_profile, patient_profile


class DentistTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data.update(_build_auth_payload(self.user))
        return data


class LoginView(TokenObtainPairView):
    serializer_class = DentistTokenObtainPairSerializer

class DentistRegistrationView(generics.CreateAPIView):
    """
    API view to register a new dentist along with a new user account.
    """
    queryset = Dentist.objects.all()
    serializer_class = DentistRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dentist = serializer.save()
        return Response(_build_auth_payload(dentist.dentist), status=status.HTTP_201_CREATED)

class PatientRegistrationView(generics.CreateAPIView):
    """
    API view to register a new patient along with a new user account.
    """
    queryset = Patient.objects.all()
    serializer_class = PatientRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        patient = serializer.save()
        return Response(_build_auth_payload(patient.patient), status=status.HTTP_201_CREATED)

class UserDetailView(APIView):
    """
    API View to retrieve the current authenticated user's details.
    Used to verify login.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class LogoutView(APIView):
    """
    API View to logout the current user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                # Blacklisting requires optional app support; ignore in local dev.
                pass
        return Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)


class AppointmentListCreateView(generics.ListCreateAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dentist_profile, patient_profile = _get_role_profiles(self.request.user)
        queryset = Appointment.objects.filter(deleted_at__isnull=True)

        if dentist_profile:
            return queryset.filter(dentist_patient_link__dentist=dentist_profile)
        if patient_profile:
            return queryset.filter(dentist_patient_link__patient=patient_profile)
        return queryset.none()

    def perform_create(self, serializer):
        link = serializer.validated_data['dentist_patient_link']
        dentist_profile, patient_profile = _get_role_profiles(self.request.user)
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
        dentist_profile, patient_profile = _get_role_profiles(self.request.user)
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
        dentist_profile, patient_profile = _get_role_profiles(self.request.user)
        queryset = Appointment.objects.filter(deleted_at__isnull=True)
        if dentist_profile:
            return queryset.filter(dentist_patient_link__dentist=dentist_profile)
        if patient_profile:
            return queryset.filter(dentist_patient_link__patient=patient_profile)
        return queryset.none()


class CTScanListCreateView(generics.ListCreateAPIView):
    serializer_class = CTScanSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        dentist_profile, patient_profile = _get_role_profiles(self.request.user)
        queryset = CTScan.objects.filter(deleted_at__isnull=True)

        if dentist_profile:
            return queryset.filter(dentist_patient_link__dentist=dentist_profile)
        if patient_profile:
            return queryset.filter(dentist_patient_link__patient=patient_profile)
        return queryset.none()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        link = serializer.validated_data['dentist_patient_link']
        dentist_profile, patient_profile = _get_role_profiles(request.user)
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
            'job': AIProcessingJobSerializer(job).data,
        }
        return Response(payload, status=status.HTTP_201_CREATED)


class AIProcessingJobListView(generics.ListAPIView):
    serializer_class = AIProcessingJobSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dentist_profile, patient_profile = _get_role_profiles(self.request.user)
        queryset = AIProcessingJob.objects.select_related('ct_scan', 'ct_scan__dentist_patient_link')

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
        dentist_profile, patient_profile = _get_role_profiles(self.request.user)
        queryset = AIProcessingJob.objects.select_related('ct_scan', 'ct_scan__dentist_patient_link')
        if dentist_profile:
            return queryset.filter(ct_scan__dentist_patient_link__dentist=dentist_profile)
        if patient_profile:
            return queryset.filter(ct_scan__dentist_patient_link__patient=patient_profile)
        return queryset.none()


class AIProcessingJobGenerateDraftView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, job_id):
        job = generics.get_object_or_404(
            AIProcessingJob.objects.select_related('ct_scan', 'ct_scan__dentist_patient_link'),
            job_id=job_id,
        )
        dentist_profile, patient_profile = _get_role_profiles(request.user)
        link = job.ct_scan.dentist_patient_link
        if dentist_profile and link.dentist_id != dentist_profile.pk:
            raise PermissionDenied('You cannot request a draft for this job.')
        if patient_profile and link.patient_id != patient_profile.pk:
            raise PermissionDenied('You cannot request a draft for this job.')
        if not dentist_profile and not patient_profile:
            raise PermissionDenied('Unauthorized.')

        job.status = 'report_requested'
        job.save(update_fields=['status', 'updated_at'])

        job.draft_report = (
            'Draft report generated in fallback mode. Segmentation service is not connected yet. '
            'Dentist review is required before finalization.'
        )
        job.status = 'draft_ready'
        job.save(update_fields=['draft_report', 'status', 'updated_at'])

        return Response(AIProcessingJobSerializer(job).data, status=status.HTTP_200_OK)


class AIProcessingJobReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, job_id):
        serializer = JobReviewDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        dentist_profile = Dentist.objects.filter(dentist=request.user, deleted_at__isnull=True).first()
        if not dentist_profile:
            raise PermissionDenied('Only dentists can review or finalize reports.')

        job = generics.get_object_or_404(
            AIProcessingJob.objects.select_related('ct_scan', 'ct_scan__dentist_patient_link'),
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

        return Response(AIProcessingJobSerializer(job).data, status=status.HTTP_200_OK)

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