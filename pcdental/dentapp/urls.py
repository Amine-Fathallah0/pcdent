from django.urls import path, include
from django.apps import apps
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = 'dentapp'

urlpatterns = [
    path('', views.api_root, name='api-root'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('me/', views.UserDetailView.as_view(), name='me'),
    path('dentists/register/', views.DentistRegistrationView.as_view(), name='register-dentist'),
    path('patients/register/', views.PatientRegistrationView.as_view(), name='register-patient'),
    path('links/', views.DentistPatientLinkListView.as_view(), name='links'),
    path('links/active/', views.ActivePatientListView.as_view(), name='links-active'),
    path('links/pending/', views.PendingLinkListView.as_view(), name='links-pending'),
    path('links/request/', views.DentistPatientLinkRequestView.as_view(), name='link-request'),
    path('links/<int:pk>/approve/', views.LinkApproveView.as_view(), name='link-approve'),
    path('links/<int:pk>/reject/', views.LinkRejectView.as_view(), name='link-reject'),
    path('appointments/', views.AppointmentListCreateView.as_view(), name='appointments'),
    path('appointments/type-suggestions/', views.AppointmentTypeSuggestionsView.as_view(), name='appointment-type-suggestions'),
    path('appointments/<int:pk>/', views.AppointmentDetailView.as_view(), name='appointment-detail'),
    path('ct-scans/', views.CTScanListCreateView.as_view(), name='ct-scans'),
    path('ct-scans/<int:pk>/file/', views.CTScanFileView.as_view(), name='ct-scan-file'),
    path('jobs/', views.AIProcessingJobListView.as_view(), name='job-list'),
    path('jobs/<uuid:job_id>/', views.AIProcessingJobDetailView.as_view(), name='job-detail'),
    path('jobs/<uuid:job_id>/generate-draft/', views.AIProcessingJobGenerateDraftView.as_view(), name='job-generate-draft'),
    path('jobs/<uuid:job_id>/annotated/', views.AIProcessingJobAnnotatedImageView.as_view(), name='job-annotated'),
    path('jobs/<uuid:job_id>/mask/', views.AIProcessingJobMaskImageView.as_view(), name='job-mask'),
    path('jobs/<uuid:job_id>/review/', views.AIProcessingJobReviewView.as_view(), name='job-review'),
    path('conversations/', views.ConversationListView.as_view(), name='conversations'),
    path('conversations/<int:pk>/messages/', views.ConversationMessagesView.as_view(), name='conversation-messages'),
    path('conversations/<int:pk>/read/', views.ConversationReadView.as_view(), name='conversation-read'),
    # DentalReport endpoints
    path('dental-reports/', views.DentalReportListView.as_view(), name='dental-report-list'),
    path('dental-reports/<int:pk>/', views.DentalReportDetailView.as_view(), name='dental-report-detail'),
    path('dental-reports/<int:pk>/edit/', views.DentalReportUpdateView.as_view(), name='dental-report-edit'),
    path('dental-reports/<int:pk>/confirm/', views.DentalReportConfirmView.as_view(), name='dental-report-confirm'),
    path('dental-reports/<int:pk>/delete/', views.DentalReportDeleteView.as_view(), name='dental-report-delete'),
    # AnnotatedScan endpoints
    path('annotated-scans/', views.AnnotatedScanListView.as_view(), name='annotated-scan-list'),
    path('annotated-scans/<int:pk>/image/', views.AnnotatedScanImageView.as_view(), name='annotated-scan-image'),
]

if apps.is_installed('mcp_server'):
    urlpatterns.append(path('', include('mcp_server.urls')))
