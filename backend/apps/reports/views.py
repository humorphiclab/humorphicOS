from datetime import timedelta

from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.daily_updates.models import DailyUpdate
from apps.tasks.models import Task

from .models import Report
from .serializers import ReportSerializer
from .services import generate_daily_report, generate_weekly_report


class ReportViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    filterset_fields = ("report_type",)

    @action(detail=False, methods=["post"])
    def generate_daily(self, request):
        report = generate_daily_report(request.user)
        return Response(ReportSerializer(report).data, status=201)

    @action(detail=False, methods=["post"])
    def generate_weekly(self, request):
        report = generate_weekly_report(request.user)
        return Response(ReportSerializer(report).data, status=201)

    @action(detail=False, methods=["get"])
    def leadership_summary(self, request):
        today = timezone.now().date()
        week_start = today - timedelta(days=today.weekday())

        task_stats = {
            "total": Task.objects.count(),
            "completed": Task.objects.filter(status=Task.Status.DONE).count(),
            "overdue": Task.objects.filter(
                due_date__lt=today, status__in=[Task.Status.TODO, Task.Status.IN_PROGRESS]
            ).count(),
        }

        daily_compliance = DailyUpdate.objects.filter(date=today).count()

        return Response({
            "date": today,
            "week_start": week_start,
            "tasks": task_stats,
            "daily_updates_today": daily_compliance,
        })
