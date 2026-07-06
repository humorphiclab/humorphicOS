from rest_framework import viewsets

from apps.accounts.rbac import RBACMixin

from .models import Project, ProjectPhase, SubStage, SubLevel
from .serializers import (
    ProjectDetailSerializer,
    ProjectListSerializer,
    ProjectPhaseSerializer,
    SubLevelSerializer,
    SubStageSerializer,
)


class ProjectViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "projects"
    queryset = Project.objects.select_related("owner", "department").prefetch_related(
        "phases__sub_stages__sub_levels", "members"
    )
    search_fields = ("title", "description")
    filterset_fields = ("status", "health", "department")
    lookup_field = "slug"

    def get_serializer_class(self):
        if self.action == "list":
            return ProjectListSerializer
        return ProjectDetailSerializer


class ProjectPhaseViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "projects"
    queryset = ProjectPhase.objects.all()
    serializer_class = ProjectPhaseSerializer


class SubStageViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "projects"
    queryset = SubStage.objects.all()
    serializer_class = SubStageSerializer


class SubLevelViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "projects"
    queryset = SubLevel.objects.all()
    serializer_class = SubLevelSerializer
