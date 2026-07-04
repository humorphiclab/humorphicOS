from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AttendanceRecordViewSet, HolidayViewSet, LeaveRequestViewSet

router = DefaultRouter()
router.register("records", AttendanceRecordViewSet, basename="attendance-record")
router.register("holidays", HolidayViewSet, basename="holiday")
router.register("leaves", LeaveRequestViewSet, basename="leave")

urlpatterns = [path("", include(router.urls))]
