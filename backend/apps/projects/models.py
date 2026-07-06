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

    def update_progress(self):
        phases = self.phases.prefetch_related("sub_stages__sub_levels").all()
        if not phases.exists():
            self.completion_percentage = 0
            self.save(update_fields=["completion_percentage"])
            return

        total_sub_levels = 0
        completed_sub_levels = 0

        total_sub_stages = 0
        completed_sub_stages = 0

        total_phases = phases.count()
        completed_phases = 0

        for phase in phases:
            sub_stages = phase.sub_stages.all()
            total_sub_stages += sub_stages.count()
            
            phase_completed = True if sub_stages.exists() or phase.is_completed else False
            
            for stage in sub_stages:
                sub_levels = stage.sub_levels.all()
                total_sub_levels += sub_levels.count()
                
                stage_completed = True if sub_levels.exists() or stage.is_completed else False
                
                for sublevel in sub_levels:
                    if sublevel.is_completed:
                        completed_sub_levels += 1
                    else:
                        stage_completed = False
                
                if stage_completed:
                    completed_sub_stages += 1
                else:
                    phase_completed = False
            
            if phase_completed or (not sub_stages.exists() and phase.is_completed):
                completed_phases += 1

        if total_sub_levels > 0:
            self.completion_percentage = int((completed_sub_levels / total_sub_levels) * 100)
        elif total_sub_stages > 0:
            self.completion_percentage = int((completed_sub_stages / total_sub_stages) * 100)
        else:
            self.completion_percentage = int((completed_phases / total_phases) * 100)

        self.save(update_fields=["completion_percentage"])


class ProjectPhase(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="phases")
    title = models.CharField(max_length=200)
    order = models.PositiveSmallIntegerField(default=0)
    is_completed = models.BooleanField(default=False)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.project.title} - {self.title}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.project.update_progress()

    def delete(self, *args, **kwargs):
        project = self.project
        super().delete(*args, **kwargs)
        project.update_progress()


class SubStage(models.Model):
    phase = models.ForeignKey(ProjectPhase, on_delete=models.CASCADE, related_name="sub_stages")
    title = models.CharField(max_length=200)
    order = models.PositiveSmallIntegerField(default=0)
    is_completed = models.BooleanField(default=False)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.phase.title} - {self.title}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.phase.project.update_progress()

    def delete(self, *args, **kwargs):
        project = self.phase.project
        super().delete(*args, **kwargs)
        project.update_progress()


class SubLevel(models.Model):
    sub_stage = models.ForeignKey(SubStage, on_delete=models.CASCADE, related_name="sub_levels")
    title = models.CharField(max_length=200)
    order = models.PositiveSmallIntegerField(default=0)
    is_completed = models.BooleanField(default=False)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.sub_stage.title} - {self.title}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.sub_stage.phase.project.update_progress()

    def delete(self, *args, **kwargs):
        project = self.sub_stage.phase.project
        super().delete(*args, **kwargs)
        project.update_progress()
