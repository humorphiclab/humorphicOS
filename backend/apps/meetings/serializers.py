from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import Meeting, MeetingAttendance


class MeetingAttendanceSerializer(serializers.ModelSerializer):
    user_detail = UserListSerializer(source="user", read_only=True)

    class Meta:
        model = MeetingAttendance
        fields = ("id", "user", "user_detail", "status", "joined_at", "notes")


class MeetingSerializer(serializers.ModelSerializer):
    organizer_detail = UserListSerializer(source="organizer", read_only=True)
    participants_detail = UserListSerializer(source="participants", many=True, read_only=True)
    attendance_records = MeetingAttendanceSerializer(many=True, read_only=True)

    class Meta:
        model = Meeting
        fields = (
            "id", "title", "description", "agenda", "meet_link", "recording_link",
            "location", "organizer", "organizer_detail", "participants", "participants_detail",
            "department", "start_time", "end_time", "minutes", "action_items",
            "ai_summary", "attendance_records", "created_at",
        )
        read_only_fields = ("organizer", "ai_summary", "created_at")

    def create(self, validated_data):
        participants = validated_data.pop("participants", [])
        validated_data["organizer"] = self.context["request"].user
        meeting = super().create(validated_data)
        if participants:
            meeting.participants.set(participants)
        else:
            meeting.participants.add(self.context["request"].user)
        return meeting
