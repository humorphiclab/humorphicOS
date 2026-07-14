from rest_framework import serializers

from ..accounts.serializers import UserListSerializer
from ..departments.serializers import DepartmentSerializer
from ..teams.serializers import TeamSerializer

from .models import Project, ProjectPhase, SubStage, SubLevel, ProjectJoinRequest


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
    members = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            "id", "title", "slug", "status", "health", "completion_percentage",
            "start_date", "end_date", "owner", "owner_detail", "task_count", "members", "created_at",
        )

    def get_task_count(self, obj):
        return obj.tasks.count() if hasattr(obj, "tasks") else 0
        
    def get_members(self, obj):
        # Collect all user IDs involved in the project (owner, explicit members, team leads, team members)
        user_ids = set()
        if obj.owner_id:
            user_ids.add(obj.owner_id)
            
        for member in obj.members.all():
            user_ids.add(member.id)
            
        for team in obj.teams.prefetch_related('members'):
            if team.lead_id:
                user_ids.add(team.lead_id)
            for tm in team.members.all():
                user_ids.add(tm.id)
                
        return list(user_ids)


class ProjectDetailSerializer(serializers.ModelSerializer):
    owner_detail = UserListSerializer(source="owner", read_only=True)
    task_count = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    phases = ProjectPhaseSerializer(many=True, read_only=True)
    teams_detail = TeamSerializer(source="teams", many=True, read_only=True)
    department_detail = DepartmentSerializer(source="department", read_only=True)
    members_detail = UserListSerializer(source="members", many=True, read_only=True)

    class Meta:
        model = Project
        fields = (
            "id",
            "title",
            "slug",
            "status",
            "health",
            "completion_percentage",
            "start_date",
            "end_date",
            "owner",
            "owner_detail",
            "task_count",
            "members",
            "created_at",
            "description",
            "teams_detail",
            "department",
            "department_detail",
            "members_detail",
            "phases",
            "updated_at",
        )

    def get_task_count(self, obj):
        return obj.tasks.count() if hasattr(obj, "tasks") else 0
        
    def get_members(self, obj):
        user_ids = set()
        if obj.owner_id:
            user_ids.add(obj.owner_id)
            
        for member in obj.members.all():
            user_ids.add(member.id)
            
        for team in obj.teams.prefetch_related('members'):
            if team.lead_id:
                user_ids.add(team.lead_id)
            for tm in team.members.all():
                user_ids.add(tm.id)
                
        return list(user_ids)


class ProjectJoinRequestSerializer(serializers.ModelSerializer):
    user_detail = UserListSerializer(source="user", read_only=True)
    project_detail = ProjectListSerializer(source="project", read_only=True)
    reviewed_by_detail = UserListSerializer(source="reviewed_by", read_only=True)
    team_detail = TeamSerializer(source="team", read_only=True)

    class Meta:
        model = ProjectJoinRequest
        fields = (
            "id",
            "project",
            "project_detail",
            "team",
            "team_detail",
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



