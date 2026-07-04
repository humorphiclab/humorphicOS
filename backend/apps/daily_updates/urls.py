from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DailyUpdateViewSet

router = DefaultRouter()
router.register("", DailyUpdateViewSet, basename="daily-update")

urlpatterns = [
    path("", include(router.urls)),
]
