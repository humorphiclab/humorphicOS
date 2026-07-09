from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        TASK = "task", "Task"
        MEETING = "meeting", "Meeting"
        ANNOUNCEMENT = "announcement", "Announcement"
        REMINDER = "reminder", "Reminder"
        SYSTEM = "system", "System"
        MESSAGE = "message", "Message"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        NORMAL = "normal", "Normal"
        MEDIUM = "medium", "Medium"
        URGENT = "urgent", "Urgent"
        TOP = "top", "Top"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=Type.choices, default=Type.SYSTEM)
    priority = models.CharField(max_length=15, choices=Priority.choices, default=Priority.NORMAL)
    link = models.CharField(max_length=500, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} - {self.title}"


class NotificationPreference(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_preferences")
    
    # Task preferences
    email_task_assigned = models.BooleanField(default=True)
    in_app_task_assigned = models.BooleanField(default=True)
    
    email_task_review = models.BooleanField(default=True)
    in_app_task_review = models.BooleanField(default=True)
    
    email_task_completed = models.BooleanField(default=True)
    in_app_task_completed = models.BooleanField(default=True)
    
    email_task_needs_changes = models.BooleanField(default=True)
    in_app_task_needs_changes = models.BooleanField(default=True)
    
    # Message preferences
    email_messages = models.BooleanField(default=True)
    in_app_messages = models.BooleanField(default=True)
    
    # Meeting preferences
    email_meetings = models.BooleanField(default=True)
    in_app_meetings = models.BooleanField(default=True)

    def __str__(self):
        return f"Notification Preferences for {self.user}"


# Signal receiver to create NotificationPreference automatically
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_notification_preferences(sender, instance, created, **kwargs):
    if created:
        NotificationPreference.objects.get_or_create(user=instance)

