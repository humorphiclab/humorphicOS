from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.notifications.services import send_notification_to_user
from .models import Certificate


@receiver(post_save, sender=Certificate)
def notify_new_certificate(sender, instance, created, **kwargs):
    if not created:
        return

    title = "New Certificate Issued"
    message = f"Congratulations! You have been awarded the certificate '{instance.title}' for {instance.event_name or 'outstanding participation'}. Verification Code: {instance.verification_code}."
    priority = "medium"
    link = "/certificates"

    try:
        send_notification_to_user(
            user=instance.recipient,
            pref_key="certificates",
            title=title,
            message=message,
            link=link,
            priority=priority
        )
    except Exception:
        pass
