from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ChannelViewSet, DirectMessageViewSet

router = DefaultRouter()
router.register("channels", ChannelViewSet, basename="channel")
router.register("direct", DirectMessageViewSet, basename="direct-message")

urlpatterns = [path("", include(router.urls))]
