from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('dentapp', '0014_ai_output_assets'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AnnotatedScan',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image_overlay', models.ImageField(upload_to='annotated_scans/%Y/%m/%d/')),
                ('image_format', models.CharField(default='png', max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('ct_scan', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='annotated_scans',
                    to='dentapp.ctscan',
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='DentalReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('raw_detections', models.JSONField(default=list)),
                ('report_text', models.TextField(blank=True)),
                ('status', models.CharField(
                    choices=[
                        ('auto_generated', 'Auto Generated'),
                        ('pending_review', 'Pending Review'),
                        ('edited', 'Edited'),
                        ('confirmed', 'Confirmed'),
                        ('deleted', 'Deleted'),
                        ('error', 'Error'),
                    ],
                    default='auto_generated',
                    max_length=20,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('edit_count', models.IntegerField(default=0)),
                ('error_message', models.TextField(blank=True)),
                ('ct_scan', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='dental_reports',
                    to='dentapp.ctscan',
                )),
                ('dentist', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='dental_reports',
                    to='dentapp.dentist',
                )),
                ('edited_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='edited_reports',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('patient', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='dental_reports',
                    to='dentapp.patient',
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='dentalreport',
            index=models.Index(fields=['ct_scan', '-created_at'], name='dentapp_den_ct_scan_idx'),
        ),
        migrations.AddIndex(
            model_name='dentalreport',
            index=models.Index(fields=['status', '-created_at'], name='dentapp_den_status_idx'),
        ),
        migrations.AddConstraint(
            model_name='dentalreport',
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=['ct_scan'],
                name='unique_active_report_per_scan',
            ),
        ),
    ]
