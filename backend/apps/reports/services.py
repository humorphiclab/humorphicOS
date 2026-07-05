from datetime import timedelta

from django.db.models import Avg, Count
from django.utils import timezone

from apps.attendance.models import AttendanceRecord
from apps.daily_updates.models import DailyUpdate
from apps.projects.models import Project
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


def generate_attendance_report(user):
    today = timezone.now().date()
    month_start = today.replace(day=1)
    records = AttendanceRecord.objects.filter(date__gte=month_start).select_related("user")
    by_status = list(records.values("status").annotate(count=Count("id")))
    by_method = list(records.values("method").annotate(count=Count("id")))

    data = {
        "period_start": str(month_start),
        "period_end": str(today),
        "total_records": records.count(),
        "by_status": by_status,
        "by_method": by_method,
        "unique_members": records.values("user").distinct().count(),
    }

    return Report.objects.create(
        title=f"Attendance Report - {month_start.strftime('%B %Y')}",
        report_type=Report.ReportType.ATTENDANCE,
        generated_by=user,
        period_start=month_start,
        period_end=today,
        data=data,
    )


def generate_project_report(user):
    today = timezone.now().date()
    projects = Project.objects.select_related("owner", "department").prefetch_related("milestones")
    project_data = []
    for p in projects:
        project_data.append({
            "title": p.title,
            "status": p.status,
            "health": p.health,
            "completion": p.completion_percentage,
            "milestones_total": p.milestones.count(),
            "milestones_done": p.milestones.filter(is_completed=True).count(),
        })

    data = {
        "generated_on": str(today),
        "total_projects": projects.count(),
        "by_health": list(projects.values("health").annotate(count=Count("id"))),
        "by_status": list(projects.values("status").annotate(count=Count("id"))),
        "projects": project_data[:30],
    }

    return Report.objects.create(
        title=f"Project Report - {today}",
        report_type=Report.ReportType.PROJECT,
        generated_by=user,
        period_start=today,
        period_end=today,
        data=data,
    )


def generate_performance_report(user):
    today = timezone.now().date()
    month_start = today.replace(day=1)
    tasks = Task.objects.filter(updated_at__date__gte=month_start)
    updates = DailyUpdate.objects.filter(date__gte=month_start)

    data = {
        "period_start": str(month_start),
        "period_end": str(today),
        "tasks_completed": tasks.filter(status=Task.Status.DONE).count(),
        "tasks_overdue": tasks.filter(
            due_date__lt=today,
            status__in=[Task.Status.TODO, Task.Status.IN_PROGRESS],
        ).count(),
        "avg_hours_logged": float(tasks.aggregate(a=Avg("hours_logged"))["a"] or 0),
        "daily_updates": updates.count(),
        "top_contributors": list(
            updates.values("user__first_name", "user__last_name")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        ),
    }

    return Report.objects.create(
        title=f"Performance Report - {month_start.strftime('%B %Y')}",
        report_type=Report.ReportType.PERFORMANCE,
        generated_by=user,
        period_start=month_start,
        period_end=today,
        data=data,
    )
