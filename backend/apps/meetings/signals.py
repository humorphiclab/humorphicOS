import logging
from django.db.models.signals import post_save, pre_delete, m2m_changed
from django.dispatch import receiver
from .models import Meeting
from apps.notifications.services import send_notification_to_user

logger = logging.getLogger(__name__)

@receiver(m2m_changed, sender=Meeting.participants.through)
def meeting_participants_changed(sender, instance, action, pk_set, **kwargs):
    """Notify participants when they are added to a meeting."""
    if action == "post_add":
        from apps.accounts.models import User
        participants = User.objects.filter(id__in=pk_set)
        organizer_name = instance.organizer.get_full_name() if instance.organizer else "A team lead"
        
        # Format start time in Asia/Kolkata timezone or standard string
        start_str = instance.start_time.strftime("%I:%M %p on %b %d, %Y")
        
        for participant in participants:
            if participant == instance.organizer:
                continue
            send_notification_to_user(
                user=participant,
                pref_key="meetings",
                title=f"New Meeting: {instance.title}",
                message=f"{organizer_name} has scheduled a meeting: '{instance.title}' for {start_str}.",
                link=f"/calendar"
            )


@receiver(post_save, sender=Meeting)
def meeting_post_save(sender, instance, created, **kwargs):
    """Notify participants when meeting details are updated and schedule reminders."""
    from datetime import timedelta
    from django.utils import timezone
    from .tasks import send_meeting_reminder

    # Schedule 15-minute reminder (medium priority)
    eta_15 = instance.start_time - timedelta(minutes=15)
    if eta_15 > timezone.now():
        try:
            send_meeting_reminder.apply_async(
                args=[instance.id, "medium", "15 minutes"],
                eta=eta_15
            )
        except Exception as e:
            logger.warning(f"Could not queue 15m Celery reminder: {e}. Periodic task backup will handle it.")

    # Schedule 5-minute reminder (urgent priority)
    eta_5 = instance.start_time - timedelta(minutes=5)
    if eta_5 > timezone.now():
        try:
            send_meeting_reminder.apply_async(
                args=[instance.id, "urgent", "5 minutes"],
                eta=eta_5
            )
        except Exception as e:
            logger.warning(f"Could not queue 5m Celery reminder: {e}. Periodic task backup will handle it.")

    if not created:
        # For updates, notify all current participants (excluding organizer)
        start_str = instance.start_time.strftime("%I:%M %p on %b %d, %Y")
        participants = instance.participants.exclude(id=instance.organizer.id)
        
        for participant in participants:
            send_notification_to_user(
                user=participant,
                pref_key="meetings",
                title=f"Meeting Updated: {instance.title}",
                message=f"The meeting '{instance.title}' has been updated. New details: starts at {start_str}.",
                link=f"/calendar"
            )


@receiver(pre_delete, sender=Meeting)
def meeting_pre_delete(sender, instance, **kwargs):
    """Notify participants when a meeting is cancelled."""
    start_str = instance.start_time.strftime("%I:%M %p on %b %d, %Y")
    participants = instance.participants.exclude(id=instance.organizer.id)
    
    for participant in participants:
        send_notification_to_user(
            user=participant,
            pref_key="meetings",
            title=f"Meeting Cancelled: {instance.title}",
            message=f"The meeting '{instance.title}' scheduled for {start_str} has been cancelled.",
            link=f"/calendar"
        )
