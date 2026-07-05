from rest_framework import viewsets

from apps.accounts.rbac import RBACMixin

from .models import Team
from .serializers import TeamSerializer


class TeamViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "teams"
    queryset = Team.objects.select_related("department", "lead").prefetch_related("members")
    serializer_class = TeamSerializer
    search_fields = ("name", "description")
    filterset_fields = ("department", "is_active", "is_archived")
    lookup_field = "slug"
