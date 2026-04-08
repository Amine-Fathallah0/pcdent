from django.urls import path, include
from django.apps import apps
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
app_name = 'dentapp'

# API endpoints will be defined here
# Front-end is now a separate React service
urlpatterns = [
    path('', views.api_root, name='api-root'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('me/', views.UserDetailView.as_view(), name='me'),
    path('dentists/register/', views.DentistRegistrationView.as_view(), name='register-dentist'),
    path('patients/register/', views.PatientRegistrationView.as_view(), name='register-patient'),
    path('links/', views.DentistPatientLinkListView.as_view(), name='links'),
    path('appointments/', views.AppointmentListCreateView.as_view(), name='appointments'),
    path('appointments/<int:pk>/', views.AppointmentDetailView.as_view(), name='appointment-detail'),
    path('ct-scans/', views.CTScanListCreateView.as_view(), name='ct-scans'),
    path('jobs/', views.AIProcessingJobListView.as_view(), name='job-list'),
    path('jobs/<uuid:job_id>/', views.AIProcessingJobDetailView.as_view(), name='job-detail'),
    path('jobs/<uuid:job_id>/generate-draft/', views.AIProcessingJobGenerateDraftView.as_view(), name='job-generate-draft'),
    path('jobs/<uuid:job_id>/review/', views.AIProcessingJobReviewView.as_view(), name='job-review'),
    path('api/token/', TokenObtainPairView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),
]

if apps.is_installed('mcp_server'):
    urlpatterns.append(path('', include('mcp_server.urls')))
