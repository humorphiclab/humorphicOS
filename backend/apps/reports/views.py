from datetime import timedelta

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.daily_updates.models import DailyUpdate
from apps.tasks.models import Task

from .models import Report
from .pdf import generate_report_pdf
from .serializers import ReportSerializer
from .services import generate_daily_report, generate_weekly_report


class ReportViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Report.objects.select_related("generated_by")
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

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        report = self.get_object()
        fmt = request.query_params.get("format", "json")

        if fmt == "pdf":
            pdf_bytes = generate_report_pdf(report)
            response = HttpResponse(pdf_bytes, content_type="application/pdf")
            safe_name = report.title.replace(" ", "-").replace("/", "-")[:60]
            response["Content-Disposition"] = f'attachment; filename="{safe_name}.pdf"'
            return response

        if fmt == "csv":
            import csv

            response = HttpResponse(content_type="text/csv")
            response["Content-Disposition"] = f'attachment; filename="report-{report.id}.csv"'
            writer = csv.writer(response)
            writer.writerow(["field", "value"])
            writer.writerow(["title", report.title])
            writer.writerow(["type", report.report_type])
            writer.writerow(["period_start", report.period_start])
            writer.writerow(["period_end", report.period_end])
            for key, val in (report.data or {}).items():
                writer.writerow([key, val])
            return response

        return Response(ReportSerializer(report).data)
