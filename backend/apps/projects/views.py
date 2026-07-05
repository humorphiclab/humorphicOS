from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.rbac import RBACMixin

from .models import Milestone, Project
from .serializers import MilestoneSerializer, ProjectDetailSerializer, ProjectListSerializer


class ProjectViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "projects"
    queryset = Project.objects.select_related("owner", "team", "department").prefetch_related(
        "milestones", "members"
    )
    search_fields = ("title", "description")
    filterset_fields = ("status", "health", "department", "team")
    lookup_field = "slug"

    def get_serializer_class(self):
        if self.action == "list":
            return ProjectListSerializer
        return ProjectDetailSerializer

    @action(detail=True, methods=["get", "post"])
    def milestones(self, request, slug=None):
        project = self.get_object()
        if request.method == "GET":
            return Response(MilestoneSerializer(project.milestones.all(), many=True).data)
        serializer = MilestoneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(project=project)
        return Response(serializer.data, status=201)
