from rest_framework import serializers
from .models import Appointment, CTScan, Dentist, DentistPatientLink, Patient, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["user_id", "username", "email", "full_name"]
        read_only_fields = ["user_id"]


class PatientSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Patient
        fields = ["user", "date_of_birth", "contact_number", "address"]


class DentistSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

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


class CTScanSerializer(serializers.ModelSerializer):
    patient = PatientSerializer(read_only=True)
    dentist = DentistSerializer(read_only=True)

    class Meta:
        model = CTScan
        fields = ["id", "dentist_patient_link", "patient", "dentist", "uploaded_by_user", "uploaded_at", "file", "description"]
        read_only_fields = ["uploaded_at", "patient", "dentist"]