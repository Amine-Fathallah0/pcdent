from django.urls import path
from .views import CustomAuthToken, DentistRegistrationView, UserDetailView, api_root

app_name = 'dentapp'

urlpatterns = [
    path('', api_root, name='api_root'),
    path('login/', CustomAuthToken.as_view(), name='api_login'),
    path('dentists/register/', DentistRegistrationView.as_view(), name='api_dentist_register'),
    path('me/', UserDetailView.as_view(), name='api_me'),
]
