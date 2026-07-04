from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ComponentViewSet, EquipmentViewSet, LabBookingViewSet, MaintenanceRecordViewSet

router = DefaultRouter()
router.register("components", ComponentViewSet, basename="component")
router.register("equipment", EquipmentViewSet, basename="equipment")
router.register("lab-bookings", LabBookingViewSet, basename="lab-booking")
router.register("maintenance", MaintenanceRecordViewSet, basename="maintenance")

urlpatterns = [path("", include(router.urls))]
