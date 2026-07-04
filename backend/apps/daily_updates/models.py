from django.conf import settings
from django.db import models


class DailyUpdate(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="daily_updates")
    date = models.DateField()
    work_done = models.TextField(help_text="Today's work")
    hours_worked = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    challenges = models.TextField(blank=True)
    learning = models.TextField(blank=True)
    tomorrow_plan = models.TextField(blank=True)
    need_help = models.TextField(blank=True)
    github_link = models.URLField(blank=True)
    drive_link = models.URLField(blank=True)
    ai_summary = models.TextField(blank=True)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.SET_NULL, null=True, blank=True, related_name="daily_updates"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        unique_together = ("user", "date")

    def __str__(self):
        return f"{self.user} - {self.date}"
