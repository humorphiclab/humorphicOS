from rest_framework import viewsets

from apps.accounts.rbac import RBACMixin

from .models import Announcement
from .serializers import AnnouncementSerializer


class AnnouncementViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "announcements"
    queryset = Announcement.objects.select_related("author", "department").filter(is_active=True)
    serializer_class = AnnouncementSerializer
    search_fields = ("title", "content")
    filterset_fields = ("priority", "department", "is_pinned")
