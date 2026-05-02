"""WebSocket JWT auth middleware.

Browsers cannot send Authorization headers on the WebSocket handshake, so we
read the JWT from the ``?token=...`` query string instead. The middleware
attaches the matching ``User`` (or ``AnonymousUser``) to ``scope['user']`` so
consumers can authorize the connection in ``connect()``.
"""

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken

User = get_user_model()


@database_sync_to_async
def _get_user(user_id):
    try:
        return User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token_list = params.get('token') or []
        token = token_list[0] if token_list else None

        scope['user'] = AnonymousUser()
        if token:
            try:
                validated = UntypedToken(token)
                user_id = validated.get('user_id')
                if user_id:
                    scope['user'] = await _get_user(user_id)
            except (InvalidToken, TokenError):
                pass

        return await super().__call__(scope, receive, send)
