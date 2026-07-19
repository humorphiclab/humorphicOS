from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.accounts.models import User
from apps.notifications.services import send_notification_to_user
from .models import KnowledgeArticle


@receiver(post_save, sender=KnowledgeArticle)
def notify_new_article(sender, instance, created, **kwargs):
    if not created or not instance.is_published:
        return

    is_tutorial = instance.article_type == KnowledgeArticle.ArticleType.TUTORIAL
    
    if is_tutorial:
        title = "New Lecture Added"
        message = f"A new lecture '{instance.title}' has been added by {instance.author.get_full_name()}."
        priority = "medium"
    else:
        title = "New Article Published"
        message = f"A new document '{instance.title}' has been published by {instance.author.get_full_name()}."
        priority = "normal"

    # Send notifications to all active users except the author
    recipients = User.objects.filter(is_active=True).exclude(id=instance.author.id)
    
    link = f"/knowledge/{instance.slug}"
    
    for recipient in recipients:
        try:
            send_notification_to_user(
                user=recipient,
                pref_key="lectures",
                title=title,
                message=message,
                link=link,
                priority=priority
            )
        except Exception:
            pass
