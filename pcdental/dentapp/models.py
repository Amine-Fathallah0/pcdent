from django.db import models
import uuid
import secrets
import string
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.db.models import Q, F
from django.core.validators import FileExtensionValidator
from django.conf import settings

# Create your models here.
class User(AbstractUser):
    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=255)
    
    # Django's AbstractUser already provides: username, email, password, first_name, last_name, etc.
    # Password hashing is handled automatically by Django
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'full_name']
    
    def __str__(self):
        return f"{self.full_name} (@{self.username})"

class Patient(models.Model):
    patient = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)   
    date_of_birth = models.DateField()
    contact_number = models.CharField(max_length=15)
    address = models.TextField()
    
    # Soft delete support
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Patient: {self.patient.full_name}"
    
    def get_age(self):
        """Calculate patient's current age"""
        from datetime import date
        today = date.today()
        return today.year - self.date_of_birth.year - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
    # In Patient model
    @property
    def reliability_flag(self):
        from django.utils import timezone
        recent_cutoff = timezone.now() - timezone.timedelta(days=90)
        bad_appointments = Appointment.objects.filter(
            dentist_patient_link__patient=self,
            status__in=['cancelled', 'no_show'],
            appointment_date__gte=recent_cutoff
        ).count()
        return bad_appointments >= 3  # flag if 3+ in last 90 days

class Dentist(models.Model):
    dentist = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    location = models.CharField(max_length=100)
    contact_number = models.CharField(max_length=15)
    patients = models.ManyToManyField(Patient, through='DentistPatientLink', related_name='dentists')
    
    # Soft delete support
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Dr. {self.dentist.full_name} - {self.location}"

class DentistPatientLink(models.Model):
    dentist = models.ForeignKey(Dentist, on_delete=models.CASCADE)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    connection_code = models.CharField(max_length=10, unique=True, blank=True)  # The code sent by dentist
    is_active = models.BooleanField(default=True)  # Can be deactivated if connection ends
    connected_at = models.DateTimeField(auto_now_add=True)
    deactivated_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('dentist', 'patient')  # Prevent duplicate connections
        indexes = [
            models.Index(fields=['connection_code']),
            models.Index(fields=['dentist', 'is_active']),
        ]
    
    def save(self, *args, **kwargs):
        """Auto-generate unique connection code if not provided"""
        if not self.connection_code:
            self.connection_code = self.generate_connection_code()
        super().save(*args, **kwargs)
    
    @staticmethod
    def generate_connection_code(length=8):
        """Generate a unique random connection code"""
        while True:
            code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(length))
            if not DentistPatientLink.objects.filter(connection_code=code).exists():
                return code
    
    def __str__(self):
        status = "Active" if self.is_active else "Inactive"
        return f"{self.dentist.dentist.full_name} ↔ {self.patient.patient.full_name} ({status})"

class Appointment(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    ]
    
    dentist_patient_link = models.ForeignKey(DentistPatientLink, on_delete=models.PROTECT)
    appointment_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    @property
    def patient(self):
        return self.dentist_patient_link.patient

    @property
    def dentist(self):
        return self.dentist_patient_link.dentist

    class Meta:
        ordering = ['appointment_date']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(appointment_date__gte=models.F('created_at')),
                name='appointment_date_not_in_past'
            )
        ]
        indexes = [
            models.Index(fields=['dentist_patient_link', 'appointment_date']),
            models.Index(fields=['status', 'appointment_date']),
        ]

    def __str__(self):
        return f"{self.patient.patient.full_name} with Dr. {self.dentist.dentist.full_name} on {self.appointment_date.strftime('%Y-%m-%d %H:%M')}"
