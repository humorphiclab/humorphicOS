from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ChannelViewSet, DirectMessageViewSet, FriendRequestViewSet

router = DefaultRouter()
router.register("channels", ChannelViewSet, basename="channel")
router.register("direct", DirectMessageViewSet, basename="direct-message")
router.register("friend-requests", FriendRequestViewSet, basename="friend-request")

urlpatterns = [path("", include(router.urls))]

