from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
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
    User,
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["user_id", "username", "email", "full_name"]
        read_only_fields = ["user_id"]


class PatientSerializer(serializers.ModelSerializer):
    user = UserSerializer(source="patient", read_only=True)

    class Meta:
        model = Patient
        fields = ["user", "date_of_birth", "contact_number", "address"]


class DentistSerializer(serializers.ModelSerializer):
    user = UserSerializer(source="dentist", read_only=True)

    class Meta:
        model = Dentist
        fields = ["user", "location", "contact_number"]


class DentistPatientLinkSerializer(serializers.ModelSerializer):
    dentist_name = serializers.CharField(source='dentist.dentist.full_name', read_only=True)
    patient_name = serializers.CharField(source='patient.patient.full_name', read_only=True)

    class Meta:
        model = DentistPatientLink
        fields = [
            "id",
            "dentist",
            "patient",
            "dentist_name",
            "patient_name",
            "connection_code",
            "is_active",
            "connected_at",
            "deactivated_at",
        ]
        read_only_fields = ["connection_code", "connected_at"]


class PendingLinkSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.patient.full_name', read_only=True)
    patient_email = serializers.EmailField(source='patient.patient.email', read_only=True)

    class Meta:
        model = DentistPatientLink
        fields = ["id", "patient_name", "patient_email", "connected_at"]
        read_only_fields = fields


class ActivePatientSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.patient.full_name', read_only=True)
    patient_email = serializers.EmailField(source='patient.patient.email', read_only=True)
    patient_phone = serializers.CharField(source='patient.contact_number', read_only=True)
    patient_user_id = serializers.UUIDField(source='patient.patient.user_id', read_only=True)

    class Meta:
        model = DentistPatientLink
        fields = ["id", "patient_name", "patient_email", "patient_phone", "patient_user_id", "connected_at"]
        read_only_fields = fields


