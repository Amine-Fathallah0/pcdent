from django.db import models
import uuid
import secrets
import string
from django.contrib.auth.models import AbstractUser
from django.core.validators import FileExtensionValidator
from django.db import IntegrityError
from django.utils import timezone

# Create your models here.
class User(AbstractUser):
    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    is_admin = models.BooleanField(default=False)

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
    dentist_code = models.CharField(max_length=7, unique=True, blank=True)
    is_verified = models.BooleanField(default=False)
    patients = models.ManyToManyField(Patient, through='DentistPatientLink', related_name='dentists')

    # Soft delete support
    deleted_at = models.DateTimeField(null=True, blank=True)

    _CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'  # no 0/O, 1/I/L

    def save(self, *args, **kwargs):
        if not self.dentist_code:
            for _ in range(10):
                suffix = ''.join(secrets.choice(self._CODE_ALPHABET) for _ in range(4))
                code = f'DR-{suffix}'
                if not Dentist.objects.filter(dentist_code=code).exists():
                    self.dentist_code = code
                    break
            else:
                raise RuntimeError('Failed to generate a unique dentist_code after 10 attempts.')
        super().save(*args, **kwargs)

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
            models.Index(fields=['dentist', 'is_active']),
        ]
    
    def save(self, *args, **kwargs):
        """Auto-generate unique connection code if not provided"""
        if not self.connection_code:
            for _ in range(5):
                self.connection_code = self.generate_connection_code()
                try:
                    super().save(*args, **kwargs)
                    return
                except IntegrityError:
                    self.connection_code = ''
            raise RuntimeError("Failed to generate a unique connection code after 5 attempts.")
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
        ('pending_dentist', 'Pending Dentist'),
        ('pending_patient', 'Pending Patient'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
        ('no_show', 'No Show'),
    ]

    NON_CANCELLED_BLOCKING = ('pending_dentist', 'pending_patient', 'confirmed')
    TERMINAL_STATUSES = ('cancelled', 'completed', 'no_show')
    MAX_COUNTER_PROPOSALS = 3

    dentist_patient_link = models.ForeignKey(DentistPatientLink, on_delete=models.PROTECT)
    appointment_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_dentist')
    appointment_type = models.TextField(blank=True)
    duration = models.IntegerField(default=30)
    notes = models.TextField(blank=True)
    proposal_note = models.TextField(blank=True)
    counter_proposal_count = models.IntegerField(default=0)
    last_proposed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='proposed_appointments'
    )
    cancelled_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='cancelled_appointments'
    )
    cancellation_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    @property
    def patient(self):
        return self.dentist_patient_link.patient

    @property
    def dentist(self):
        return self.dentist_patient_link.dentist

    @property
    def end_date(self):
        return self.appointment_date + timezone.timedelta(minutes=self.duration)

    class Meta:
        ordering = ['appointment_date']
        indexes = [
            models.Index(fields=['dentist_patient_link', 'appointment_date']),
            models.Index(fields=['status', 'appointment_date']),
        ]

    def __str__(self):
        return f"{self.patient.patient.full_name} with Dr. {self.dentist.dentist.full_name} on {self.appointment_date.strftime('%Y-%m-%d %H:%M')}"


