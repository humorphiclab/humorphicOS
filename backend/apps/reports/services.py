from datetime import timedelta

from django.utils import timezone

from apps.daily_updates.models import DailyUpdate
from apps.tasks.models import Task

from .models import Report


def generate_daily_report(user):
    today = timezone.now().date()
    updates = DailyUpdate.objects.filter(date=today).select_related("user")
    tasks_completed = Task.objects.filter(completed_at__date=today, status=Task.Status.DONE)

    data = {
        "date": str(today),
        "daily_updates_count": updates.count(),
        "updates": [
            {
                "user": u.user.get_full_name(),
                "work_done": u.work_done,
                "hours": float(u.hours_worked),
            }
            for u in updates[:50]
        ],
        "tasks_completed": tasks_completed.count(),
    }

    return Report.objects.create(
        title=f"Daily Report - {today}",
        report_type=Report.ReportType.DAILY,
        generated_by=user,
        period_start=today,
        period_end=today,
        data=data,
    )


def generate_weekly_report(user):
    today = timezone.now().date()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    updates = DailyUpdate.objects.filter(date__range=(week_start, week_end))
    tasks = Task.objects.filter(updated_at__date__range=(week_start, week_end))

    data = {
        "week_start": str(week_start),
        "week_end": str(week_end),
        "daily_updates": updates.count(),
        "tasks_updated": tasks.count(),
        "tasks_completed": tasks.filter(status=Task.Status.DONE).count(),
    }

    return Report.objects.create(
        title=f"Weekly Report - {week_start} to {week_end}",
        report_type=Report.ReportType.WEEKLY,
        generated_by=user,
        period_start=week_start,
        period_end=week_end,
        data=data,
    )
