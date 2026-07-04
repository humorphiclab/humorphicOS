from django.contrib.auth import authenticate
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import AuditLog, Role, User
from .serializers import (
    AuditLogSerializer,
    ChangePasswordSerializer,
    UserCreateSerializer,
    UserDetailSerializer,
    UserListSerializer,
    UserUpdateSerializer,
)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.AllowAny]


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        if not email or not password:
            return Response(
                {"detail": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = authenticate(request, username=email, password=password)
        if user is None:
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if not user.is_active:
            return Response(
                {"detail": "Account is disabled."},
                status=status.HTTP_403_FORBIDDEN,
            )
        tokens = get_tokens_for_user(user)
        return Response({
            "tokens": tokens,
            "user": UserDetailSerializer(user).data,
        })


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserDetailSerializer

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserUpdateSerializer
        return UserDetailSerializer


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response(
                {"detail": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response({"detail": "Password updated successfully."})


class UserListView(generics.ListAPIView):
    queryset = User.objects.select_related("role").filter(is_active=True)
    serializer_class = UserListSerializer
    search_fields = ("first_name", "last_name", "email", "college", "branch")
    filterset_fields = ("role", "year", "branch")


class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.select_related("role")
    serializer_class = UserDetailSerializer


class DashboardStatsView(APIView):
    """Aggregated dashboard widgets for the current user."""

    def get(self, request):
        from apps.tasks.models import Task
        from apps.meetings.models import Meeting
        from apps.daily_updates.models import DailyUpdate
        from django.utils import timezone

        user = request.user
        today = timezone.now().date()

        my_tasks = Task.objects.filter(assignee=user)
        pending_tasks = my_tasks.exclude(status=Task.Status.DONE).count()
        completed_tasks = my_tasks.filter(status=Task.Status.DONE).count()
        today_tasks = my_tasks.filter(due_date=today).exclude(status=Task.Status.DONE).count()

        upcoming_meetings = Meeting.objects.filter(
            start_time__gte=timezone.now(),
            participants=user,
        ).order_by("start_time")[:5]

        has_daily_update = DailyUpdate.objects.filter(user=user, date=today).exists()

        from apps.announcements.models import Announcement
        announcements = Announcement.objects.filter(is_active=True).order_by("-created_at")[:5]

        return Response({
            "today_tasks": today_tasks,
            "pending_tasks": pending_tasks,
            "completed_tasks": completed_tasks,
            "has_daily_update_today": has_daily_update,
            "upcoming_meetings": [
                {"id": m.id, "title": m.title, "start_time": m.start_time}
                for m in upcoming_meetings
            ],
            "announcements": [
                {"id": a.id, "title": a.title, "priority": a.priority}
                for a in announcements
            ],
        })


class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get("id_token") or request.data.get("access_token")
        if not token:
            return Response({"detail": "Google token required."}, status=400)
        try:
            import urllib.request
            import json
            url = f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
            with urllib.request.urlopen(url, timeout=10) as resp:
                data = json.loads(resp.read())
        except Exception:
            return Response({"detail": "Invalid Google token."}, status=401)

        if settings.GOOGLE_CLIENT_ID and data.get("aud") != settings.GOOGLE_CLIENT_ID:
            return Response({"detail": "Token audience mismatch."}, status=401)

        email = data.get("email")
        if not email:
            return Response({"detail": "Email not provided by Google."}, status=400)

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email.split("@")[0][:30],
                "first_name": data.get("given_name", ""),
                "last_name": data.get("family_name", ""),
                "is_email_verified": True,
            },
        )
        if created:
            member_role = Role.objects.filter(slug=Role.Slug.MEMBER).first()
            if member_role:
                user.role = member_role
            user.save()

        tokens = get_tokens_for_user(user)
        return Response({"tokens": tokens, "user": UserDetailSerializer(user).data})


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        qs = AuditLog.objects.select_related("user").all()
        if not self.request.user.is_superuser:
            qs = qs.filter(user=self.request.user)
        return qs[:100]
