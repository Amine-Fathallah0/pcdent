from datetime import time

from django.db import migrations


def forward(apps, schema_editor):
    Dentist = apps.get_model('dentapp', 'Dentist')
    DentistSchedule = apps.get_model('dentapp', 'DentistSchedule')

    defaults = [
        (0, time(9, 0), time(17, 0)),
        (1, time(9, 0), time(17, 0)),
        (2, time(9, 0), time(17, 0)),
        (3, time(9, 0), time(17, 0)),
        (4, time(9, 0), time(17, 0)),
    ]

    schedules = []
    for dentist in Dentist.objects.all():
        if DentistSchedule.objects.filter(dentist=dentist).exists():
            continue
        for weekday, start_time, end_time in defaults:
            schedules.append(
                DentistSchedule(
                    dentist=dentist,
                    weekday=weekday,
                    start_time=start_time,
                    end_time=end_time,
                )
            )

    if schedules:
        DentistSchedule.objects.bulk_create(schedules)


def reverse(apps, schema_editor):
    # Intentionally no-op to avoid deleting custom schedules.
    return


class Migration(migrations.Migration):
    dependencies = [
        ('dentapp', '0019_migrate_scheduled_to_confirmed'),
    ]

    operations = [
        migrations.RunPython(forward, reverse),
    ]
