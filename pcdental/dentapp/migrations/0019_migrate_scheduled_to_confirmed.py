from django.db import migrations


def forward(apps, schema_editor):
    Appointment = apps.get_model('dentapp', 'Appointment')
    Appointment.objects.filter(status='scheduled').update(status='confirmed')


def reverse(apps, schema_editor):
    Appointment = apps.get_model('dentapp', 'Appointment')
    Appointment.objects.filter(status='confirmed').update(status='scheduled')


class Migration(migrations.Migration):
    dependencies = [
        ('dentapp', '0018_appointment_cancellation_reason_and_more'),
    ]

    operations = [
        migrations.RunPython(forward, reverse),
    ]
