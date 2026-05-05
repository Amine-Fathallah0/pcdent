from django.apps import AppConfig


class DentappConfig(AppConfig):
    name = 'dentapp'

    def ready(self):
        import dentapp.signals  # noqa: F401  registers post_save handlers
