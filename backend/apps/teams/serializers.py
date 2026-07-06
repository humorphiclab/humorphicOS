from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer


from .models import Team


class ProjectBasicSerializer(serializers.ModelSerializer):
    class Meta:
        from apps.projects.models import Project
        model = Project
        fields = ("id", "title", "slug", "status", "health")

class TeamSerializer(serializers.ModelSerializer):
    project_detail = ProjectBasicSerializer(source="project", read_only=True)
    lead_detail = UserListSerializer(source="lead", read_only=True)
    members_detail = UserListSerializer(source="members", many=True, read_only=True)
    member_count = serializers.IntegerField(source="members.count", read_only=True)

    class Meta:
        model = Team
        fields = (
            "id", "name", "slug", "description", "project", "project_detail",
            "lead", "lead_detail", "members", "members_detail", "member_count",
            "is_active", "is_archived", "created_at",
        )
        read_only_fields = ("created_at",)
