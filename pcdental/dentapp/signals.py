from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import CTScan


@receiver(post_save, sender=CTScan)
def trigger_unified_analysis(sender, instance: CTScan, created: bool, **kwargs):
    if not created:
        return
    # Import inside handler to avoid circular imports at app startup.
    from .tasks.analysis import analyze_ct_scan_and_generate_report
    analyze_ct_scan_and_generate_report.delay(instance.pk)
