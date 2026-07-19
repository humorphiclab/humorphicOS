from django.contrib.auth import authenticate
from django.conf import settings
from django.apps import apps as django_apps
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
import json
import urllib.request
from django.utils import timezone



from .models import AuditLog, Role, User
from .permissions import HasResourcePermission, IsLeadership
from .serializers import (
    AdminUserCreateSerializer,
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
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "")
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


class UserListView(generics.ListCreateAPIView):
    queryset = User.objects.select_related("role").filter(is_active=True)
    serializer_class = UserListSerializer
    search_fields = ("first_name", "last_name", "email", "college", "branch")
    filterset_fields = ("role", "batch", "branch")
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminUserCreateSerializer
        return UserListSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def create(self, request, *args, **kwargs):
        user = request.user
        if not user or not user.is_authenticated:
            return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)
        
        is_allowed_creator = user.is_superuser or (
            user.role and user.role.slug in ["founder", "super_admin", "president"]
        )
        if not is_allowed_creator:
            return Response(
                {"detail": "Only Founder, Super Admin, or President can create users."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)


class UserDetailView(generics.RetrieveDestroyAPIView):
    queryset = User.objects.select_related("role")
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def destroy(self, request, *args, **kwargs):
        target_user = self.get_object()
        request_user = request.user

        # 1. No one (not even super admin or superuser) can delete a founder
        if target_user.role and target_user.role.slug == "founder":
            return Response(
                {"detail": "A founder cannot be deleted by anyone, including super admins and superusers."},
                status=status.HTTP_403_FORBIDDEN
            )

        # 2. Only president, founder, and super admin can delete users below their rank
        if not request_user.is_superuser:
            if not request_user.role or request_user.role.slug not in ["founder", "super_admin", "president"]:
                return Response(
                    {"detail": "Only Founder, Super Admin, or President can delete user accounts."},
                    status=status.HTTP_403_FORBIDDEN
                )

            request_priority = request_user.role.priority
            target_priority = target_user.role.priority if target_user.role else 0

            if request_priority <= target_priority:
                return Response(
                    {"detail": "You can only delete accounts of a lower rank than yours."},
                    status=status.HTTP_403_FORBIDDEN
                )

        target_user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserProfileUpdateView(generics.UpdateAPIView):
    """PATCH /auth/me/profile/ – allows authenticated users to update their own profile."""
    serializer_class = UserUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["patch", "options"]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        from .serializers import UserDetailSerializer  # type: ignore
        return Response(UserDetailSerializer(instance, context=self.get_serializer_context()).data)


class UserRoleUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsLeadership]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk, is_active=True)  # type: ignore
        except User.DoesNotExist:  # type: ignore
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        
        role_id = request.data.get("role")
        if not role_id:
            return Response({"detail": "role is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            role = Role.objects.get(pk=role_id)  # type: ignore
        except Role.DoesNotExist:  # type: ignore
            return Response({"detail": "Invalid role."}, status=status.HTTP_400_BAD_REQUEST)

        request_user = request.user
        
        # Check permissions and hierarchy
        if not request_user.is_superuser:
            request_role = request_user.role
            if not request_role:
                return Response({"detail": "You do not have a role assigned and cannot change roles."}, status=status.HTTP_403_FORBIDDEN)
            
            request_slug = request_role.slug
            request_priority = request_role.priority
            target_priority = user.role.priority if user.role else 0

            # Only founder, super_admin, and president can change roles
            if request_slug not in ["founder", "super_admin", "president"]:
                return Response({"detail": "Only Founder, Super Admin, or President can change user roles."}, status=status.HTTP_403_FORBIDDEN)

            # Enforce below rank rule + president exception
            if request_slug == "founder":
                if role.priority >= 110:
                    return Response({"detail": "You can only assign roles below yours."}, status=status.HTTP_403_FORBIDDEN)
            elif request_slug == "super_admin":
                if role.priority >= 100:
                    return Response({"detail": "You can only assign roles below yours."}, status=status.HTTP_403_FORBIDDEN)
            elif request_slug == "president":
                # President can assign Founder (110) or roles below President (< 90)
                if role.slug == "founder":
                    pass
                elif role.priority < 90:
                    pass
                else:
                    return Response(
                        {"detail": "President can only assign Founder or roles below President."},
                        status=status.HTTP_403_FORBIDDEN
                    )

        # Enforce unique constraints on founder, super_admin, president, and vice_president roles
        if role.slug in ["founder", "super_admin", "president", "vice_president"]:
            dup_query = User.objects.filter(role=role, is_active=True).exclude(pk=user.pk)
            if dup_query.exists():
                return Response(
                    {"detail": f"There can only be one active user with the role '{role.name}'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        user.role = role
        try:
            user.save(update_fields=["role"])
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(UserDetailSerializer(user).data)


class RolesListView(generics.ListAPIView):
    queryset = Role.objects.all()  # type: ignore
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
        qs = AuditLog.objects.select_related("user").all()  # type: ignore
        if not self.request.user.is_superuser and not getattr(
            self.request.user.role, "is_leadership", False
        ):
            qs = qs.filter(user=self.request.user)
        return qs


class DashboardStatsView(APIView):
    """Aggregated dashboard widgets for the current user."""

    def get(self, request):
        Task = django_apps.get_model('tasks', 'Task')
        Meeting = django_apps.get_model('meetings', 'Meeting')
        DailyUpdate = django_apps.get_model('daily_updates', 'DailyUpdate')
        Announcement = django_apps.get_model('announcements', 'Announcement')

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
            return Response({"detail": "Google id_token or access_token required."}, status=status.HTTP_400_BAD_REQUEST)

        try:

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
            return Response({"detail": "Invalid Google token."}, status=status.HTTP_401_UNAUTHORIZED)

        client_id = settings.GOOGLE_CLIENT_ID
        if client_id and id_token and data.get("aud") != client_id:
            return Response({"detail": "Token audience mismatch."}, status=status.HTTP_401_UNAUTHORIZED)

        email = data.get("email")
        if not email:
            return Response({"detail": "Email not provided by Google."}, status=status.HTTP_400_BAD_REQUEST)
        if data.get("email_verified") == "false":
            return Response({"detail": "Google email is not verified."}, status=status.HTTP_400_BAD_REQUEST)

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
            member_role = Role.objects.filter(slug=Role.Slug.MEMBER).first()  # type: ignore
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


class GetRoleEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Authenticate request via shared secret
        auth_header = request.headers.get("X-Email-Secret")
        expected_secret = getattr(settings, "FRONTEND_EMAIL_SECRET", "")

        if not expected_secret or auth_header != expected_secret:
            return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        role_slug = request.query_params.get("role", "").strip().lower()
        if not role_slug:
            return Response({"detail": "Role query parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Handle hardcoded mapping for contact/support email
        if role_slug in ["contact", "support"]:
            contact_email = getattr(settings, "DEFAULT_FROM_EMAIL", "humorphic.labs@hotmail.com")
            return Response({"email": contact_email})

        # Query user with the given role slug
        user = User.objects.filter(role__slug=role_slug, is_active=True).first()
        if not user or not user.email:
            return Response({"detail": "No user found for this role"}, status=status.HTTP_404_NOT_FOUND)

        return Response({"email": user.email})
