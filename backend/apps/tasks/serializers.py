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
    assigned_team_detail = serializers.SerializerMethodField()
    assigned_department_detail = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = (
            "id", "title", "description", "project", "project_detail",
            "linked_phase", "linked_sub_stage", "linked_sub_level",
            "assignee", "assignee_detail", "assigned_department", "assigned_department_detail",
            "assigned_team", "assigned_team_detail", "assigned_by", "assigned_by_detail",
            "priority", "status", "due_date", "checklist", "hours_logged",
            "is_recurring", "subtasks", "comments", "attachments", "created_at", "updated_at", "completed_at",
        )
        read_only_fields = ("assigned_by", "created_at", "updated_at", "completed_at")

    def get_assigned_team_detail(self, obj):
        if obj.assigned_team:
            return {
                "id": obj.assigned_team.id,
                "name": obj.assigned_team.name,
                "lead": obj.assigned_team.lead.id if obj.assigned_team.lead else None
            }
        return None

    def get_assigned_department_detail(self, obj):
        if obj.assigned_department:
            return {
                "id": obj.assigned_department.id,
                "name": obj.assigned_department.name,
                "head": obj.assigned_department.head.id if obj.assigned_department.head else None
            }
        return None

    def validate(self, data):
        user = self.context["request"].user
        assignee = data.get("assignee")
        assigned_team = data.get("assigned_team")
        assigned_department = data.get("assigned_department")

        if user.is_superuser or getattr(user.role, "slug", "") in ["founder", "super_admin", "president", "vice_president", "faculty"]:
            return data

        is_dept_head = user.headed_departments.exists()
        is_team_lead = getattr(user.role, "slug", "") == "team_lead" or user.led_teams.exists()

        if is_dept_head:
            if assigned_department:
                if not user.headed_departments.filter(id=assigned_department.id).exists():
                    raise serializers.ValidationError({"assigned_department": "You can only assign tasks to a department you head."})
            if assigned_team:
                is_valid_team = (
                    user.led_teams.filter(id=assigned_team.id).exists() or
                    (assigned_team.project and assigned_team.project.department and assigned_team.project.department.head == user)
                )
                if not is_valid_team:
                    raise serializers.ValidationError({"assigned_team": "You can only assign tasks to teams in your department or teams you lead."})
            if assignee:
                is_valid_assignee = (
                    assignee == user or
                    assignee.departments.filter(head=user).exists() or
                    assignee.teams.filter(lead=user).exists()
                )
                if not is_valid_assignee:
                    raise serializers.ValidationError({"assignee": "You can only assign tasks to members of your department or team."})
            return data

        elif is_team_lead:
            if assigned_department:
                raise serializers.ValidationError({"assigned_department": "Team Leads cannot assign tasks to a department."})
            if assigned_team:
                if not user.led_teams.filter(id=assigned_team.id).exists():
                    raise serializers.ValidationError({"assigned_team": "You can only assign tasks to a team you lead."})
            if assignee:
                if assignee != user and not assignee.teams.filter(lead=user).exists():
                    raise serializers.ValidationError({"assignee": "You can only assign tasks to members of your team."})
            return data

        # General members
        if assigned_department or assigned_team:
            raise serializers.ValidationError("You do not have permission to assign tasks to a group.")
        if assignee and assignee != user:
            raise serializers.ValidationError({"assignee": "You can only assign tasks to yourself."})

        return data

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["assigned_by"] = user
        # Auto-assign to the requesting user if they are a general member and no assignee is set
        if not validated_data.get("assignee") and not validated_data.get("assigned_team") and not validated_data.get("assigned_department"):
            if not user.is_superuser and getattr(user.role, "slug", "") not in ["super_admin", "president", "vice_president", "faculty"]:
                validated_data["assignee"] = user
                
        task = super().create(validated_data)
        
        # Notify the assignee if it's someone else
        assignee = task.assignee
        if assignee and assignee != user:
            from apps.notifications.services import send_notification_to_user
            send_notification_to_user(
                user=assignee,
                pref_key="task_assigned",
                title="New Task Assigned",
                message=f"You have been assigned a new task: {task.title}",
                link="/tasks",
                priority="high"
            )
            
        # Notify team or department if assigned to a group (optional, but good for completeness)
        if task.assigned_team:
            from apps.notifications.services import send_notification_to_user
            for member in task.assigned_team.members.all():
                if member != user:
                    send_notification_to_user(
                        user=member,
                        pref_key="task_assigned",
                        title="New Team Task Assigned",
                        message=f"Your team '{task.assigned_team.name}' has been assigned a new task: {task.title}",
                        link="/tasks",
                        priority="normal"
                    )
                    
        if task.assigned_department:
            from apps.notifications.services import send_notification_to_user
            # For department, we might notify department head or all members. Let's notify the head for now.
            head = task.assigned_department.head
            if head and head != user:
                send_notification_to_user(
                    user=head,
                    pref_key="task_assigned",
                    title="New Department Task Assigned",
                    message=f"Your department '{task.assigned_department.name}' has been assigned a new task: {task.title}",
                    link="/tasks",
                    priority="normal"
                )
                
        return task


class TaskCommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskComment
        fields = ("content",)

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        validated_data["task"] = self.context["task"]
        return super().create(validated_data)
