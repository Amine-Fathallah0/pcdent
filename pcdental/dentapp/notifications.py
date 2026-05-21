"""Helpers for creating Notification rows and pushing them via WebSocket.

Centralizes the create+broadcast logic so every appointment workflow action
fires notifications consistently.
"""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .consumers import user_group_name
from .models import Notification
from .serializers import AppointmentSerializer, NotificationSerializer


def notify(recipient, notification_type, related_appointment=None):
    """Create a Notification and push it over the user's WebSocket group."""
    notification = Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        related_appointment=related_appointment,
    )
    payload = NotificationSerializer(notification).data
    if related_appointment is not None:
        payload['appointment_detail'] = AppointmentSerializer(related_appointment).data
    layer = get_channel_layer()
    if layer is not None:
        async_to_sync(layer.group_send)(
            user_group_name(recipient.user_id),
            {'type': 'notification.new', 'notification': payload},
        )
    return notification
