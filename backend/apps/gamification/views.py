from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Achievement, Badge, UserProfile
from .serializers import AchievementSerializer, BadgeSerializer, UserProfileSerializer


class BadgeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Badge.objects.all()
    serializer_class = BadgeSerializer


class UserProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UserProfile.objects.select_related("user").prefetch_related("badges")
    serializer_class = UserProfileSerializer

    @action(detail=False, methods=["get"])
    def me(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response(UserProfileSerializer(profile).data)

    @action(detail=False, methods=["get"])
    def leaderboard(self, request):
        profiles = UserProfile.objects.select_related("user").order_by("-xp")[:20]
        return Response(UserProfileSerializer(profiles, many=True).data)


class AchievementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Achievement.objects.select_related("user")
    serializer_class = AchievementSerializer
    filterset_fields = ("user",)
