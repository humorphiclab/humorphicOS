from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.rbac import RBACMixin

from .models import Department
from .serializers import DepartmentSerializer


class DepartmentViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "departments"
    queryset = Department.objects.select_related("head").prefetch_related("members").filter(is_active=True)
    serializer_class = DepartmentSerializer
    search_fields = ("name", "description")
    lookup_field = "slug"

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def join(self, request, slug=None):
        """Allow any authenticated user to request joining a department (auto-add for now)."""
        dept = self.get_object()
        dept.members.add(request.user)
        return Response({"status": "joined"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def leave(self, request, slug=None):
        """Allow a member to leave a department."""
        dept = self.get_object()
        dept.members.remove(request.user)
        return Response({"status": "left"}, status=status.HTTP_200_OK)
