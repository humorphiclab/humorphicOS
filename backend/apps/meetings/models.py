from django.conf import settings
from django.db import models


class Meeting(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    agenda = models.TextField(blank=True)
    meet_link = models.URLField(blank=True)
    recording_link = models.URLField(blank=True)
    location = models.CharField(max_length=200, blank=True)
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="organized_meetings"
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="meetings", blank=True
    )
    department = models.ForeignKey(
        "departments.Department", on_delete=models.SET_NULL, null=True, blank=True
    )
    team = models.ForeignKey(
        "teams.Team", on_delete=models.SET_NULL, null=True, blank=True
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    minutes = models.TextField(blank=True)
    action_items = models.JSONField(default=list, blank=True)
    ai_summary = models.TextField(blank=True)
    reminder_15m_sent = models.BooleanField(default=False)
    reminder_5m_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_time"]

    def __str__(self):
        return self.title


class MeetingAttendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT = "absent", "Absent"
        LATE = "late", "Late"
        EXCUSED = "excused", "Excused"

    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name="attendance_records")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ABSENT)
    joined_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ("meeting", "user")

    def __str__(self):
        return f"{self.user} - {self.meeting.title} ({self.status})"
