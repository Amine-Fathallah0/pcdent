"""WebSocket consumer for the global per-user chat connection.

Each authenticated user joins a personal channel group (``user_{user_id}``)
when their WebSocket connects. When a message is created via the REST API the
view broadcasts a ``chat.message`` event to both participants' groups; this
consumer forwards the payload to the browser.

Sending messages is intentionally NOT done via the WebSocket — POSTing through
the REST endpoint keeps validation, throttling, and permission checks in one
place. The WebSocket is push-only.
"""

from channels.generic.websocket import AsyncJsonWebsocketConsumer


def user_group_name(user_id) -> str:
    return f'user_{user_id}'


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return

        self.group_name = user_group_name(user.user_id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        group = getattr(self, 'group_name', None)
        if group:
            await self.channel_layer.group_discard(group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        # Push-only socket. Ignore anything the client sends; messaging happens
        # through the REST API. Optional: handle a {"type": "ping"} for keepalive.
        if isinstance(content, dict) and content.get('type') == 'ping':
            await self.send_json({'type': 'pong'})

    # --- Channel-layer event handlers ---------------------------------------

    async def chat_message(self, event):
        """Forward a new-message event to the connected client."""
        await self.send_json({
            'type': 'message.new',
            'conversation_id': event['conversation_id'],
            'message': event['message'],
        })

    async def chat_read(self, event):
        """Forward a conversation-read event (for updating unread badges)."""
        await self.send_json({
            'type': 'conversation.read',
            'conversation_id': event['conversation_id'],
            'reader_id': event['reader_id'],
        })

    async def notification_new(self, event):
        """Forward an appointment notification event."""
        await self.send_json({
            'type': 'notification.new',
            'notification': event['notification'],
        })
