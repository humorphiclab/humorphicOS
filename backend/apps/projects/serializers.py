from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer
from apps.departments.serializers import DepartmentSerializer
from apps.teams.serializers import TeamSerializer

from .models import Milestone, Project


class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = (
            "id", "title", "description", "due_date",
            "is_completed", "completed_at", "order",
        )


class ProjectListSerializer(serializers.ModelSerializer):
    owner_detail = UserListSerializer(source="owner", read_only=True)
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            "id", "title", "slug", "status", "health", "completion_percentage",
            "start_date", "end_date", "owner", "owner_detail", "task_count", "created_at",
        )

    def get_task_count(self, obj):
        return obj.tasks.count() if hasattr(obj, "tasks") else 0


class ProjectDetailSerializer(ProjectListSerializer):
    milestones = MilestoneSerializer(many=True, read_only=True)
    team_detail = TeamSerializer(source="team", read_only=True)
    department_detail = DepartmentSerializer(source="department", read_only=True)
    members_detail = UserListSerializer(source="members", many=True, read_only=True)

    class Meta(ProjectListSerializer.Meta):
        fields = ProjectListSerializer.Meta.fields + (
            "description", "team", "team_detail", "department", "department_detail",
            "members", "members_detail", "milestones", "updated_at",
        )
