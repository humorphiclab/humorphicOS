from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.daily_updates.models import DailyUpdate
from apps.tasks.models import Task

from .models import Achievement, UserProfile


@receiver(post_save, sender=Task)
def award_task_xp(sender, instance, **kwargs):
    if instance.status != Task.Status.DONE or not instance.assignee or not instance.completed_at:
        return
    if Achievement.objects.filter(user=instance.assignee, title=f"Task: {instance.title}").exists():
        return
    profile, _ = UserProfile.objects.get_or_create(user=instance.assignee)
    profile.tasks_completed += 1
    profile.add_xp(25)
    Achievement.objects.create(
        user=instance.assignee,
        title=f"Task: {instance.title}",
        description="Completed a task",
        xp_awarded=25,
    )


@receiver(post_save, sender=DailyUpdate)
def award_daily_update_xp(sender, instance, created, **kwargs):
    if not created:
        return
    profile, _ = UserProfile.objects.get_or_create(user=instance.user)
    profile.updates_submitted += 1
    profile.add_xp(10)
