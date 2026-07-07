from django.conf import settings
from django.db import models


class Task(models.Model):
    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    class Status(models.TextChoices):
        TODO = "todo", "To Do"
        IN_PROGRESS = "in_progress", "In Progress"
        REVIEW = "review", "Review"
        DONE = "done", "Done"
        BLOCKED = "blocked", "Blocked"

    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="tasks", null=True, blank=True
    )
    linked_phase = models.ForeignKey(
        "projects.ProjectPhase", on_delete=models.SET_NULL, related_name="tasks", null=True, blank=True
    )
    linked_sub_stage = models.ForeignKey(
        "projects.SubStage", on_delete=models.SET_NULL, related_name="tasks", null=True, blank=True
    )
    linked_sub_level = models.ForeignKey(
        "projects.SubLevel", on_delete=models.SET_NULL, related_name="tasks", null=True, blank=True
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_tasks"
    )
    assigned_department = models.ForeignKey(
        "departments.Department", on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_tasks"
    )
    assigned_team = models.ForeignKey(
        "teams.Team", on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_tasks"
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_tasks"
    )
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TODO)
    due_date = models.DateField(null=True, blank=True)
    checklist = models.JSONField(default=list, blank=True)
    hours_logged = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    is_recurring = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-priority", "due_date", "-created_at"]

    def __str__(self):
        return self.title


class Subtask(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="subtasks")
    title = models.CharField(max_length=300)
    is_completed = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title


class TaskComment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment on {self.task.title} by {self.author}"


class TaskAttachment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="tasks/attachments/")
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Attachment for {self.task.title}"
