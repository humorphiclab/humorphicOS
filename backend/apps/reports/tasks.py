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
    from apps.notifications.services import send_notification_to_user

    admin = User.objects.filter(is_superuser=True).first()
    if admin:
        generate_weekly_report(admin)
        for u in User.objects.filter(role__is_leadership=True, is_active=True):
            try:
                send_notification_to_user(
                    user=u,
                    pref_key="reports",
                    title="Weekly Summary Ready",
                    message="Weekly organizational report has been generated.",
                    link="/reports",
                    priority="low"
                )
            except Exception:
                pass


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


@shared_task
def send_attendance_reminder(priority: str = "normal"):
    """
    Reminds active members to mark their attendance if they haven't done so today.
    Priority can be low (morning), normal (afternoon), or urgent (evening).
    """
    today = timezone.now().date()
    from apps.attendance.models import AttendanceRecord
    from apps.notifications.services import send_notification_to_user

    # Find users who have already marked attendance today
    marked_users = set(AttendanceRecord.objects.filter(date=today).values_list("user_id", flat=True))
    
    # Find all active members who haven't marked attendance
    members = User.objects.filter(is_active=True).exclude(id__in=marked_users)

    # Customize message based on priority/time
    if priority == "low":
        msg = "Morning reminder: Please remember to mark your attendance for today."
    elif priority == "urgent":
        msg = "URGENT reminder: You have not marked your attendance for today. Please check in immediately!"
    else:
        msg = "Afternoon reminder: Please mark your attendance for today if you haven't done so yet."

    for member in members:
        try:
            send_notification_to_user(
                user=member,
                pref_key="reminders",
                title="Attendance Reminder",
                message=msg,
                link="/attendance",
                priority=priority
            )
            # Send WhatsApp if phone exists
            if member.phone and getattr(settings, "WHATSAPP_API_URL", ""):
                send_whatsapp_reminder.delay(member.id, f"{msg} Link: {getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/attendance")
        except Exception:
            pass


@shared_task
def send_low_stock_alerts():
    """
    Scans components and sends a consolidated low-stock alert to leadership/managers.
    """
    from apps.inventory.models import Component
    from apps.notifications.services import send_notification_to_user
    from django.db import models

    low_stock_items = Component.objects.filter(is_active=True)
    low_stock_list = [c for c in low_stock_items if c.is_low_stock]

    if not low_stock_list:
        return

    # Build list string
    items_str = ", ".join([f"{c.name} (Qty: {c.quantity}, Min: {c.min_stock})" for c in low_stock_list[:5]])
    if len(low_stock_list) > 5:
        items_str += f" and {len(low_stock_list) - 5} more items"

    title = "Low Stock Alert"
    message = f"The following inventory items are low on stock: {items_str}."
    link = "/inventory"
    priority = "medium"

    # Find leadership / managers
    recipients = User.objects.filter(
        models.Q(is_superuser=True) |
        models.Q(role__is_leadership=True) |
        models.Q(role__slug__in=["founder", "president", "super_admin", "vice_president"])
    ).filter(is_active=True).distinct()

    for recipient in recipients:
        try:
            send_notification_to_user(
                user=recipient,
                pref_key="inventory",
                title=title,
                message=message,
                link=link,
                priority=priority
            )
        except Exception:
            pass
