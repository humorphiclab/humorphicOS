from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.rbac import RBACMixin
from apps.accounts.permissions import IsVicePresidentOrAbove

from .models import Team
from .serializers import TeamSerializer


class TeamViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "teams"
    permission_classes = [IsAuthenticated, IsVicePresidentOrAbove]
    queryset = Team.objects.select_related("project", "lead").prefetch_related("members")
    serializer_class = TeamSerializer
    search_fields = ("name", "description")
    filterset_fields = ("project", "is_active", "is_archived")
    lookup_field = "slug"

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def join(self, request, slug=None):
        """Allow any authenticated user to join a team."""
        team = self.get_object()
        team.members.add(request.user)
        return Response({"status": "joined"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def leave(self, request, slug=None):
        """Allow a member to leave a team."""
        team = self.get_object()
        team.members.remove(request.user)
        return Response({"status": "left"}, status=status.HTTP_200_OK)
