from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import models
from apps.accounts.models import User
from apps.notifications.services import send_notification_to_user
from .models import LeaveRequest


@receiver(post_save, sender=LeaveRequest)
def notify_leave_request_updates(sender, instance, created, **kwargs):
    if created:
        # 1. Notify leadership that a new request has been submitted
        title = "New Leave Request Submitted"
        message = f"{instance.user.get_full_name()} has requested {instance.get_leave_type_display()} from {instance.start_date} to {instance.end_date}."
        priority = "normal"
        link = "/attendance"

        # Find leadership users
        recipients = User.objects.filter(
            models.Q(is_superuser=True) |
            models.Q(role__is_leadership=True) |
            models.Q(role__slug__in=["founder", "president", "super_admin", "vice_president"])
        ).filter(is_active=True).distinct()

        for recipient in recipients:
            if recipient.id != instance.user.id:
                try:
                    send_notification_to_user(
                        user=recipient,
                        pref_key="leave_requests",
                        title=title,
                        message=message,
                        link=link,
                        priority=priority
                    )
                except Exception:
                    pass
    else:
        # 2. Check if status has changed from pending to approved/rejected
        # We can detect this by checking if the request has approved_by set or is not pending
        if instance.status in [LeaveRequest.Status.APPROVED, LeaveRequest.Status.REJECTED]:
            status_str = "Approved" if instance.status == LeaveRequest.Status.APPROVED else "Rejected"
            title = f"Leave Request {status_str}"
            
            approved_by_name = instance.approved_by.get_full_name() if instance.approved_by else "Leadership"
            message = f"Your request for {instance.get_leave_type_display()} leave from {instance.start_date} to {instance.end_date} has been {status_str.lower()} by {approved_by_name}."
            priority = "urgent"
            link = "/attendance"

            try:
                send_notification_to_user(
                    user=instance.user,
                    pref_key="leave_requests",
                    title=title,
                    message=message,
                    link=link,
                    priority=priority
                )
            except Exception:
                pass
