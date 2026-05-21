from datetime import time

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Conversation, Dentist, DentistPatientLink, DentistSchedule, Message


@receiver(pre_save, sender=DentistPatientLink)
def _track_link_activation(sender, instance, **kwargs):
    """Remember whether is_active changed to True so post_save can act on it."""
    if not instance.pk:
        instance._was_active = False
        return
    try:
        previous = DentistPatientLink.objects.only('is_active').get(pk=instance.pk)
        instance._was_active = previous.is_active
    except DentistPatientLink.DoesNotExist:
        instance._was_active = False


@receiver(post_save, sender=DentistPatientLink)
def _create_conversation_on_link_approval(sender, instance, created, **kwargs):
    """Create a Conversation + welcome message when a link becomes active.

    Covers both paths:
      - dentist creates a link with is_active=True directly
      - dentist approves a pending link (is_active flips False -> True)
    """
    if not instance.is_active:
        return

    became_active = created or not getattr(instance, '_was_active', False)
    if not became_active:
        return

    conversation, was_created = Conversation.objects.get_or_create(
        dentist_patient_link=instance,
    )
    if not was_created:
        return

    dentist_name = instance.dentist.dentist.full_name
    patient_name = instance.patient.patient.full_name
    Message.objects.create(
        conversation=conversation,
        sender=None,
        is_system=True,
        is_read=True,
        content=f"You are now connected. Say hello to start the conversation between Dr. {dentist_name} and {patient_name}.",
    )
    conversation.last_message_at = timezone.now()
    conversation.save(update_fields=['last_message_at'])
 

@receiver(post_save, sender=Dentist)
def _seed_default_schedule(sender, instance, created, **kwargs):
    if not created:
        return
    if DentistSchedule.objects.filter(dentist=instance).exists():
        return
    defaults = [
        (0, time(9, 0), time(17, 0)),
        (1, time(9, 0), time(17, 0)),
        (2, time(9, 0), time(17, 0)),
        (3, time(9, 0), time(17, 0)),
        (4, time(9, 0), time(17, 0)),
    ]
    DentistSchedule.objects.bulk_create([
        DentistSchedule(dentist=instance, weekday=weekday, start_time=start, end_time=end)
        for weekday, start, end in defaults
    ])

from .models import CTScan


@receiver(post_save, sender=CTScan)
def trigger_unified_analysis(sender, instance: CTScan, created: bool, **kwargs):
    if not created:
        return
    # Import inside handler to avoid circular imports at app startup.
    from .tasks.analysis import analyze_ct_scan_and_generate_report
    analyze_ct_scan_and_generate_report.delay(instance.pk)
