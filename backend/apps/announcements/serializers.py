from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import Announcement


class AnnouncementSerializer(serializers.ModelSerializer):
    author_detail = UserListSerializer(source="author", read_only=True)

    class Meta:
        model = Announcement
        fields = (
            "id", "title", "content", "priority", "author", "author_detail",
            "department", "is_pinned", "is_active", "scheduled_at", "expires_at", "created_at",
        )
        read_only_fields = ("author", "created_at")

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)
