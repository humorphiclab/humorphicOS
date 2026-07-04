from django.conf import settings
from django.db import models


class Announcement(models.Model):
    class Priority(models.TextChoices):
        GENERAL = "general", "General"
        DEPARTMENT = "department", "Department"
        EMERGENCY = "emergency", "Emergency"

    title = models.CharField(max_length=200)
    content = models.TextField()
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.GENERAL)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    department = models.ForeignKey(
        "departments.Department", on_delete=models.SET_NULL, null=True, blank=True
    )
    is_pinned = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_pinned", "-created_at"]

    def __str__(self):
        return self.title
