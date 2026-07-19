from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.accounts.models import User
from apps.notifications.services import send_notification_to_user
from .models import Event, EventRegistration


@receiver(post_save, sender=Event)
def notify_new_event(sender, instance, created, **kwargs):
    if not created or not instance.is_active:
        return

    title = "New Event Scheduled"
    message = f"Register for the upcoming event '{instance.title}' starting on {instance.start_time.strftime('%b %d, %Y at %H:%M')}."
    priority = "medium"

    # Send notifications to all active users except the organizer
    recipients = User.objects.filter(is_active=True).exclude(id=instance.organizer.id)
    
    # Send link to register/view event (slug is used as key)
    link = f"/events"

    for recipient in recipients:
        try:
            send_notification_to_user(
                user=recipient,
                pref_key="events",
                title=title,
                message=message,
                link=link,
                priority=priority
            )
        except Exception:
            pass


@receiver(post_save, sender=EventRegistration)
def notify_event_registration(sender, instance, created, **kwargs):
    if not created:
        return

    # Notify the registrant that they have successfully registered
    title = "Event Registration Confirmed"
    message = f"You are successfully registered for the event '{instance.event.title}' on {instance.event.start_time.strftime('%b %d, %Y at %H:%M')}."
    priority = "normal"
    link = "/events"

    try:
        send_notification_to_user(
            user=instance.user,
            pref_key="events",
            title=title,
            message=message,
            link=link,
            priority=priority
        )
    except Exception:
        pass
