from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Dentist, Patient

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['user_id', 'username', 'email', 'full_name', 'password']
        extra_kwargs = {'password': {'write_only': True}}

class DentistRegistrationSerializer(serializers.ModelSerializer):
    user = UserSerializer(required=True)
    
    class Meta:
        model = Dentist
        fields = ['user', 'location', 'contact_number']

    @transaction.atomic
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        # Create the user instance
        user = User.objects.create_user(**user_data)
        # Create the dentist instance linking to the user
        dentist = Dentist.objects.create(dentist_id=user, **validated_data)
        return dentist

class PatientRegistrationSerializer(serializers.ModelSerializer):
    user = UserSerializer(required=True)
    
    class Meta:
        model = Patient
        fields = ['user', 'date_of_birth', 'contact_number', 'address']

    @transaction.atomic
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        # Create the user instance
        user = User.objects.create_user(**user_data)
        # Create the patient instance linking to the user
        patient = Patient.objects.create(patient_id=user, **validated_data)
        return patient
