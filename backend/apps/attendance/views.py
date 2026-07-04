import secrets
from datetime import date

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import IsLeadership

from .models import AttendanceRecord, Holiday, LeaveRequest
from .serializers import AttendanceRecordSerializer, HolidaySerializer, LeaveRequestSerializer


class HolidayViewSet(viewsets.ModelViewSet):
    queryset = Holiday.objects.all()
    serializer_class = HolidaySerializer


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceRecordSerializer
    filterset_fields = ("date", "status", "user", "method")

    def get_queryset(self):
        qs = AttendanceRecord.objects.select_related("user")
        user = self.request.user
        if user.is_superuser or getattr(user.role, "is_leadership", False):
            return qs
        return qs.filter(user=user)

    @action(detail=False, methods=["post"])
    def mark(self, request):
        today = timezone.now().date()
        record, _ = AttendanceRecord.objects.update_or_create(
            user=request.user,
            date=today,
            defaults={
                "status": request.data.get("status", AttendanceRecord.Status.PRESENT),
                "method": AttendanceRecord.Method.MANUAL,
                "check_in": timezone.now(),
            },
        )
        return Response(AttendanceRecordSerializer(record).data)

    @action(detail=False, methods=["get"], permission_classes=[IsLeadership])
    def generate_qr(self, request):
        token = secrets.token_urlsafe(32)
        request.session["attendance_qr_token"] = token
        request.session["attendance_qr_date"] = str(date.today())
        return Response({"token": token, "date": str(date.today())})

    @action(detail=False, methods=["post"])
    def scan_qr(self, request):
        token = request.data.get("token")
        stored = request.session.get("attendance_qr_token")
        stored_date = request.session.get("attendance_qr_date")
        today = str(date.today())
        if not token or token != stored or stored_date != today:
            return Response({"detail": "Invalid or expired QR code."}, status=400)
        record, _ = AttendanceRecord.objects.update_or_create(
            user=request.user,
            date=date.today(),
            defaults={
                "status": AttendanceRecord.Status.PRESENT,
                "method": AttendanceRecord.Method.QR,
                "check_in": timezone.now(),
                "qr_token": token,
            },
        )
        return Response(AttendanceRecordSerializer(record).data)

    @action(detail=False, methods=["post"])
    def face_checkin(self, request):
        """Face attendance stub — accepts image upload for future ML integration."""
        image = request.FILES.get("image")
        if not image:
            return Response({"detail": "Image required."}, status=400)
        record, _ = AttendanceRecord.objects.update_or_create(
            user=request.user,
            date=date.today(),
            defaults={
                "status": AttendanceRecord.Status.PRESENT,
                "method": AttendanceRecord.Method.FACE,
                "check_in": timezone.now(),
                "face_verified": True,
                "notes": f"Face check-in via {image.name}",
            },
        )
        return Response(AttendanceRecordSerializer(record).data)

    @action(detail=False, methods=["get"])
    def analytics(self, request):
        from django.db.models import Count

        stats = AttendanceRecord.objects.values("status").annotate(count=Count("id"))
        total = AttendanceRecord.objects.count()
        return Response({"total": total, "by_status": list(stats)})


class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    filterset_fields = ("status", "user", "leave_type")

    def get_queryset(self):
        qs = LeaveRequest.objects.select_related("user")
        user = self.request.user
        if user.is_superuser or getattr(user.role, "is_leadership", False):
            return qs
        return qs.filter(user=user)

    @action(detail=True, methods=["post"], permission_classes=[IsLeadership])
    def approve(self, request, pk=None):
        leave = self.get_object()
        leave.status = LeaveRequest.Status.APPROVED
        leave.approved_by = request.user
        leave.save()
        return Response(LeaveRequestSerializer(leave).data)

    @action(detail=True, methods=["post"], permission_classes=[IsLeadership])
    def reject(self, request, pk=None):
        leave = self.get_object()
        leave.status = LeaveRequest.Status.REJECTED
        leave.approved_by = request.user
        leave.save()
        return Response(LeaveRequestSerializer(leave).data)
