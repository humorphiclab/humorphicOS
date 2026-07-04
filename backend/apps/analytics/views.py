from datetime import timedelta
from django.db.models import Count, Avg
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.accounts.permissions import IsLeadership
from rest_framework.permissions import IsAuthenticated


class AnalyticsDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsLeadership]

    def get(self, request):
        from apps.tasks.models import Task
        from apps.projects.models import Project
        from apps.daily_updates.models import DailyUpdate
        from apps.attendance.models import AttendanceRecord
        from apps.accounts.models import User
        from apps.departments.models import Department

        today = timezone.now().date()
        week_start = today - timedelta(days=today.weekday())

        task_by_status = list(Task.objects.values("status").annotate(count=Count("id")))
        project_by_health = list(Project.objects.values("health").annotate(count=Count("id")))
        dept_stats = []
        for d in Department.objects.filter(is_active=True):
            dept_stats.append({"name": d.name, "teams": d.teams.count(), "projects": d.projects.count()})

        members = User.objects.filter(is_active=True).count()
        updates_week = DailyUpdate.objects.filter(date__gte=week_start).count()
        attendance_rate = 0
        total_att = AttendanceRecord.objects.filter(date__gte=week_start).count()
        present = AttendanceRecord.objects.filter(date__gte=week_start, status="present").count()
        if total_att:
            attendance_rate = round(present / total_att * 100, 1)

        return Response({
            "members": members,
            "tasks_by_status": task_by_status,
            "projects_by_health": project_by_health,
            "department_stats": dept_stats,
            "daily_updates_this_week": updates_week,
            "attendance_rate": attendance_rate,
            "avg_task_hours": float(Task.objects.aggregate(a=Avg("hours_logged"))["a"] or 0),
        })


class PerformanceTrendsView(APIView):
    permission_classes = [IsAuthenticated, IsLeadership]

    def get(self, request):
        from apps.daily_updates.models import DailyUpdate
        from apps.tasks.models import Task

        today = timezone.now().date()
        trends = []
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            trends.append({
                "date": str(d),
                "updates": DailyUpdate.objects.filter(date=d).count(),
                "tasks_completed": Task.objects.filter(completed_at__date=d).count(),
            })
        return Response({"trends": trends})


urlpatterns_import = True
