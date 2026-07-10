from celery import shared_task
from django.conf import settings
from apps.notifications.services import send_html_email_to_user
from django.utils import timezone

from apps.accounts.models import User
from apps.notifications.models import Notification
from apps.tasks.models import Task


@shared_task
def send_daily_reminder():
    """Remind members to submit daily updates."""
    today = timezone.now().date()
    from apps.daily_updates.models import DailyUpdate

    submitted = set(DailyUpdate.objects.filter(date=today).values_list("user_id", flat=True))
    members = User.objects.filter(is_active=True).exclude(id__in=submitted)

    for member in members:
        Notification.objects.create(
            user=member,
            title="Daily Update Reminder",
            message="Please submit your daily work update for today.",
            notification_type=Notification.Type.REMINDER,
            link="/daily-updates",
        )
        if member.email:
            send_html_email_to_user(
                user=member,
                title="Daily Update Reminder",
                message=f"Hi {member.first_name},\n\nPlease submit your daily work update for today.",
                link="/daily-updates",
                priority="normal"
            )
        if member.phone and getattr(settings, "WHATSAPP_API_URL", ""):
            send_whatsapp_reminder.delay(member.id, f"Hi {member.first_name}, please submit your daily work update for {today}.")


@shared_task
def send_task_deadline_reminders():
    """Notify assignees of tasks due today."""
    today = timezone.now().date()
    tasks = Task.objects.filter(
        due_date=today,
        status__in=[Task.Status.TODO, Task.Status.IN_PROGRESS],
        assignee__isnull=False,
    ).select_related("assignee")

    for task in tasks:
        Notification.objects.create(
            user=task.assignee,
            title="Task Due Today",
            message=f'"{task.title}" is due today.',
            notification_type=Notification.Type.TASK,
            link=f"/tasks/{task.id}",
        )


@shared_task
def send_weekly_summary():
    from apps.reports.services import generate_weekly_report

    admin = User.objects.filter(is_superuser=True).first()
    if admin:
        generate_weekly_report(admin)
        for u in User.objects.filter(role__is_leadership=True, is_active=True):
            Notification.objects.create(
                user=u,
                title="Weekly Summary Ready",
                message="Weekly organizational report has been generated.",
                notification_type=Notification.Type.SYSTEM,
                link="/reports",
            )


@shared_task
def send_whatsapp_reminder(user_id: int, message: str):
    """WhatsApp integration stub — wire WHATSAPP_API_URL + WHATSAPP_API_TOKEN in Phase 3."""
    url = getattr(settings, "WHATSAPP_API_URL", "")
    token = getattr(settings, "WHATSAPP_API_TOKEN", "")
    if not url or not token:
        return {"sent": False, "reason": "WhatsApp not configured"}

    try:
        user = User.objects.get(id=user_id)
        if not user.phone:
            return {"sent": False, "reason": "User does not have a phone number"}

        import urllib.request
        import json

        data = json.dumps({
            "phone": user.phone,
            "message": message
        }).encode("utf-8")

        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return {"sent": True, "status": resp.status}
    except Exception as e:
        return {"sent": False, "reason": str(e)}