class DentistSchedule(models.Model):
    """Recurring weekly working hours for a dentist."""
    WEEKDAY_CHOICES = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]

    dentist = models.ForeignKey(Dentist, on_delete=models.CASCADE, related_name='schedule_entries')
    weekday = models.IntegerField(choices=WEEKDAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        ordering = ['dentist', 'weekday', 'start_time']
        indexes = [
            models.Index(fields=['dentist', 'weekday']),
        ]

    def __str__(self):
        return f"{self.dentist} {self.get_weekday_display()} {self.start_time}-{self.end_time}"


class DentistAvailabilityOverride(models.Model):
    """One-off date overrides — block a day, or extend hours on a specific date."""
    dentist = models.ForeignKey(Dentist, on_delete=models.CASCADE, related_name='availability_overrides')
    date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    is_blocked = models.BooleanField(default=False)
    reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['dentist', 'date', 'start_time']
        indexes = [
            models.Index(fields=['dentist', 'date']),
        ]

    def __str__(self):
        kind = 'blocked' if self.is_blocked else 'open'
        return f"{self.dentist} {self.date} ({kind})"


class Notification(models.Model):
    """In-app notification for appointment events. Pushed via WebSocket."""
    TYPE_CHOICES = [
        ('appointment_requested', 'Appointment Requested'),
        ('appointment_counter_proposed', 'Appointment Counter-Proposed'),
        ('appointment_accepted', 'Appointment Accepted'),
        ('appointment_declined', 'Appointment Declined'),
        ('appointment_cancelled', 'Appointment Cancelled'),
        ('appointment_modified', 'Appointment Modified'),
    ]

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=40, choices=TYPE_CHOICES)
    related_appointment = models.ForeignKey(
        Appointment, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications'
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f"Notification[{self.notification_type}] → {self.recipient.full_name}"
class CTScan(models.Model):
    dentist_patient_link = models.ForeignKey(DentistPatientLink, on_delete=models.PROTECT)
    uploaded_by_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file = models.FileField(
        upload_to='ct_scans/%Y/%m/%d/',
        validators=[FileExtensionValidator(allowed_extensions=['dcm', 'nii', 'nrrd', 'jpg', 'jpeg', 'png'])]
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
    annotated_image = models.ImageField(upload_to='ai_outputs/%Y/%m/%d/', null=True, blank=True)
    mask_image = models.ImageField(upload_to='ai_outputs/%Y/%m/%d/', null=True, blank=True)
    mask_label_map = models.JSONField(null=True, blank=True)
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


class Conversation(models.Model):
    dentist_patient_link = models.OneToOneField(
        DentistPatientLink,
        on_delete=models.CASCADE,
        related_name='conversation',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-last_message_at', '-created_at']

    @property
    def dentist(self):
        return self.dentist_patient_link.dentist

    @property
    def patient(self):
        return self.dentist_patient_link.patient

    def __str__(self):
        return f"Conversation: {self.dentist_patient_link}"


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_messages',
    )
    content = models.TextField()
    is_system = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['conversation', 'is_read']),
        ]

    def __str__(self):
        sender_name = 'system' if self.is_system else (self.sender.full_name if self.sender else 'unknown')
        return f"{sender_name}: {self.content[:50]}"
class DentalReport(models.Model):
    STATUS_CHOICES = [
        ('auto_generated', 'Auto Generated'),
        ('pending_review', 'Pending Review'),
        ('edited', 'Edited'),
        ('confirmed', 'Confirmed'),
        ('deleted', 'Deleted'),
        ('error', 'Error'),
    ]

    ct_scan = models.ForeignKey(CTScan, on_delete=models.CASCADE, related_name='dental_reports')
    patient = models.ForeignKey(
        Patient, on_delete=models.SET_NULL, null=True, blank=True, related_name='dental_reports'
    )
    dentist = models.ForeignKey(
        Dentist, on_delete=models.SET_NULL, null=True, blank=True, related_name='dental_reports'
    )
    raw_detections = models.JSONField(default=list)
    report_text = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='auto_generated')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    edited_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='edited_reports'
    )
    edit_count = models.IntegerField(default=0)
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['ct_scan'],
                condition=models.Q(deleted_at__isnull=True),
                name='unique_active_report_per_scan',
            )
        ]
        indexes = [
            models.Index(fields=['ct_scan', '-created_at']),
            models.Index(fields=['status', '-created_at']),
        ]

    def __str__(self):
        return f"DentalReport {self.pk} [{self.status}] — scan {self.ct_scan_id}"


class AnnotatedScan(models.Model):
    ct_scan = models.ForeignKey(CTScan, on_delete=models.CASCADE, related_name='annotated_scans')
    image_overlay = models.ImageField(upload_to='annotated_scans/%Y/%m/%d/')
    image_format = models.CharField(max_length=10, default='png')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"AnnotatedScan {self.pk} — scan {self.ct_scan_id}"
