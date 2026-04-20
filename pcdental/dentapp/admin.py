from django.contrib import admin
from .models import AIProcessingJob, Appointment, CTScan, Dentist, DentistPatientLink, Patient, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'full_name', 'is_staff', 'is_active']
    search_fields = ['username', 'email', 'full_name']


@admin.register(Dentist)
class DentistAdmin(admin.ModelAdmin):
    list_display = ['get_full_name', 'location', 'contact_number', 'deleted_at']
    list_select_related = ['dentist']

    def get_full_name(self, obj):
        return obj.dentist.full_name
    get_full_name.short_description = 'Full Name'


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['get_full_name', 'date_of_birth', 'contact_number', 'deleted_at']
    list_select_related = ['patient']

    def get_full_name(self, obj):
        return obj.patient.full_name
    get_full_name.short_description = 'Full Name'


@admin.register(DentistPatientLink)
class DentistPatientLinkAdmin(admin.ModelAdmin):
    list_display = ['dentist', 'patient', 'connection_code', 'is_active', 'connected_at']
    list_select_related = ['dentist__dentist', 'patient__patient']
    list_filter = ['is_active']


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ['dentist_patient_link', 'appointment_date', 'status', 'deleted_at']
    list_select_related = ['dentist_patient_link__dentist__dentist', 'dentist_patient_link__patient__patient']
    list_filter = ['status']


@admin.register(CTScan)
class CTScanAdmin(admin.ModelAdmin):
    list_display = ['dentist_patient_link', 'uploaded_at', 'uploaded_by_user', 'deleted_at']
    list_select_related = ['dentist_patient_link', 'uploaded_by_user']


@admin.register(AIProcessingJob)
class AIProcessingJobAdmin(admin.ModelAdmin):
    list_display = ['job_id', 'ct_scan', 'status', 'is_fallback_mode', 'created_at', 'completed_at']
    list_select_related = ['ct_scan']
    list_filter = ['status', 'is_fallback_mode']
