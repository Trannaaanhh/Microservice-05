from django.apps import AppConfig
import os
import sys


class AppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'app'

    def ready(self):
        if 'runserver' not in sys.argv:
            return
        if os.environ.get('RUN_MAIN') != 'true':
            return
        from .event_consumer import start_payment_consumer
        start_payment_consumer()
