from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Conversation, DentistPatientLink, Message


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