class AppointmentSerializer(serializers.ModelSerializer):
    patient = PatientSerializer(read_only=True)
    dentist = DentistSerializer(read_only=True)
    last_proposed_by = serializers.SerializerMethodField()
    cancelled_by = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            "id",
            "dentist_patient_link",
            "patient",
            "dentist",
            "appointment_date",
            "status",
            "appointment_type",
            "duration",
            "notes",
            "proposal_note",
            "counter_proposal_count",
            "last_proposed_by",
            "cancelled_by",
            "cancellation_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "patient",
            "dentist",
            "status",
            "counter_proposal_count",
            "last_proposed_by",
            "cancelled_by",
            "cancellation_reason",
        ]

    def get_last_proposed_by(self, obj):
        if not obj.last_proposed_by:
            return None
        return {
            "user_id": str(obj.last_proposed_by.user_id),
            "full_name": obj.last_proposed_by.full_name,
        }

    def get_cancelled_by(self, obj):
        if not obj.cancelled_by:
            return None
        return {
            "user_id": str(obj.cancelled_by.user_id),
            "full_name": obj.cancelled_by.full_name,
        }

    def validate_appointment_date(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("Appointment date cannot be in the past.")
        return value


class CTScanSerializer(serializers.ModelSerializer):
    patient = PatientSerializer(read_only=True)
    dentist = DentistSerializer(read_only=True)
    # Accept the binary on upload but never echo back the raw /media/ URL.
    file = serializers.FileField(write_only=True)
    file_url = serializers.SerializerMethodField()

    def get_file_url(self, obj):
        if not obj.pk or not obj.file:
            return None
        path = f'/ct-scans/{obj.pk}/file/'
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(path)
        return path

    class Meta:
        model = CTScan
        fields = ["id", "dentist_patient_link", "patient", "dentist", "uploaded_by_user", "uploaded_at", "file", "file_url", "description"]
        read_only_fields = ["uploaded_at", "patient", "dentist", "uploaded_by_user", "file_url"]


class AIProcessingJobSerializer(serializers.ModelSerializer):
    ct_scan_id = serializers.IntegerField(source='ct_scan.id', read_only=True)
    patient_name = serializers.SerializerMethodField()
    dentist_name = serializers.SerializerMethodField()
    scan_file_url = serializers.SerializerMethodField()
    annotated_image_url = serializers.SerializerMethodField()
    mask_image_url = serializers.SerializerMethodField()

    def get_patient_name(self, obj):
        try:
            return obj.ct_scan.dentist_patient_link.patient.patient.full_name
        except Exception:
            return ''

    def get_dentist_name(self, obj):
        try:
            return obj.ct_scan.dentist_patient_link.dentist.dentist.full_name
        except Exception:
            return ''

    def get_scan_file_url(self, obj):
        # Point at the authenticated streaming endpoint, never the raw
        # /media/ URL — scans are private medical data.
        try:
            scan = obj.ct_scan
            if not scan or not scan.pk or not scan.file:
                return None
            path = f'/ct-scans/{scan.pk}/file/'
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(path)
            return path
        except Exception:
            return None

    def get_annotated_image_url(self, obj):
        if getattr(obj, 'annotated_image', None):
            path = f'/jobs/{obj.job_id}/annotated/'
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(path)
            return path
        return obj.annotated_image_url or None

    def get_mask_image_url(self, obj):
        if getattr(obj, 'mask_image', None):
            path = f'/jobs/{obj.job_id}/mask/'
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(path)
            return path
        return None

    class Meta:
        model = AIProcessingJob
        fields = [
            "job_id",
            "ct_scan_id",
            "patient_name",
            "dentist_name",
            "scan_file_url",
            "status",
            "is_fallback_mode",
            "annotated_image_url",
            "mask_image_url",
            "mask_label_map",
            "draft_report",
            "dentist_notes",
            "error_message",
            "created_at",
            "updated_at",
            "completed_at",
        ]
        read_only_fields = [
            "job_id",
            "ct_scan_id",
            "patient_name",
            "dentist_name",
            "scan_file_url",
            "status",
            "is_fallback_mode",
            "annotated_image_url",
            "mask_image_url",
            "mask_label_map",
            "draft_report",
            "dentist_notes",
            "error_message",
            "created_at",
            "updated_at",
            "completed_at",
        ]


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.SerializerMethodField()
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender_id', 'sender_name', 'content', 'is_system', 'is_read', 'created_at']
        read_only_fields = fields

    def get_sender_id(self, obj):
        return str(obj.sender.user_id) if obj.sender else None

    def get_sender_name(self, obj):
        if obj.is_system:
            return 'System'
        return obj.sender.full_name if obj.sender else 'Unknown'


class ConversationSerializer(serializers.ModelSerializer):
    other_user_id = serializers.SerializerMethodField()
    other_user_name = serializers.SerializerMethodField()
    other_user_role = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id',
            'dentist_patient_link',
            'other_user_id',
            'other_user_name',
            'other_user_role',
            'last_message',
            'last_message_at',
            'unread_count',
            'created_at',
        ]
        read_only_fields = fields

    def _viewer(self):
        request = self.context.get('request')
        return request.user if request else None

    def get_other_user_id(self, obj):
        viewer = self._viewer()
        if viewer is None:
            return None
        dentist_user = obj.dentist_patient_link.dentist.dentist
        patient_user = obj.dentist_patient_link.patient.patient
        other = patient_user if viewer.pk == dentist_user.pk else dentist_user
        return str(other.user_id)

    def get_other_user_name(self, obj):
        viewer = self._viewer()
        if viewer is None:
            return ''
        dentist_user = obj.dentist_patient_link.dentist.dentist
        patient_user = obj.dentist_patient_link.patient.patient
        other = patient_user if viewer.pk == dentist_user.pk else dentist_user
        return other.full_name

    def get_other_user_role(self, obj):
        viewer = self._viewer()
        if viewer is None:
            return ''
        dentist_user = obj.dentist_patient_link.dentist.dentist
        return 'patient' if viewer.pk == dentist_user.pk else 'dentist'

    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        return last.content if last else ''

    def get_unread_count(self, obj):
        viewer = self._viewer()
        if viewer is None:
            return 0
        return obj.messages.filter(is_read=False).exclude(sender=viewer).count()


class JobReviewDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["reviewed", "finalized"])
    dentist_notes = serializers.CharField(required=False, allow_blank=True)


class BaseRegistrationSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=255)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists.")
        return value


class DentistRegistrationSerializer(BaseRegistrationSerializer):
    location = serializers.CharField(max_length=100)
    contact_number = serializers.CharField(max_length=15)

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")
        location = validated_data.pop("location")
        contact_number = validated_data.pop("contact_number")
        user = User.objects.create_user(password=password, **validated_data)
        return Dentist.objects.create(
            dentist=user,
            location=location,
            contact_number=contact_number,
        )


