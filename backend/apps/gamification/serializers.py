from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import Achievement, Badge, UserProfile


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = "__all__"


class UserProfileSerializer(serializers.ModelSerializer):
    user_detail = UserListSerializer(source="user", read_only=True)
    badges_detail = BadgeSerializer(source="badges", many=True, read_only=True)

    class Meta:
        model = UserProfile
        fields = (
            "id", "user", "user_detail", "xp", "level", "badges", "badges_detail",
            "tasks_completed", "updates_submitted", "meetings_attended",
        )


class AchievementSerializer(serializers.ModelSerializer):
    user_detail = UserListSerializer(source="user", read_only=True)

    class Meta:
        model = Achievement
        fields = ("id", "user", "user_detail", "title", "description", "xp_awarded", "awarded_at")
