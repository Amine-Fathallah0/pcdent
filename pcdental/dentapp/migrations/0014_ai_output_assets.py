from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dentapp', '0013_appointment_type_duration'),
    ]

    operations = [
        migrations.AddField(
            model_name='aiprocessingjob',
            name='annotated_image',
            field=models.ImageField(blank=True, null=True, upload_to='ai_outputs/%Y/%m/%d/'),
        ),
        migrations.AddField(
            model_name='aiprocessingjob',
            name='mask_image',
            field=models.ImageField(blank=True, null=True, upload_to='ai_outputs/%Y/%m/%d/'),
        ),
        migrations.AddField(
            model_name='aiprocessingjob',
            name='mask_label_map',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
