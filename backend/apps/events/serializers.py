from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import Event, EventRegistration


class EventSerializer(serializers.ModelSerializer):
    organizer_detail = UserListSerializer(source="organizer", read_only=True)
    registration_count = serializers.IntegerField(source="registrations.count", read_only=True)

    class Meta:
        model = Event
        fields = (
            "id", "title", "slug", "description", "event_type", "organizer", "organizer_detail",
            "location", "is_online", "meet_link", "start_time", "end_time",
            "max_participants", "is_public", "is_active", "registration_count", "created_at",
        )
        read_only_fields = ("organizer", "created_at")

    def create(self, validated_data):
        validated_data["organizer"] = self.context["request"].user
        return super().create(validated_data)


class EventRegistrationSerializer(serializers.ModelSerializer):
    user_detail = UserListSerializer(source="user", read_only=True)
    event_detail = EventSerializer(source="event", read_only=True)

    class Meta:
        model = EventRegistration
        fields = ("id", "event", "event_detail", "user", "user_detail", "registered_at", "attended", "feedback", "rating")
        read_only_fields = ("user", "registered_at")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
