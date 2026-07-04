from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import Department


class DepartmentSerializer(serializers.ModelSerializer):
    head_detail = UserListSerializer(source="head", read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = (
            "id", "name", "slug", "description", "head", "head_detail",
            "color", "is_active", "member_count", "created_at",
        )
        read_only_fields = ("created_at",)

    def get_member_count(self, obj):
        return obj.teams.values("members").distinct().count() if hasattr(obj, "teams") else 0
