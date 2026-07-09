from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

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

    @action(detail=True, methods=['post'])
    def remove_member(self, request, slug=None):
        project = self.get_object()
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"detail": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Remove from explicit project members
        project.members.remove(user_id)
        
        # Remove from all teams in this project
        for team in project.teams.all():
            if team.lead_id == user_id:
                team.lead = None
                team.save(update_fields=['lead'])
            team.members.remove(user_id)
            
        return Response({"detail": "Member removed from project and all its sub-teams."})


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
