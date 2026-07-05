from django.contrib.auth import authenticate
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import AuditLog, Role, User
from .permissions import HasResourcePermission, IsLeadership
from .serializers import (
    AuditLogSerializer,
    ChangePasswordSerializer,
    RoleSerializer,
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
    permission_classes = [permissions.IsAuthenticated, HasResourcePermission]
    rbac_resource = "users"


class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.select_related("role")
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAuthenticated, HasResourcePermission]
    rbac_resource = "users"


class UserRoleUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsLeadership]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk, is_active=True)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=404)
        role_id = request.data.get("role")
        if not role_id:
            return Response({"detail": "role is required."}, status=400)
        try:
            role = Role.objects.get(pk=role_id)
        except Role.DoesNotExist:
            return Response({"detail": "Invalid role."}, status=400)
        user.role = role
        user.save(update_fields=["role"])
        return Response(UserDetailSerializer(user).data)


class RolesListView(generics.ListAPIView):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, IsLeadership]


class PermissionsView(APIView):
    def get(self, request):
        user = request.user
        if user.is_superuser:
            perms = [{"resource": "*", "action": "*"}]
        elif user.role:
            perms = list(
                user.role.permissions.values("resource", "action")
            )
        else:
            perms = []
        return Response({
            "role": RoleSerializer(user.role).data if user.role else None,
            "permissions": perms,
            "is_leadership": bool(getattr(user.role, "is_leadership", False) or user.is_superuser),
        })


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, HasResourcePermission]
    rbac_resource = "settings"
    rbac_action = "read"

    def get_queryset(self):
        qs = AuditLog.objects.select_related("user").all()
        if not self.request.user.is_superuser and not getattr(
            self.request.user.role, "is_leadership", False
        ):
            qs = qs.filter(user=self.request.user)
        return qs[:200]


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
        id_token = request.data.get("id_token")
        access_token = request.data.get("access_token")
        if not id_token and not access_token:
            return Response({"detail": "Google id_token or access_token required."}, status=400)

        try:
            import json
            import urllib.request

            if id_token:
                url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
                with urllib.request.urlopen(url, timeout=10) as resp:
                    data = json.loads(resp.read())
            else:
                req = urllib.request.Request(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = json.loads(resp.read())
        except Exception:
            return Response({"detail": "Invalid Google token."}, status=401)

        client_id = settings.GOOGLE_CLIENT_ID
        if client_id and id_token and data.get("aud") != client_id:
            return Response({"detail": "Token audience mismatch."}, status=401)

        email = data.get("email")
        if not email:
            return Response({"detail": "Email not provided by Google."}, status=400)
        if data.get("email_verified") == "false":
            return Response({"detail": "Google email is not verified."}, status=400)

        user = User.objects.filter(email=email).first()
        if user:
            if not user.first_name and data.get("given_name"):
                user.first_name = data.get("given_name", "")
            if not user.last_name and data.get("family_name"):
                user.last_name = data.get("family_name", "")
            user.is_email_verified = True
            user.save(update_fields=["first_name", "last_name", "is_email_verified"])
        else:
            base_username = email.split("@")[0][:20]
            username = base_username
            n = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{n}"[:30]
                n += 1
            user = User.objects.create(
                email=email,
                username=username,
                first_name=data.get("given_name", ""),
                last_name=data.get("family_name", ""),
                is_email_verified=True,
            )
            member_role = Role.objects.filter(slug=Role.Slug.MEMBER).first()
            if member_role:
                user.role = member_role
            user.save()

        tokens = get_tokens_for_user(user)
        return Response({"tokens": tokens, "user": UserDetailSerializer(user).data})


class AuthConfigView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            "google_enabled": bool(settings.GOOGLE_CLIENT_ID),
            "google_client_id": settings.GOOGLE_CLIENT_ID or None,
        })
