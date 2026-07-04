from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer
from apps.departments.serializers import DepartmentSerializer

from .models import Team


class TeamSerializer(serializers.ModelSerializer):
    department_detail = DepartmentSerializer(source="department", read_only=True)
    lead_detail = UserListSerializer(source="lead", read_only=True)
    members_detail = UserListSerializer(source="members", many=True, read_only=True)
    member_count = serializers.IntegerField(source="members.count", read_only=True)

    class Meta:
        model = Team
        fields = (
            "id", "name", "slug", "description", "department", "department_detail",
            "lead", "lead_detail", "members", "members_detail", "member_count",
            "is_active", "is_archived", "created_at",
        )
        read_only_fields = ("created_at",)
