from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import IsLeadership
from apps.accounts.rbac import RBACMixin

from .models import DailyUpdate
from .serializers import DailyUpdateSerializer


class DailyUpdateViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "daily_updates"
    rbac_action_map = {"compliance": "read", "today": "read"}
    queryset = DailyUpdate.objects.select_related("user", "project")
    serializer_class = DailyUpdateSerializer
    filterset_fields = ("date", "project", "user")
    ordering_fields = ("date", "created_at")

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_superuser and not getattr(
            self.request.user.role, "is_leadership", False
        ):
            qs = qs.filter(user=self.request.user)
        return qs

    @action(detail=False, methods=["get"])
    def today(self, request):
        update = DailyUpdate.objects.filter(user=request.user, date=timezone.now().date()).first()
        if update:
            return Response(DailyUpdateSerializer(update).data)
        return Response(None)

    @action(detail=False, methods=["get"], permission_classes=[IsLeadership])
    def compliance(self, request):
        """Leadership view: members who submitted today's update."""
        from apps.accounts.models import User

        today = timezone.now().date()
        submitted = DailyUpdate.objects.filter(date=today).values_list("user_id", flat=True)
        members = User.objects.filter(is_active=True).exclude(role__slug="guest")
        return Response({
            "date": today,
            "total_members": members.count(),
            "submitted": len(submitted),
            "compliance_rate": round(len(submitted) / members.count() * 100, 1) if members.count() else 0,
            "missing": list(members.exclude(id__in=submitted).values("id", "first_name", "last_name", "email")),
        })
