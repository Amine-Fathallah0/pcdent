from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from .models import AIProcessingJob, Appointment, CTScan, Dentist, DentistPatientLink, Patient, User


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


class AppointmentSerializer(serializers.ModelSerializer):
    patient = PatientSerializer(read_only=True)
    dentist = DentistSerializer(read_only=True)

    class Meta:
        model = Appointment
        fields = ["id", "dentist_patient_link", "patient", "dentist", "appointment_date", "status", "notes", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at", "patient", "dentist"]

    def validate_appointment_date(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("Appointment date cannot be in the past.")
        return value


class CTScanSerializer(serializers.ModelSerializer):
    patient = PatientSerializer(read_only=True)
    dentist = DentistSerializer(read_only=True)

    class Meta:
        model = CTScan
        fields = ["id", "dentist_patient_link", "patient", "dentist", "uploaded_by_user", "uploaded_at", "file", "description"]
        read_only_fields = ["uploaded_at", "patient", "dentist", "uploaded_by_user"]


class AIProcessingJobSerializer(serializers.ModelSerializer):
    ct_scan_id = serializers.IntegerField(source='ct_scan.id', read_only=True)

    class Meta:
        model = AIProcessingJob
        fields = [
            "job_id",
            "ct_scan_id",
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