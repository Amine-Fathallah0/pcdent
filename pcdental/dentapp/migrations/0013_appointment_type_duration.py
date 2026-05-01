from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dentapp', '0012_alter_ctscan_file'),
    ]

    operations = [
        migrations.AddField(
            model_name='appointment',
            name='appointment_type',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='appointment',
            name='duration',
            field=models.IntegerField(default=30),
        ),
    ]
