from django.db import models
import uuid
# Create your models here.
class User(models.Model):
    userID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    Username = models.CharField(max_length=150, unique=True)
    Email = models.EmailField(unique=True)
    Password = models.CharField(max_length=128)
    Full_Name = models.CharField(max_length=30)

class Patient(models.Model):
    patientID = models.ForeignKey(User, on_delete=models.CASCADE)
    Date_of_Birth = models.DateField()
    Contact_Number = models.CharField(max_length=15)
    Address = models.TextField()

class Dentist(models.Model):
    dentistID = models.ForeignKey(User, on_delete=models.CASCADE)
    location = models.CharField(max_length=100)
    Contact_Number = models.CharField(max_length=15)
    patients = models.ManyToManyField(Patient, through='Appointment')

class Appointment(models.Model):
    dentist = models.ForeignKey(Dentist, on_delete=models.CASCADE)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    appointment_date = models.DateTimeField()
    status = models.CharField(max_length=20)  # e.g., 'scheduled', 'completed', 'cancelled'
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)