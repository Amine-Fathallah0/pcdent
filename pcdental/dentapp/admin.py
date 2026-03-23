from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Dentist, Patient

# Register your models here.
admin.site.register(User, UserAdmin)
admin.site.register(Dentist)
admin.site.register(Patient)
