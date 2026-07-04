from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import DailyUpdate


class DailyUpdateSerializer(serializers.ModelSerializer):
    user_detail = UserListSerializer(source="user", read_only=True)

    class Meta:
        model = DailyUpdate
        fields = (
            "id", "user", "user_detail", "date", "work_done", "hours_worked",
            "challenges", "learning", "tomorrow_plan", "need_help",
            "github_link", "drive_link", "ai_summary", "project",
            "created_at", "updated_at",
        )
        read_only_fields = ("user", "ai_summary", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
