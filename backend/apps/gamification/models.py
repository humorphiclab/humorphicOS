from django.conf import settings
from django.db import models


class Badge(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default="star")
    xp_required = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="gamification")
    xp = models.PositiveIntegerField(default=0)
    level = models.PositiveIntegerField(default=1)
    badges = models.ManyToManyField(Badge, blank=True, related_name="holders")
    tasks_completed = models.PositiveIntegerField(default=0)
    updates_submitted = models.PositiveIntegerField(default=0)
    meetings_attended = models.PositiveIntegerField(default=0)

    def add_xp(self, amount):
        self.xp += amount
        self.level = max(1, self.xp // 100 + 1)
        self.save()

    def __str__(self):
        return f"{self.user} - Level {self.level}"


class Achievement(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="achievements")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    xp_awarded = models.PositiveIntegerField(default=10)
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-awarded_at"]

    def __str__(self):
        return f"{self.user} - {self.title}"
