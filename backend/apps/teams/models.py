from django.conf import settings
from django.db import models


class Team(models.Model):
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=150, unique=True)
    description = models.TextField(blank=True)
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="teams",
        null=True,
        blank=True,
    )
    lead = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="led_teams",
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="teams",
        blank=True,
    )
    is_active = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
