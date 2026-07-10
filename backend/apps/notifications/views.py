from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import IsLeadership

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"])
    def read_all(self, request):
        count = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"marked_read": count})

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"count": count})

    @action(detail=False, methods=["get", "put", "patch"], url_path="preferences")
    def preferences(self, request):
        from .models import NotificationPreference
        from .serializers import NotificationPreferenceSerializer

        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        if request.method in ["PUT", "PATCH"]:
            serializer = NotificationPreferenceSerializer(prefs, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        
        serializer = NotificationPreferenceSerializer(prefs)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated, IsLeadership])
    def broadcast(self, request):
        title = request.data.get("title")
        message = request.data.get("message")
        target_type = request.data.get("target_type")  # "all", "department", "team", "user"
        target_id = request.data.get("target_id")      # id of department, team, or user
        priority = request.data.get("priority", Notification.Priority.NORMAL)
        notification_type = request.data.get("notification_type", Notification.Type.SYSTEM)
        link = request.data.get("link", "")

        if not title or not message or not target_type:
            return Response({"detail": "Title, message, and target_type are required."}, status=400)

        from apps.accounts.models import User
        users = User.objects.filter(is_active=True)

        if target_type == "department":
            if not target_id:
                return Response({"detail": "target_id is required for department target."}, status=400)
            users = users.filter(departments__id=target_id)
        elif target_type == "team":
            if not target_id:
                return Response({"detail": "target_id is required for team target."}, status=400)
            users = users.filter(teams__id=target_id)
        elif target_type == "user":
            if not target_id:
                return Response({"detail": "target_id is required for user target."}, status=400)
            users = users.filter(id=target_id)

        notifications_to_create = [
            Notification(
                user=u,
                title=title,
                message=message,
                notification_type=notification_type,
                priority=priority,
                link=link
            )
            for u in users
        ]
        Notification.objects.bulk_create(notifications_to_create)

        # Email broadcast
        from apps.notifications.services import send_html_email_to_user
        for u in users:
            send_html_email_to_user(
                user=u,
                title=title,
                message=message,
                link=link,
                priority=priority
            )

        return Response({"detail": f"Successfully broadcasted to {len(users)} users."})

