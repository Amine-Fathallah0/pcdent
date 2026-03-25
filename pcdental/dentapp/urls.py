from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
app_name = 'dentapp'

# API endpoints will be defined here
# Front-end is now a separate React service
urlpatterns = [
    # TODO: Add REST API endpoints
    path('api/token/', TokenObtainPairView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),

]
