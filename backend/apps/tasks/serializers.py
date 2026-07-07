from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer
from apps.projects.serializers import ProjectListSerializer

from .models import Subtask, Task, TaskComment, TaskAttachment


class SubtaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subtask
        fields = ("id", "title", "is_completed", "order")


class TaskCommentSerializer(serializers.ModelSerializer):
    author_detail = UserListSerializer(source="author", read_only=True)

    class Meta:
        model = TaskComment
        fields = ("id", "author", "author_detail", "content", "created_at")
        read_only_fields = ("author", "created_at")


class TaskAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_detail = UserListSerializer(source="uploaded_by", read_only=True)

    class Meta:
        model = TaskAttachment
        fields = ("id", "file", "uploaded_by", "uploaded_by_detail", "created_at")
        read_only_fields = ("uploaded_by", "created_at")


class TaskSerializer(serializers.ModelSerializer):
    assignee_detail = UserListSerializer(source="assignee", read_only=True)
    assigned_by_detail = UserListSerializer(source="assigned_by", read_only=True)
    project_detail = ProjectListSerializer(source="project", read_only=True)
    subtasks = SubtaskSerializer(many=True, read_only=True)
    comments = TaskCommentSerializer(many=True, read_only=True)
    attachments = TaskAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = (
            "id", "title", "description", "project", "project_detail",
            "linked_phase", "linked_sub_stage", "linked_sub_level",
            "assignee", "assignee_detail", "assigned_department", "assigned_team",
            "assigned_by", "assigned_by_detail",
            "priority", "status", "due_date", "checklist", "hours_logged",
            "is_recurring", "subtasks", "comments", "attachments", "created_at", "updated_at", "completed_at",
        )
        read_only_fields = ("assigned_by", "created_at", "updated_at", "completed_at")

    def validate(self, data):
        user = self.context["request"].user
        assignee = data.get("assignee")
        assigned_team = data.get("assigned_team")
        assigned_department = data.get("assigned_department")

        if user.is_superuser or getattr(user.role, "slug", "") in ["super_admin", "president", "vice_president"]:
            return data

        if getattr(user.role, "slug", "") == "team_lead":
            if assigned_department:
                raise serializers.ValidationError({"assigned_department": "Team Leads cannot assign tasks to a department."})
            if assigned_team:
                if not user.managed_teams.filter(id=assigned_team.id).exists():
                    raise serializers.ValidationError({"assigned_team": "You can only assign tasks to a team you lead."})
            if assignee:
                if assignee != user and not assignee.teams.filter(lead=user).exists():
                    raise serializers.ValidationError({"assignee": "You can only assign tasks to members of your team."})
            return data

        if getattr(user.role, "slug", "") == "department_head":
            if assigned_department:
                if not user.managed_departments.filter(id=assigned_department.id).exists():
                    raise serializers.ValidationError({"assigned_department": "You can only assign tasks to a department you head."})
            if assignee:
                if assignee != user and not assignee.departments.filter(head=user).exists():
                    raise serializers.ValidationError({"assignee": "You can only assign tasks to members of your department."})
            return data

        # General members
        if assigned_department or assigned_team:
            raise serializers.ValidationError("You do not have permission to assign tasks to a group.")
        if assignee and assignee != user:
            raise serializers.ValidationError({"assignee": "You can only assign tasks to yourself."})

        return data

    def create(self, validated_data):
        validated_data["assigned_by"] = self.context["request"].user
        return super().create(validated_data)


class TaskCommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskComment
        fields = ("content",)

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        validated_data["task"] = self.context["task"]
        return super().create(validated_data)
