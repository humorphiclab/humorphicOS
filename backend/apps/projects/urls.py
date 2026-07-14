from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ProjectViewSet, ProjectPhaseViewSet, SubStageViewSet, SubLevelViewSet, ProjectJoinRequestViewSet

router = DefaultRouter()
router.register("phases", ProjectPhaseViewSet, basename="project-phase")
router.register("substages", SubStageViewSet, basename="sub-stage")
router.register("sublevels", SubLevelViewSet, basename="sub-level")
router.register("join-requests", ProjectJoinRequestViewSet, basename="project-join-request")
router.register("", ProjectViewSet, basename="project")

urlpatterns = [
    path("", include(router.urls)),
]
