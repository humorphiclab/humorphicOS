from django.conf import settings
from django.db import models
import uuid


class CertificateTemplate(models.Model):
    class TemplateType(models.TextChoices):
        PARTICIPATION = "participation", "Participation"
        WORKSHOP = "workshop", "Workshop"
        ACHIEVEMENT = "achievement", "Achievement"
        COMPLETION = "completion", "Completion"
        VOLUNTEER = "volunteer", "Volunteer"
        CUSTOM = "custom", "Custom"

    name = models.CharField(max_length=200)
    template_type = models.CharField(max_length=20, choices=TemplateType.choices)
    html_template = models.TextField(help_text="HTML template with {{name}}, {{event}}, {{date}} placeholders")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Certificate(models.Model):
    certificate_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    template = models.ForeignKey(CertificateTemplate, on_delete=models.PROTECT)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="certificates")
    title = models.CharField(max_length=300)
    event_name = models.CharField(max_length=300, blank=True)
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="issued_certificates"
    )
    issued_at = models.DateTimeField(auto_now_add=True)
    verification_code = models.CharField(max_length=20, unique=True)

    class Meta:
        ordering = ["-issued_at"]

    def save(self, *args, **kwargs):
        if not self.verification_code:
            self.verification_code = uuid.uuid4().hex[:12].upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} - {self.recipient}"
