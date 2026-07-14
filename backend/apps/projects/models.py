from django.conf import settings
from django.db import models


class Project(models.Model):
    objects = models.Manager()
    phases: models.Manager["ProjectPhase"]

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
            self.completion_percentage = 0  # type: ignore
            self.save(update_fields=["completion_percentage"])
            return

        total_phase_progress = 0.0
        total_phases = phases.count()

        for phase in phases:
            sub_stages = phase.sub_stages.all()
            if not sub_stages.exists():
                phase_progress = 1.0 if phase.is_completed else 0.0
            else:
                total_stage_progress = 0.0
                phase_all_stages_completed = True
                for stage in sub_stages:
                    sub_levels = stage.sub_levels.all()
                    if not sub_levels.exists():
                        stage_progress = 1.0 if stage.is_completed else 0.0
                        stage_completed = stage.is_completed
                    else:
                        sub_levels_count = sub_levels.count()
                        completed_sub_levels = sum(1 for sub in sub_levels if sub.is_completed)
                        stage_progress = completed_sub_levels / sub_levels_count
                        stage_completed = (completed_sub_levels == sub_levels_count)

                    if stage.is_completed != stage_completed:
                        SubStage.objects.filter(pk=stage.pk).update(is_completed=stage_completed)
                        stage.is_completed = stage_completed

                    if not stage_completed:
                        phase_all_stages_completed = False

                    total_stage_progress += stage_progress

                phase_progress = total_stage_progress / sub_stages.count()

                if phase.is_completed != phase_all_stages_completed:
                    ProjectPhase.objects.filter(pk=phase.pk).update(is_completed=phase_all_stages_completed)
                    phase.is_completed = phase_all_stages_completed

            total_phase_progress += phase_progress

        self.completion_percentage = int(round((total_phase_progress / total_phases) * 100))  # type: ignore
        self.save(update_fields=["completion_percentage"])


class ProjectPhase(models.Model):
    objects = models.Manager()
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="phases")
    sub_stages: models.Manager["SubStage"]

    title = models.CharField(max_length=200)
    order = models.PositiveSmallIntegerField(default=0)
    is_completed = models.BooleanField(default=False)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.project.title} - {self.title}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_completed = None
        if not is_new:
            old_instance = ProjectPhase.objects.filter(pk=self.pk).first()
            if old_instance:
                old_completed = old_instance.is_completed

        super().save(*args, **kwargs)

        if old_completed is not None and old_completed != self.is_completed:
            for stage in self.sub_stages.all():
                if stage.is_completed != self.is_completed:
                    stage.is_completed = self.is_completed
                    stage.save()

        self.project.update_progress()

    def delete(self, *args, **kwargs):
        project = self.project
        super().delete(*args, **kwargs)
        project.update_progress()


class SubStage(models.Model):
    objects = models.Manager()
    phase = models.ForeignKey(ProjectPhase, on_delete=models.CASCADE, related_name="sub_stages")
    sub_levels: models.Manager["SubLevel"]

    title = models.CharField(max_length=200)
    order = models.PositiveSmallIntegerField(default=0)
    is_completed = models.BooleanField(default=False)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.phase.title} - {self.title}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_completed = None
        if not is_new:
            old_instance = SubStage.objects.filter(pk=self.pk).first()
            if old_instance:
                old_completed = old_instance.is_completed

        super().save(*args, **kwargs)

        if old_completed is not None and old_completed != self.is_completed:
            for sub in self.sub_levels.all():
                if sub.is_completed != self.is_completed:
                    sub.is_completed = self.is_completed
                    sub.save()

        self.phase.project.update_progress()

    def delete(self, *args, **kwargs):
        project = self.phase.project
        super().delete(*args, **kwargs)
        project.update_progress()


class SubLevel(models.Model):
    objects = models.Manager()
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


class ProjectJoinRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="join_requests"
    )
    team = models.ForeignKey(
        "teams.Team", on_delete=models.CASCADE, null=True, blank=True, related_name="join_requests"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="project_join_requests"
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_project_requests",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("project", "user", "team")

    def __str__(self):
        return f"{self.user.email} -> {self.project.title} ({self.status})"

