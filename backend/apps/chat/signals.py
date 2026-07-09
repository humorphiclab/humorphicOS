import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import DirectMessage, ChannelMessage
from apps.accounts.models import User
from apps.notifications.services import send_notification_to_user

logger = logging.getLogger(__name__)

def get_sender_priority(sender):
    """
    Determine priority based on sender's role slug:
      - 'top': president, vice_president, faculty, super_admin
      - 'urgent': team_lead, mentor
      - 'normal': others
    """
    if not sender:
        return "normal"
    if sender.is_superuser:
        return "top"
    
    role_slug = sender.role.slug if sender.role else ""
    if role_slug in ["super_admin", "president", "vice_president", "faculty"]:
        return "top"
    elif role_slug in ["team_lead", "mentor"]:
        return "urgent"
    return "normal"


@receiver(post_save, sender=DirectMessage)
def dm_post_save(sender, instance, created, **kwargs):
    """Notify recipient of a new direct message with priority based on sender's role."""
    if created:
        sender_name = instance.sender.get_full_name() or instance.sender.email
        content_preview = instance.content[:100] + "..." if len(instance.content) > 100 else instance.content
        priority = get_sender_priority(instance.sender)
        
        send_notification_to_user(
            user=instance.recipient,
            pref_key="messages",
            title=f"New Message from {sender_name}",
            message=f"{sender_name}: '{content_preview}'",
            link="/chat",
            priority=priority
        )


@receiver(post_save, sender=ChannelMessage)
def channel_message_post_save(sender, instance, created, **kwargs):
    """Notify all members of the channel of a new message with priority based on author's role."""
    if created:
        content = instance.content
        author_name = instance.author.get_full_name() or instance.author.email
        content_preview = content[:100] + "..." if len(content) > 100 else content
        priority = get_sender_priority(instance.author)

        # Notify all members of the channel except the author
        members = instance.channel.members.exclude(id=instance.author.id)
        for member in members:
            send_notification_to_user(
                user=member,
                pref_key="messages",
                title=f"New message in #{instance.channel.name}",
                message=f"{author_name}: '{content_preview}'",
                link="/chat",
                priority=priority
            )
