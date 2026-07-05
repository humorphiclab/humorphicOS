from rest_framework import viewsets

from apps.accounts.rbac import RBACMixin

from .models import Department
from .serializers import DepartmentSerializer


class DepartmentViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "departments"
    queryset = Department.objects.select_related("head").filter(is_active=True)
    serializer_class = DepartmentSerializer
    search_fields = ("name", "description")
    lookup_field = "slug"
