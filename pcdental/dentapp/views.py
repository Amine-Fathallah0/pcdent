from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .serializers import DentistRegistrationSerializer, PatientRegistrationSerializer, UserSerializer
from .models import Dentist, Patient

User = get_user_model()

class CustomAuthToken(ObtainAuthToken):
    """
    Custom login view that returns the token, user_id, email, and whether the user is a dentist.
    """
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        is_dentist = Dentist.objects.filter(dentist_id=user).exists()
        
        return Response({
            'token': token.key,
            'user_id': user.user_id,
            'email': user.email,
            'full_name': user.full_name,
            'is_dentist': is_dentist
        })

class DentistRegistrationView(generics.CreateAPIView):
    """
    API view to register a new dentist along with a new user account.
    """
    queryset = Dentist.objects.all()
    serializer_class = DentistRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dentist = serializer.save()
        user = dentist.dentist_id
        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user_id': str(user.user_id),
            'email': user.email,
            'full_name': user.full_name,
            'is_dentist': True
        }, status=status.HTTP_201_CREATED)

class PatientRegistrationView(generics.CreateAPIView):
    """
    API view to register a new patient along with a new user account.
    """
    queryset = Patient.objects.all()
    serializer_class = PatientRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        patient = serializer.save()
        user = patient.patient_id
        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user_id': str(user.user_id),
            'email': user.email,
            'full_name': user.full_name,
            'is_dentist': False
        }, status=status.HTTP_201_CREATED)

class UserDetailView(APIView):
    """
    API View to retrieve the current authenticated user's details.
    Used to verify login.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_root(request):
    return Response({
        "message": "Welcome to the Dentist API",
        "endpoints": {
            "login": "/login/",
            "register_dentist": "/dentists/register/",
            "me": "/me/"
        }
    })
