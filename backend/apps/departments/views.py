from rest_framework import viewsets

from .models import Department
from .serializers import DepartmentSerializer


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.select_related("head").filter(is_active=True)
    serializer_class = DepartmentSerializer
    search_fields = ("name", "description")
    lookup_field = "slug"
