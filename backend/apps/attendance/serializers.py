from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import AttendanceRecord, Holiday, LeaveRequest


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = ("id", "name", "date", "description")


class AttendanceRecordSerializer(serializers.ModelSerializer):
    user_detail = UserListSerializer(source="user", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = (
            "id", "user", "user_detail", "date", "status", "method",
            "check_in", "check_out", "notes", "face_verified", "created_at",
        )
        read_only_fields = ("created_at", "face_verified")


class LeaveRequestSerializer(serializers.ModelSerializer):
    user_detail = UserListSerializer(source="user", read_only=True)

    class Meta:
        model = LeaveRequest
        fields = (
            "id", "user", "user_detail", "leave_type", "start_date", "end_date",
            "reason", "status", "approved_by", "created_at",
        )
        read_only_fields = ("user", "status", "approved_by", "created_at")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
