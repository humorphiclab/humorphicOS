from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from apps.accounts.rbac import RBACMixin
from apps.accounts.permissions import IsVicePresidentOrAbove

from .models import Department, DepartmentJoinRequest
from .serializers import DepartmentSerializer, DepartmentJoinRequestSerializer


class DepartmentViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "departments"
    permission_classes = [IsAuthenticated, IsVicePresidentOrAbove]
    queryset = Department.objects.select_related("head").prefetch_related("members").filter(is_active=True)
    serializer_class = DepartmentSerializer
    search_fields = ("name", "description")
    lookup_field = "slug"

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def join(self, request, slug=None):
        """Create a join request for the department."""
        dept = self.get_object()
        join_req, created = DepartmentJoinRequest.objects.get_or_create(
            department=dept,
            user=request.user,
            defaults={"status": DepartmentJoinRequest.Status.PENDING}
        )
        return Response({"status": join_req.status}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def leave(self, request, slug=None):
        """Allow a member to leave a department."""
        dept = self.get_object()
        dept.members.remove(request.user)
        return Response({"status": "left"}, status=status.HTTP_200_OK)


class DepartmentJoinRequestViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "departments"
    serializer_class = DepartmentJoinRequestSerializer
    queryset = DepartmentJoinRequest.objects.select_related("department", "user", "reviewed_by").all()

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return DepartmentJoinRequest.objects.none()
        
        is_president_or_above = user.is_superuser or (user.role and user.role.priority >= 90)
        if is_president_or_above:
            return self.queryset
        
        return self.queryset.filter(user=user)

    def perform_create(self, serializer):
        join_req = serializer.save(user=self.request.user, status=DepartmentJoinRequest.Status.PENDING)
        
        # Send notifications to leadership (President, Founder, Super Admin, and Department Head)
        try:
            from apps.notifications.services import send_notification_to_user
            from apps.accounts.models import User
            from django.db import models
            
            recipients = User.objects.filter(
                models.Q(role__slug__in=["founder", "super_admin", "president"]) |
                models.Q(id=join_req.department.head_id)
            ).filter(is_active=True).distinct()
            
            for recipient in recipients:
                send_notification_to_user(
                    user=recipient,
                    pref_key="system",
                    title="New Department Join Request",
                    message=f"{join_req.user.get_full_name()} has requested to join the {join_req.department.name} department.",
                    link="/my-space",
                    priority="normal"
                )
        except Exception as e:
            # Silently log/ignore notification failures so it doesn't block the request
            pass

    def check_leadership_permission(self):
        user = self.request.user
        is_president_or_above = user.is_superuser or (user.role and user.role.priority >= 90)
        if not is_president_or_above:
            raise PermissionDenied("Only President and above authority can approve or reject department requests.")

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        self.check_leadership_permission()
        join_req = self.get_object()
        if join_req.status != DepartmentJoinRequest.Status.PENDING:
            return Response({"detail": "This request has already been reviewed."}, status=status.HTTP_400_BAD_REQUEST)
        
        join_req.status = DepartmentJoinRequest.Status.APPROVED
        join_req.reviewed_by = request.user
        join_req.reviewed_at = timezone.now()
        join_req.save()

        # Add the user to the department's members
        join_req.department.members.add(join_req.user)

        # Send notification to the user
        try:
            from apps.notifications.services import send_notification_to_user
            send_notification_to_user(
                user=join_req.user,
                pref_key="system",
                title="Department Request Approved",
                message=f"Your request to join the {join_req.department.name} department has been approved.",
                link="/my-space",
                priority="normal"
            )
        except Exception:
            pass

        return Response({"status": "approved", "detail": f"User {join_req.user.email} approved to join department {join_req.department.name}."})

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        self.check_leadership_permission()
        join_req = self.get_object()
        if join_req.status != DepartmentJoinRequest.Status.PENDING:
            return Response({"detail": "This request has already been reviewed."}, status=status.HTTP_400_BAD_REQUEST)

        join_req.status = DepartmentJoinRequest.Status.REJECTED
        join_req.reviewed_by = request.user
        join_req.reviewed_at = timezone.now()
        join_req.save()

        # Send notification to the user
        try:
            from apps.notifications.services import send_notification_to_user
            send_notification_to_user(
                user=join_req.user,
                pref_key="system",
                title="Department Request Rejected",
                message=f"Your request to join the {join_req.department.name} department has been rejected.",
                link="/my-space",
                priority="normal"
            )
        except Exception:
            pass

        return Response({"status": "rejected", "detail": f"User {join_req.user.email} request rejected."})
