from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.rbac import RBACMixin

from .models import Component, Equipment, LabBooking, MaintenanceRecord
from .serializers import (
    ComponentSerializer, EquipmentSerializer, LabBookingSerializer, MaintenanceRecordSerializer,
)


class ComponentViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "inventory"
    rbac_action_map = {"low_stock": "read"}
    queryset = Component.objects.filter(is_active=True)
    serializer_class = ComponentSerializer
    search_fields = ("name", "sku", "description")
    filterset_fields = ("category",)

    @action(detail=False, methods=["get"])
    def low_stock(self, request):
        items = [c for c in self.queryset if c.is_low_stock]
        return Response(ComponentSerializer(items, many=True).data)


class EquipmentViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "inventory"
    queryset = Equipment.objects.select_related("assigned_to")
    serializer_class = EquipmentSerializer
    search_fields = ("name", "serial_number")
    filterset_fields = ("status",)


class LabBookingViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "inventory"
    queryset = LabBooking.objects.select_related("booked_by").prefetch_related("equipment")
    serializer_class = LabBookingSerializer
    filterset_fields = ("status", "lab_name")


class MaintenanceRecordViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "inventory"
    queryset = MaintenanceRecord.objects.select_related("equipment")
    serializer_class = MaintenanceRecordSerializer
    filterset_fields = ("equipment",)
