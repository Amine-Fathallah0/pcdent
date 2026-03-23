from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Dentist

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

    def create(self, validated_data):
        user_data = validated_data.pop('user')
        # Create the user instance
        user = User.objects.create_user(**user_data)
        # Create the dentist instance linking to the user
        dentist = Dentist.objects.create(dentist_id=user, **validated_data)
        return dentist
