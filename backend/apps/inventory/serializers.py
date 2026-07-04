from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import Component, Equipment, LabBooking, MaintenanceRecord


class ComponentSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Component
        fields = "__all__"


class EquipmentSerializer(serializers.ModelSerializer):
    assigned_to_detail = UserListSerializer(source="assigned_to", read_only=True)

    class Meta:
        model = Equipment
        fields = "__all__"


class LabBookingSerializer(serializers.ModelSerializer):
    booked_by_detail = UserListSerializer(source="booked_by", read_only=True)

    class Meta:
        model = LabBooking
        fields = "__all__"
        read_only_fields = ("booked_by", "created_at")

    def create(self, validated_data):
        equipment = validated_data.pop("equipment", [])
        validated_data["booked_by"] = self.context["request"].user
        booking = super().create(validated_data)
        if equipment:
            booking.equipment.set(equipment)
        return booking


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRecord
        fields = "__all__"
