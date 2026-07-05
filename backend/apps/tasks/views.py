from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.rbac import RBACMixin

from .models import Task, TaskComment
from .serializers import TaskCommentCreateSerializer, TaskCommentSerializer, TaskSerializer


class TaskViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "tasks"
    rbac_action_map = {
        "comments": "update",
        "status": "update",
        "my_tasks": "read",
        "kanban": "read",
    }
    queryset = Task.objects.select_related(
        "assignee", "assigned_by", "project"
    ).prefetch_related("subtasks", "comments")
    serializer_class = TaskSerializer
    search_fields = ("title", "description")
    filterset_fields = ("status", "priority", "project", "assignee")

    @action(detail=True, methods=["post"])
    def comments(self, request, pk=None):
        task = self.get_object()
        serializer = TaskCommentCreateSerializer(
            data=request.data, context={"request": request, "task": task}
        )
        serializer.is_valid(raise_exception=True)
        comment = serializer.save()
        return Response(TaskCommentSerializer(comment).data, status=201)

    @action(detail=True, methods=["patch"])
    def status(self, request, pk=None):
        task = self.get_object()
        new_status = request.data.get("status")
        if new_status not in dict(Task.Status.choices):
            return Response({"detail": "Invalid status."}, status=400)
        task.status = new_status
        if new_status == Task.Status.DONE:
            task.completed_at = timezone.now()
        task.save()
        return Response(TaskSerializer(task).data)

    @action(detail=False, methods=["get"])
    def my_tasks(self, request):
        tasks = self.queryset.filter(assignee=request.user)
        page = self.paginate_queryset(tasks)
        serializer = self.get_serializer(page or tasks, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def kanban(self, request):
        project_id = request.query_params.get("project")
        qs = self.queryset
        if project_id:
            qs = qs.filter(project_id=project_id)
        board = {}
        for status, label in Task.Status.choices:
            board[status] = TaskSerializer(
                qs.filter(status=status)[:50], many=True
            ).data
        return Response(board)
