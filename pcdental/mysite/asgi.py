"""
ASGI config for mysite project.

Routes HTTP traffic to Django and WebSocket traffic to Channels consumers.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')

# Initialize Django ASGI application early so apps are loaded before
# importing modules that depend on the ORM (consumers, JWT auth, etc.).
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from dentapp.routing import websocket_urlpatterns  # noqa: E402
from dentapp.ws_auth import JWTAuthMiddleware  # noqa: E402


application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': JWTAuthMiddleware(URLRouter(websocket_urlpatterns)),
})
