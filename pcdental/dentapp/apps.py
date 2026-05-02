from django.apps import AppConfig


class DentappConfig(AppConfig):
    name = 'dentapp'

    def ready(self):
        from . import signals  # noqa: F401