class PatientRegistrationSerializer(BaseRegistrationSerializer):
    date_of_birth = serializers.DateField()
    contact_number = serializers.CharField(max_length=15)
    address = serializers.CharField()

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")
        date_of_birth = validated_data.pop("date_of_birth")
        contact_number = validated_data.pop("contact_number")
        address = validated_data.pop("address")

        user = User.objects.create_user(password=password, **validated_data)
        return Patient.objects.create(
            patient=user,
            date_of_birth=date_of_birth,
            contact_number=contact_number,
            address=address,
        )


# ─── DentalReport ────────────────────────────────────────────────────────────

class _ReportPatientSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='patient.full_name', read_only=True)
    dob = serializers.DateField(source='date_of_birth', read_only=True)

    class Meta:
        model = Patient
        fields = ['name', 'dob']


class _ReportDentistSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='dentist.full_name', read_only=True)

    class Meta:
        model = Dentist
        fields = ['name']


class _ReportEditorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['user_id', 'full_name']


class DentalReportSerializer(serializers.ModelSerializer):
    ct_scan = serializers.IntegerField(source='ct_scan_id', read_only=True)
    patient = _ReportPatientSerializer(read_only=True)
    dentist = _ReportDentistSerializer(read_only=True)
    edited_by = _ReportEditorSerializer(read_only=True)

    class Meta:
        model = DentalReport
        fields = [
            'id', 'ct_scan', 'patient', 'dentist',
            'report_text', 'status', 'raw_detections',
            'edited_by', 'edit_count', 'error_message',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'ct_scan', 'patient', 'dentist',
            'status', 'raw_detections',
            'edited_by', 'edit_count', 'error_message',
            'created_at', 'updated_at',
        ]


# ─── AnnotatedScan ───────────────────────────────────────────────────────────

class AnnotatedScanSerializer(serializers.ModelSerializer):
    ct_scan = serializers.IntegerField(source='ct_scan_id', read_only=True)
    image_url = serializers.SerializerMethodField()

    def get_image_url(self, obj):
        request = self.context.get('request')
        path = f'/annotated-scans/{obj.pk}/image/'
        return request.build_absolute_uri(path) if request else path

    class Meta:
        model = AnnotatedScan
        fields = ['id', 'ct_scan', 'image_url', 'image_format', 'created_at']
        read_only_fields = fields


# ─── Scheduling: weekly schedule + date overrides ────────────────────────────

class DentistScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DentistSchedule
        fields = ['id', 'weekday', 'start_time', 'end_time']

    def validate(self, attrs):
        if attrs['start_time'] >= attrs['end_time']:
            raise serializers.ValidationError('start_time must be before end_time.')
        return attrs


class DentistAvailabilityOverrideSerializer(serializers.ModelSerializer):
    class Meta:
        model = DentistAvailabilityOverride
        fields = ['id', 'date', 'start_time', 'end_time', 'is_blocked', 'reason']

    def validate(self, attrs):
        is_blocked = attrs.get('is_blocked', False)
        start_time = attrs.get('start_time')
        end_time = attrs.get('end_time')
        if not is_blocked:
            if start_time is None or end_time is None:
                raise serializers.ValidationError(
                    'start_time and end_time are required when is_blocked is False.'
                )
            if start_time >= end_time:
                raise serializers.ValidationError('start_time must be before end_time.')
        return attrs


# ─── Notifications ───────────────────────────────────────────────────────────

class NotificationSerializer(serializers.ModelSerializer):
    appointment_summary = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'related_appointment',
            'appointment_summary',
            'is_read',
            'created_at',
            'read_at',
        ]
        read_only_fields = fields

    def get_appointment_summary(self, obj):
        appt = obj.related_appointment
        if not appt:
            return None
        cancelled_by_role = None
        cancelled_by_name = None
        if appt.cancelled_by:
            if appt.cancelled_by_id == appt.dentist.dentist.user_id:
                cancelled_by_role = 'dentist'
            elif appt.cancelled_by_id == appt.patient.patient.user_id:
                cancelled_by_role = 'patient'
            cancelled_by_name = appt.cancelled_by.full_name
        return {
            'id': appt.id,
            'appointment_date': appt.appointment_date.isoformat(),
            'duration': appt.duration,
            'appointment_type': appt.appointment_type,
            'status': appt.status,
            'dentist_name': appt.dentist.dentist.full_name,
            'patient_name': appt.patient.patient.full_name,
            'cancelled_by_role': cancelled_by_role,
            'cancelled_by_name': cancelled_by_name,
        }