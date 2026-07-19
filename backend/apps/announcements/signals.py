from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.accounts.models import User
from apps.notifications.services import send_notification_to_user
from .models import Announcement


@receiver(post_save, sender=Announcement)
def notify_new_announcement(sender, instance, created, **kwargs):
    if not created or not instance.is_active:
        return

    is_emergency = instance.priority == Announcement.Priority.EMERGENCY
    
    if is_emergency:
        title = "Urgent Announcement"
        priority = "urgent"
    else:
        title = "New Announcement"
        priority = "medium" if instance.priority == Announcement.Priority.DEPARTMENT else "normal"

    message = f"{instance.title}: {instance.content[:100]}..." if len(instance.content) > 100 else f"{instance.title}: {instance.content}"

    # Determine recipients: specific department or all active members
    if instance.department:
        recipients = instance.department.members.filter(is_active=True).exclude(id=instance.author.id)
    else:
        recipients = User.objects.filter(is_active=True).exclude(id=instance.author.id)

    # Link: typically /dashboard or announcements list
    link = "/dashboard"

    for recipient in recipients:
        try:
            send_notification_to_user(
                user=recipient,
                pref_key="announcements",
                title=f"{title}: {instance.title}",
                message=message,
                link=link,
                priority=priority
            )
        except Exception:
            pass
