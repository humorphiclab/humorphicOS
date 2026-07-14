from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DepartmentViewSet, DepartmentJoinRequestViewSet

router = DefaultRouter()
router.register("join-requests", DepartmentJoinRequestViewSet, basename="department-join-request")
router.register("", DepartmentViewSet, basename="department")

urlpatterns = [
    path("", include(router.urls)),
]
