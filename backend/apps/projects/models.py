from django.conf import settings
from django.db import models


class Project(models.Model):
    class Status(models.TextChoices):
        PLANNING = "planning", "Planning"
        ACTIVE = "active", "Active"
        ON_HOLD = "on_hold", "On Hold"
        COMPLETED = "completed", "Completed"
        ARCHIVED = "archived", "Archived"

    class Health(models.TextChoices):
        ON_TRACK = "on_track", "On Track"
        AT_RISK = "at_risk", "At Risk"
        OFF_TRACK = "off_track", "Off Track"

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    team = models.ForeignKey(
        "teams.Team", on_delete=models.CASCADE, related_name="projects", null=True, blank=True
    )
    department = models.ForeignKey(
        "departments.Department", on_delete=models.SET_NULL, null=True, blank=True, related_name="projects"
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="owned_projects"
    )
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="projects", blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLANNING)
    health = models.CharField(max_length=20, choices=Health.choices, default=Health.ON_TRACK)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    completion_percentage = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Milestone(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="milestones")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "due_date"]

    def __str__(self):
        return f"{self.project.title} - {self.title}"
