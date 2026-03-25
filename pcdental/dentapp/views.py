# Django REST API views will go here
# Front-end is now a separate React service

# TODO: Create API endpoints using Django REST Framework
from django.shortcuts import render
from rest_framework import viewsets,serializers
from .models import User, Patient, Dentist, DentistPatientLink, Appointment, CTScan
from rest_framework.routers import DefaultRouter
