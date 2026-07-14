from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from apps.accounts.rbac import RBACMixin
from apps.accounts.permissions import IsVicePresidentOrAbove

from .models import Project, ProjectPhase, SubStage, SubLevel, ProjectJoinRequest
from .serializers import (
    ProjectDetailSerializer,
    ProjectListSerializer,
    ProjectPhaseSerializer,
    SubLevelSerializer,
    SubStageSerializer,
    ProjectJoinRequestSerializer,
)


class ProjectViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "projects"
    permission_classes = [IsAuthenticated, IsVicePresidentOrAbove]
    queryset = Project.objects.select_related("owner", "department").prefetch_related(
        "phases__sub_stages__sub_levels", "members"
    )
    search_fields = ("title", "description")
    filterset_fields = ("status", "health", "department")
    lookup_field = "slug"

    def get_serializer_class(self):
        if self.action == "list":
            return ProjectListSerializer
        return ProjectDetailSerializer

    @action(detail=True, methods=['post'])
    def remove_member(self, request, slug=None):
        project = self.get_object()
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"detail": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Remove from explicit project members
        project.members.remove(user_id)
        
        # Remove from all teams in this project
        for team in project.teams.all():
            if team.lead_id == user_id:
                team.lead = None
                team.save(update_fields=['lead'])
            team.members.remove(user_id)
            
        return Response({"detail": "Member removed from project and all its sub-teams."})


class ProjectPhaseViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "projects"
    permission_classes = [IsAuthenticated, IsVicePresidentOrAbove]
    queryset = ProjectPhase.objects.all()
    serializer_class = ProjectPhaseSerializer


class SubStageViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "projects"
    permission_classes = [IsAuthenticated, IsVicePresidentOrAbove]
    queryset = SubStage.objects.all()
    serializer_class = SubStageSerializer


class SubLevelViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "projects"
    permission_classes = [IsAuthenticated, IsVicePresidentOrAbove]
    queryset = SubLevel.objects.all()
    serializer_class = SubLevelSerializer


class ProjectJoinRequestViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "projects"
    serializer_class = ProjectJoinRequestSerializer
    queryset = ProjectJoinRequest.objects.select_related("project", "user", "reviewed_by").all()

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ProjectJoinRequest.objects.none()
        
        is_vp_or_above = user.is_superuser or (user.role and user.role.priority >= 80)
        if is_vp_or_above:
            return self.queryset
        
        return self.queryset.filter(user=user)

    def perform_create(self, serializer):
        join_req = serializer.save(user=self.request.user, status=ProjectJoinRequest.Status.PENDING)
        
        # Send notifications to leadership (VP and above, Project Owner, and Team Lead if it's a team join request)
        try:
            from apps.notifications.services import send_notification_to_user
            from apps.accounts.models import User
            from django.db import models
            
            q_filter = models.Q(role__slug__in=["founder", "super_admin", "president", "vice_president"]) | models.Q(id=join_req.project.owner_id)
            if join_req.team and join_req.team.lead:
                q_filter = q_filter | models.Q(id=join_req.team.lead_id)
                
            recipients = User.objects.filter(q_filter).filter(is_active=True).distinct()
            
            entity_name = f"team {join_req.team.name}" if join_req.team else f"project {join_req.project.title}"
            
            for recipient in recipients:
                send_notification_to_user(
                    user=recipient,
                    pref_key="system",
                    title="New Join Request",
                    message=f"{join_req.user.get_full_name()} has requested to join {entity_name}.",
                    link="/my-space",
                    priority="normal"
                )
        except Exception:
            pass

    def check_leadership_permission(self):
        user = self.request.user
        is_vp_or_above = user.is_superuser or (user.role and user.role.priority >= 80)
        if not is_vp_or_above:
            raise PermissionDenied("Only Vice President and above authority can approve or reject requests.")

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        self.check_leadership_permission()
        join_req = self.get_object()
        if join_req.status != ProjectJoinRequest.Status.PENDING:
            return Response({"detail": "This request has already been reviewed."}, status=status.HTTP_400_BAD_REQUEST)
        
        join_req.status = ProjectJoinRequest.Status.APPROVED
        join_req.reviewed_by = request.user
        join_req.reviewed_at = timezone.now()
        join_req.save()

        # Add the user to the project's members
        join_req.project.members.add(join_req.user)

        # If there is an associated team, add the user to the team's members too
        if join_req.team:
            join_req.team.members.add(join_req.user)

        # Send notification to the user
        try:
            from apps.notifications.services import send_notification_to_user
            entity_name = f"team {join_req.team.name}" if join_req.team else f"project {join_req.project.title}"
            send_notification_to_user(
                user=join_req.user,
                pref_key="system",
                title="Join Request Approved",
                message=f"Your request to join {entity_name} has been approved.",
                link="/my-space",
                priority="normal"
            )
        except Exception:
            pass

        return Response({"status": "approved", "detail": f"User {join_req.user.email} approved to join project {join_req.project.title}."})

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        self.check_leadership_permission()
        join_req = self.get_object()
        if join_req.status != ProjectJoinRequest.Status.PENDING:
            return Response({"detail": "This request has already been reviewed."}, status=status.HTTP_400_BAD_REQUEST)

        join_req.status = ProjectJoinRequest.Status.REJECTED
        join_req.reviewed_by = request.user
        join_req.reviewed_at = timezone.now()
        join_req.save()

        # Send notification to the user
        try:
            from apps.notifications.services import send_notification_to_user
            entity_name = f"team {join_req.team.name}" if join_req.team else f"project {join_req.project.title}"
            send_notification_to_user(
                user=join_req.user,
                pref_key="system",
                title="Join Request Rejected",
                message=f"Your request to join {entity_name} was rejected.",
                link="/my-space",
                priority="normal"
            )
        except Exception:
            pass

        return Response({"status": "rejected", "detail": f"User {join_req.user.email} request rejected."})

