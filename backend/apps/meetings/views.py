from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ...apps.accounts.permissions import IsLeadership
from ...apps.accounts.rbac import RBACMixin

from .models import Meeting, MeetingAttendance
from .serializers import MeetingAttendanceSerializer, MeetingSerializer


class MeetingViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "meetings"
    rbac_action_map = {"attendance": "update", "upcoming": "read"}
    queryset = Meeting.objects.select_related("organizer", "department").prefetch_related(
        "participants", "attendance_records"
    )
    serializer_class = MeetingSerializer
    search_fields = ("title", "agenda")
    filterset_fields = ("department", "team", "organizer")
    ordering_fields = ("start_time",)

    @action(detail=True, methods=["post"])
    def attendance(self, request, pk=None):
        meeting = self.get_object()
        user_id = request.data.get("user")
        status = request.data.get("status", MeetingAttendance.Status.PRESENT)
        record, _ = MeetingAttendance.objects.update_or_create(
            meeting=meeting,
            user_id=user_id or request.user.id,
            defaults={"status": status},
        )
        return Response(MeetingAttendanceSerializer(record).data)

    @action(detail=False, methods=["get"])
    def upcoming(self, request):
        from django.utils import timezone

        meetings = self.queryset.filter(start_time__gte=timezone.now()).order_by("start_time")[:10]
        return Response(MeetingSerializer(meetings, many=True).data)
