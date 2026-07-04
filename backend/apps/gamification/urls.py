from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AchievementViewSet, BadgeViewSet, UserProfileViewSet

router = DefaultRouter()
router.register("badges", BadgeViewSet, basename="badge")
router.register("profiles", UserProfileViewSet, basename="profile")
router.register("achievements", AchievementViewSet, basename="achievement")

urlpatterns = [path("", include(router.urls))]
