from rest_framework.permissions import BasePermission


class HasResourcePermission(BasePermission):
    """Check RBAC permission for resource + action."""

    resource = ""
    action = "read"

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        resource = getattr(view, "rbac_resource", self.resource) or self.resource
        action_map = {
            "GET": "read",
            "HEAD": "read",
            "OPTIONS": "read",
            "POST": "create",
            "PUT": "update",
            "PATCH": "update",
            "DELETE": "delete",
        }
        action = getattr(view, "rbac_action", None) or action_map.get(request.method, self.action)
        if request.user.is_superuser:
            return True
        return request.user.has_permission(resource, action)


class IsLeadership(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return bool(getattr(request.user.role, "is_leadership", False))
