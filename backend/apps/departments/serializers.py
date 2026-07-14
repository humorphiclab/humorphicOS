from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import Department, DepartmentJoinRequest


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


class DepartmentJoinRequestSerializer(serializers.ModelSerializer):
    user_detail = UserListSerializer(source="user", read_only=True)
    department_detail = DepartmentSerializer(source="department", read_only=True)
    reviewed_by_detail = UserListSerializer(source="reviewed_by", read_only=True)

    class Meta:
        model = DepartmentJoinRequest
        fields = (
            "id",
            "department",
            "department_detail",
            "user",
            "user_detail",
            "status",
            "created_at",
            "updated_at",
            "reviewed_by",
            "reviewed_by_detail",
            "reviewed_at",
        )
        read_only_fields = ("status", "user", "reviewed_by", "reviewed_at")
