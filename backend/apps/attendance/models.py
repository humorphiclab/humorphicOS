from django.conf import settings
from django.db import models


class Holiday(models.Model):
    name = models.CharField(max_length=200)
    date = models.DateField(unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["date"]

    def __str__(self):
        return f"{self.name} ({self.date})"


class AttendanceRecord(models.Model):
    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT = "absent", "Absent"
        LATE = "late", "Late"
        HALF_DAY = "half_day", "Half Day"
        LEAVE = "leave", "Leave"

    class Method(models.TextChoices):
        MANUAL = "manual", "Manual"
        QR = "qr", "QR Code"
        FACE = "face", "Face Recognition"
        MEETING = "meeting", "Meeting"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attendance_records")
    date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PRESENT)
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.MANUAL)
    check_in = models.DateTimeField(null=True, blank=True)
    check_out = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    qr_token = models.CharField(max_length=64, blank=True)
    face_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.user} - {self.date} ({self.status})"


class LeaveRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    class LeaveType(models.TextChoices):
        SICK = "sick", "Sick Leave"
        CASUAL = "casual", "Casual Leave"
        EMERGENCY = "emergency", "Emergency"
        OTHER = "other", "Other"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="leave_requests")
    leave_type = models.CharField(max_length=20, choices=LeaveType.choices, default=LeaveType.CASUAL)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_leaves"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} leave {self.start_date} to {self.end_date}"
