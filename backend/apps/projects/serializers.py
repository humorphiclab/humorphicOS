from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer
from apps.departments.serializers import DepartmentSerializer
from apps.teams.serializers import TeamSerializer

from .models import Project, ProjectPhase, SubStage, SubLevel


class LinkedTaskSummarySerializer(serializers.Serializer):
    """Lightweight task summary to embed inside phase hierarchy nodes."""
    id = serializers.IntegerField()
    title = serializers.CharField()
    status = serializers.CharField()
    priority = serializers.CharField()
    due_date = serializers.DateField(allow_null=True)
    assignee_detail = UserListSerializer(source="assignee", read_only=True)



class SubLevelSerializer(serializers.ModelSerializer):
    tasks = LinkedTaskSummarySerializer(many=True, read_only=True)

    class Meta:
        model = SubLevel
        fields = (
            "id", "sub_stage", "title", "order", "is_completed", "tasks",
        )


class SubStageSerializer(serializers.ModelSerializer):
    sub_levels = SubLevelSerializer(many=True, read_only=True)
    tasks = LinkedTaskSummarySerializer(many=True, read_only=True)

    class Meta:
        model = SubStage
        fields = (
            "id", "phase", "title", "order", "is_completed", "sub_levels", "tasks",
        )


class ProjectPhaseSerializer(serializers.ModelSerializer):
    sub_stages = SubStageSerializer(many=True, read_only=True)
    tasks = LinkedTaskSummarySerializer(many=True, read_only=True)

    class Meta:
        model = ProjectPhase
        fields = (
            "id", "project", "title", "order", "is_completed", "sub_stages", "tasks",
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
    phases = ProjectPhaseSerializer(many=True, read_only=True)
    teams_detail = TeamSerializer(source="teams", many=True, read_only=True)
    department_detail = DepartmentSerializer(source="department", read_only=True)
    members_detail = UserListSerializer(source="members", many=True, read_only=True)

    class Meta(ProjectListSerializer.Meta):
        fields = ProjectListSerializer.Meta.fields + (
            "description", "teams_detail", "department", "department_detail",
            "members", "members_detail", "phases", "updated_at",
        )
