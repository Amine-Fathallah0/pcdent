import secrets

from django.db import migrations, models

_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'


def regenerate_dentist_codes(apps, schema_editor):
    Dentist = apps.get_model('dentapp', 'Dentist')
    used = set()
    for dentist in Dentist.objects.all():
        while True:
            suffix = ''.join(secrets.choice(_ALPHABET) for _ in range(4))
            code = f'DR-{suffix}'
            if code not in used:
                used.add(code)
                dentist.dentist_code = code
                dentist.save(update_fields=['dentist_code'])
                break


class Migration(migrations.Migration):
    dependencies = [
        ('dentapp', '0007_add_dentist_code'),
    ]

    operations = [
        # Step 1: drop unique so we can freely overwrite (column still max_length=8)
        migrations.AlterField(
            model_name='dentist',
            name='dentist_code',
            field=models.CharField(blank=True, max_length=8),
        ),
        # Step 2: rewrite all codes to DR-XXXX (7 chars) while column still fits 8
        migrations.RunPython(regenerate_dentist_codes, migrations.RunPython.noop),
        # Step 3: now safe to shrink column and restore unique
        migrations.AlterField(
            model_name='dentist',
            name='dentist_code',
            field=models.CharField(blank=True, max_length=7, unique=True),
        ),
    ]
