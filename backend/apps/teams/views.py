from rest_framework import viewsets

from .models import Team
from .serializers import TeamSerializer


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.select_related("department", "lead").prefetch_related("members")
    serializer_class = TeamSerializer
    search_fields = ("name", "description")
    filterset_fields = ("department", "is_active", "is_archived")
    lookup_field = "slug"
