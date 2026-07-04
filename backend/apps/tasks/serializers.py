from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer
from apps.projects.serializers import ProjectListSerializer

from .models import Subtask, Task, TaskComment


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


class TaskSerializer(serializers.ModelSerializer):
    assignee_detail = UserListSerializer(source="assignee", read_only=True)
    assigned_by_detail = UserListSerializer(source="assigned_by", read_only=True)
    project_detail = ProjectListSerializer(source="project", read_only=True)
    subtasks = SubtaskSerializer(many=True, read_only=True)
    comments = TaskCommentSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = (
            "id", "title", "description", "project", "project_detail",
            "assignee", "assignee_detail", "assigned_by", "assigned_by_detail",
            "priority", "status", "due_date", "checklist", "hours_logged",
            "is_recurring", "subtasks", "comments", "created_at", "updated_at", "completed_at",
        )
        read_only_fields = ("assigned_by", "created_at", "updated_at", "completed_at")

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
