from rest_framework import serializers
from .models import Notification, NotificationPreference



class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            "id", "title", "message", "notification_type", "priority",
            "link", "is_read", "created_at",
        )
        read_only_fields = ("created_at",)


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        exclude = ("user",)

