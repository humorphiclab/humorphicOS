from django.conf import settings
from django.db import models


class Event(models.Model):
    class EventType(models.TextChoices):
        WORKSHOP = "workshop", "Workshop"
        HACKATHON = "hackathon", "Hackathon"
        SEMINAR = "seminar", "Seminar"
        COMPETITION = "competition", "Competition"
        MEETUP = "meetup", "Meetup"
        OTHER = "other", "Other"

    title = models.CharField(max_length=300)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    organizer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="organized_events")
    location = models.CharField(max_length=300, blank=True)
    is_online = models.BooleanField(default=False)
    meet_link = models.URLField(blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    max_participants = models.PositiveIntegerField(null=True, blank=True)
    is_public = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_time"]

    def __str__(self):
        return self.title


class EventRegistration(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="registrations")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="event_registrations")
    registered_at = models.DateTimeField(auto_now_add=True)
    attended = models.BooleanField(default=False)
    feedback = models.TextField(blank=True)
    rating = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        unique_together = ("event", "user")

    def __str__(self):
        return f"{self.user} -> {self.event.title}"
