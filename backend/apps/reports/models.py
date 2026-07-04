from django.conf import settings
from django.db import models


class Report(models.Model):
    class ReportType(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        ATTENDANCE = "attendance", "Attendance"
        PROJECT = "project", "Project"
        MEMBER = "member", "Member"
        DEPARTMENT = "department", "Department"
        PERFORMANCE = "performance", "Performance"

    title = models.CharField(max_length=200)
    report_type = models.CharField(max_length=20, choices=ReportType.choices)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    data = models.JSONField(default=dict)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
