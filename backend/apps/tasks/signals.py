import logging
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import Task
from apps.notifications.services import send_notification_to_user

logger = logging.getLogger(__name__)

@receiver(pre_save, sender=Task)
def task_pre_save(sender, instance, **kwargs):
    """Store original status and assignee for post_save comparison."""
    if instance.pk:
        try:
            old = Task.objects.get(pk=instance.pk)
            instance._old_assignee = old.assignee
            instance._old_status = old.status
        except Task.DoesNotExist:
            instance._old_assignee = None
            instance._old_status = None
    else:
        instance._old_assignee = None
        instance._old_status = None


@receiver(post_save, sender=Task)
def task_post_save(sender, instance, created, **kwargs):
    """Handle task notifications on creation and updates."""
    # Map task priority to notification priority
    priority_mapping = {
        "low": "low",
        "medium": "normal",
        "high": "medium",
        "urgent": "urgent",
    }
    notif_priority = priority_mapping.get(instance.priority, "normal")

    # 1. Task Assigned
    assignee_changed = False
    if created and instance.assignee:
        assignee_changed = True
    elif not created and instance.assignee and instance.assignee != getattr(instance, "_old_assignee", None):
        assignee_changed = True

    if assignee_changed:
        assigner_name = instance.assigned_by.get_full_name() if instance.assigned_by else "A project lead"
        send_notification_to_user(
            user=instance.assignee,
            pref_key="task_assigned",
            title=f"Task Assigned: {instance.title}",
            message=f"{assigner_name} has assigned you the task '{instance.title}'.",
            link=f"/tasks",
            priority=notif_priority
        )

    # 2. Task Status Transitions
    old_status = getattr(instance, "_old_status", None)
    new_status = instance.status

    if created or old_status != new_status:
        # Task Sent / Received for Review
        if new_status == Task.Status.REVIEW:
            # Notify assignee (sent confirmation)
            if instance.assignee:
                send_notification_to_user(
                    user=instance.assignee,
                    pref_key="task_review",
                    title=f"Task Sent for Review: {instance.title}",
                    message=f"You have submitted the task '{instance.title}' for review.",
                    link=f"/tasks",
                    priority=notif_priority
                )
            # Notify assigner/creator (received notification)
            if instance.assigned_by:
                assignee_name = instance.assignee.get_full_name() if instance.assignee else "An assignee"
                send_notification_to_user(
                    user=instance.assigned_by,
                    pref_key="task_review",
                    title=f"Task Review Request: {instance.title}",
                    message=f"{assignee_name} has submitted the task '{instance.title}' for review.",
                    link=f"/tasks",
                    priority=notif_priority
                )

        # Task Completed
        elif new_status == Task.Status.DONE:
            # Notify assignee
            if instance.assignee:
                send_notification_to_user(
                    user=instance.assignee,
                    pref_key="task_completed",
                    title=f"Task Completed: {instance.title}",
                    message=f"The task '{instance.title}' has been completed.",
                    link=f"/tasks",
                    priority=notif_priority
                )
            # Notify assigner
            if instance.assigned_by and instance.assigned_by != instance.assignee:
                send_notification_to_user(
                    user=instance.assigned_by,
                    pref_key="task_completed",
                    title=f"Task Completed: {instance.title}",
                    message=f"The task '{instance.title}' has been completed.",
                    link=f"/tasks",
                    priority=notif_priority
                )

        # Task Needs Changes (Transition from review to in_progress or todo)
        elif old_status == Task.Status.REVIEW and new_status in [Task.Status.IN_PROGRESS, Task.Status.TODO]:
            # Notify assignee
            if instance.assignee:
                send_notification_to_user(
                    user=instance.assignee,
                    pref_key="task_needs_changes",
                    title=f"Task Needs Changes: {instance.title}",
                    message=f"The task '{instance.title}' needs changes and has been moved back to '{instance.get_status_display()}'.",
                    link=f"/tasks",
                    priority=notif_priority
                )
            # Notify assigner
            if instance.assigned_by:
                send_notification_to_user(
                    user=instance.assigned_by,
                    pref_key="task_needs_changes",
                    title=f"Changes Requested: {instance.title}",
                    message=f"You have requested changes for the task '{instance.title}'.",
                    link=f"/tasks",
                    priority=notif_priority
                )

