from django.db import migrations
from django.utils import timezone


def backfill_conversations(apps, schema_editor):
    DentistPatientLink = apps.get_model('dentapp', 'DentistPatientLink')
    Conversation = apps.get_model('dentapp', 'Conversation')
    Message = apps.get_model('dentapp', 'Message')

    for link in DentistPatientLink.objects.filter(is_active=True):
        if hasattr(link, 'conversation'):
            continue
        conversation = Conversation.objects.create(dentist_patient_link=link)
        dentist_name = link.dentist.dentist.full_name
        patient_name = link.patient.patient.full_name
        Message.objects.create(
            conversation=conversation,
            sender=None,
            is_system=True,
            is_read=True,
            content=(
                f"You are now connected. Say hello to start the conversation between "
                f"Dr. {dentist_name} and {patient_name}."
            ),
        )
        conversation.last_message_at = timezone.now()
        conversation.save(update_fields=['last_message_at'])


def noop_reverse(apps, schema_editor):
    # Forward-only data migration; existing conversations stay.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("dentapp", "0014_conversation_message"),
    ]

    operations = [
        migrations.RunPython(backfill_conversations, noop_reverse),
    ]