class CTScan(models.Model):
    dentist_patient_link = models.ForeignKey(DentistPatientLink, on_delete=models.PROTECT)
    uploaded_by_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file = models.FileField(
        upload_to='ct_scans/%Y/%m/%d/',
        validators=[FileExtensionValidator(allowed_extensions=['dcm', 'nii', 'nrrd'])]
    )
    description = models.TextField(blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    @property
    def patient(self):
        return self.dentist_patient_link.patient

    @property
    def dentist(self):
        return self.dentist_patient_link.dentist


class AIProcessingJob(models.Model):
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('segmentation_pending', 'Segmentation Pending'),
        ('report_requested', 'Report Requested'),
        ('draft_ready', 'Draft Ready'),
        ('dentist_reviewed', 'Dentist Reviewed'),
        ('finalized', 'Finalized'),
        ('failed', 'Failed'),
    ]

    job_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ct_scan = models.ForeignKey(CTScan, on_delete=models.CASCADE, related_name='processing_jobs')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='queued')
    is_fallback_mode = models.BooleanField(default=True)
    annotated_image_url = models.URLField(blank=True)
    draft_report = models.TextField(blank=True)
    dentist_notes = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['ct_scan', '-created_at']),
        ]

    def __str__(self):
        return f"Job {self.job_id} - {self.status}"

# class AIProcessingJob(models.Model):
#     """Tracks AI processing workflow for CT scans"""
#     STATUS_CHOICES = [
#         ('pending', 'Pending'),
#         ('processing', 'Processing'),
#         ('completed', 'Completed'),
#         ('failed', 'Failed'),
#         ('cancelled', 'Cancelled'),
#     ]
    
#     ct_scan = models.ForeignKey(CTScan, on_delete=models.CASCADE, related_name='processing_jobs')
#     status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
#     created_at = models.DateTimeField(auto_now_add=True)
#     started_at = models.DateTimeField(null=True, blank=True)
#     completed_at = models.DateTimeField(null=True, blank=True)
#     error_message = models.TextField(blank=True)
#     retry_count = models.PositiveSmallIntegerField(default=0)
    
#     # Optional: track which FastAPI service instance processed it
#     service_endpoint = models.URLField(blank=True)
    
#     class Meta:
#         ordering = ['-created_at']
#         indexes = [
#             models.Index(fields=['status', '-created_at']),
#             models.Index(fields=['ct_scan', '-created_at']),
#         ]
    
#     def __str__(self):
#         return f"AI Job #{self.id} for CT Scan #{self.ct_scan.id} - {self.get_status_display()}"
    
#     def get_processing_duration(self):
#         """Calculate processing time if completed"""
#         if self.started_at and self.completed_at:
#             return (self.completed_at - self.started_at).total_seconds()
#         return None

# class Odontogram(models.Model):
#     """AI-generated odontogram from CT scan"""
#     ct_scan = models.OneToOneField(CTScan, on_delete=models.CASCADE, related_name='odontogram')
#     patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='odontograms')
#     ai_processing_job = models.ForeignKey(AIProcessingJob, on_delete=models.SET_NULL, null=True, blank=True)
#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)
    
#     # Store AI results as JSON
#     odontogram_data = models.JSONField()  # Tooth-by-tooth analysis from AI
#     ai_confidence_score = models.FloatField(null=True, blank=True)  # Overall AI confidence (0-1)
    
#     # Optional: dentist can review and approve
#     reviewed_by_dentist = models.ForeignKey(Dentist, on_delete=models.SET_NULL, null=True, blank=True)
#     reviewed_at = models.DateTimeField(null=True, blank=True)
#     dentist_notes = models.TextField(blank=True)
#     is_approved = models.BooleanField(default=False)
    
#     class Meta:
#         ordering = ['-created_at']
#         indexes = [
#             models.Index(fields=['patient', '-created_at']),
#             models.Index(fields=['is_approved', '-created_at']),
#         ]
    
#     def __str__(self):
#         approval_status = "✓ Approved" if self.is_approved else "⊗ Pending Review"
#         return f"Odontogram for {self.patient.patient_id.full_name} - {self.created_at.strftime('%Y-%m-%d')} ({approval_status})"