import secrets
import string

from django.db import migrations, models


def generate_dentist_codes(apps, schema_editor):
    Dentist = apps.get_model('dentapp', 'Dentist')
    used = set()
    for dentist in Dentist.objects.all():
        while True:
            code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
            if code not in used:
                used.add(code)
                dentist.dentist_code = code
                dentist.save(update_fields=['dentist_code'])
                break


class Migration(migrations.Migration):
    dependencies = [
        ('dentapp', '0006_remove_redundant_connection_code_index'),
    ]

    operations = [
        # Step 1: add column without unique constraint so existing rows get empty string
        migrations.AddField(
            model_name='dentist',
            name='dentist_code',
            field=models.CharField(blank=True, max_length=8, default=''),
            preserve_default=False,
        ),
        # Step 2: populate existing rows with unique codes
        migrations.RunPython(generate_dentist_codes, migrations.RunPython.noop),
        # Step 3: now it's safe to add the unique constraint
        migrations.AlterField(
            model_name='dentist',
            name='dentist_code',
            field=models.CharField(blank=True, max_length=8, unique=True),
        ),
    ]
