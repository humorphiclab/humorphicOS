from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import Department


class DepartmentSerializer(serializers.ModelSerializer):
    head_detail = UserListSerializer(source="head", read_only=True)
    members_detail = UserListSerializer(source="members", many=True, read_only=True)
    member_count = serializers.IntegerField(source="members.count", read_only=True)

    class Meta:
        model = Department
        fields = (
            "id", "name", "slug", "description", "head", "head_detail",
            "members", "members_detail",
            "color", "is_active", "member_count", "created_at",
        )
        read_only_fields = ("created_at",)
