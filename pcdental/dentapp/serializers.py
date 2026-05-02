from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from .models import AIProcessingJob, Appointment, Conversation, CTScan, Dentist, DentistPatientLink, Message, Patient, User


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
    class Meta:
        model = DentistPatientLink
        fields = ["id", "dentist", "patient", "connection_code", "is_active", "connected_at", "deactivated_at"]
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

    class Meta:
        model = Appointment
        fields = ["id", "dentist_patient_link", "patient", "dentist", "appointment_date", "status", "appointment_type", "duration", "notes", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at", "patient", "dentist"]

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