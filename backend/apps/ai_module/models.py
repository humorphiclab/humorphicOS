from django.conf import settings
from django.db import models


class ChatMessage(models.Model):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"
        SYSTEM = "system", "System"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_messages")
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()
    session_id = models.CharField(max_length=64, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.role}: {self.content[:50]}"


class AiInsight(models.Model):
    class InsightType(models.TextChoices):
        TASK = "task", "Task Summary"
        MEETING = "meeting", "Meeting Summary"
        DAILY = "daily", "Daily Report"
        PERFORMANCE = "performance", "Performance"
        SUGGESTION = "suggestion", "Suggestion"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name="ai_insights"
    )
    insight_type = models.CharField(max_length=20, choices=InsightType.choices)
    title = models.CharField(max_length=200)
    content = models.TextField()
    source_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
