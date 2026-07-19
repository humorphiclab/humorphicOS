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

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def send_test_email(self, request):
        # Only allow Founder, Super Admin, President, or Django Superuser
        user = request.user
        is_authorized = (
            user.is_superuser or 
            (user.role and user.role.slug in ["founder", "super_admin", "president"])
        )
        if not is_authorized:
            return Response(
                {"detail": "You do not have permission to perform this action. Only President and above can test email configurations."},
                status=403
            )

        email_type = request.data.get("email_type", "primary")
        recipient = request.data.get("recipient", request.user.email)
        subject = request.data.get("subject", "Test Email Connection")
        body = request.data.get("body", "This is a test email sent from HumorphicOS to verify SMTP connection.")

        if email_type not in ["primary", "secondary"]:
            return Response({"detail": "Invalid email type. Must be 'primary' or 'secondary'."}, status=400)

        from django.conf import settings
        from .services import send_via_resend, send_via_frontend

        frontend_secret = getattr(settings, "FRONTEND_EMAIL_SECRET", "")

        try:
            if frontend_secret:
                api_sender_type = "primary"
                if email_type == "secondary":
                    api_sender_type = "secondary"
                elif email_type == "tertiary":
                    api_sender_type = "tertiary"

                success, res_msg = send_via_frontend(
                    to_email=recipient,
                    subject=subject,
                    text_body=body,
                    html_body=f"<p>{body}</p>",
                    sender_type=api_sender_type,
                    category="default"
                )
                if not success:
                    raise Exception(f"Frontend API error: {res_msg}")
                return Response({"detail": f"Test email sent successfully via Frontend API ({api_sender_type}) to {recipient}!"})
            else:
                if email_type == "secondary":
                    resend_key = getattr(settings, "SECONDARY_RESEND_API_KEY", "")
                    if resend_key:
                        from_email = getattr(settings, "SECONDARY_RESEND_FROM_EMAIL", "onboarding@resend.dev")
                        success, res_msg = send_via_resend(
                            api_key=resend_key,
                            from_email=from_email,
                            to_email=recipient,
                            subject=subject,
                            text_body=body,
                            html_body=f"<p>{body}</p>"
                        )
                        if not success:
                            raise Exception(f"Resend error: {res_msg}")
                        return Response({"detail": f"Test email sent successfully via secondary Resend API to {recipient}!"})
                    else:
                        from django.core.mail import EmailMultiAlternatives, get_connection
                        connection = get_connection(
                            backend="django.core.mail.backends.smtp.EmailBackend",
                            host=settings.SECONDARY_EMAIL_HOST,
                            port=settings.SECONDARY_EMAIL_PORT,
                            username=settings.SECONDARY_EMAIL_HOST_USER,
                            password=settings.SECONDARY_EMAIL_HOST_PASSWORD,
                            use_tls=settings.SECONDARY_EMAIL_USE_TLS,
                            fail_silently=False,
                            timeout=10,
                        )
                        from_email = settings.SECONDARY_DEFAULT_FROM_EMAIL
                else:
                    resend_key = getattr(settings, "RESEND_API_KEY", "")
                    if resend_key:
                        from_email = getattr(settings, "RESEND_FROM_EMAIL", "onboarding@resend.dev")
                        success, res_msg = send_via_resend(
                            api_key=resend_key,
                            from_email=from_email,
                            to_email=recipient,
                            subject=subject,
                            text_body=body,
                            html_body=f"<p>{body}</p>"
                        )
                        if not success:
                            raise Exception(f"Resend error: {res_msg}")
                        return Response({"detail": f"Test email sent successfully via primary Resend API to {recipient}!"})
                    else:
                        from django.core.mail import EmailMultiAlternatives, get_connection
                        connection = get_connection(
                            backend="django.core.mail.backends.smtp.EmailBackend",
                            host=settings.EMAIL_HOST,
                            port=settings.EMAIL_PORT,
                            username=settings.EMAIL_HOST_USER,
                            password=settings.EMAIL_HOST_PASSWORD,
                            use_tls=settings.EMAIL_USE_TLS,
                            fail_silently=False,
                            timeout=10,
                        )
                        from_email = settings.DEFAULT_FROM_EMAIL

                msg = EmailMultiAlternatives(
                    subject=subject,
                    body=body,
                    from_email=from_email,
                    to=[recipient],
                    connection=connection,
                )
                msg.send(fail_silently=False)
                return Response({"detail": f"Test email sent successfully via {email_type} SMTP to {recipient}!"})
        except Exception as e:
            return Response({
                "detail": f"Failed to send test email via {email_type} account.",
                "error": str(e)
            }, status=500)


