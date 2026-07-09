from rest_framework.permissions import BasePermission


class HasResourcePermission(BasePermission):
    """Check RBAC permission for resource + action."""

    resource = ""
    action = "read"

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        resource = getattr(view, "rbac_resource", self.resource) or self.resource
        if not resource:
            return True
        action_map = {
            "GET": "read",
            "HEAD": "read",
            "OPTIONS": "read",
            "POST": "create",
            "PUT": "update",
            "PATCH": "update",
            "DELETE": "delete",
        }
        action_overrides = getattr(view, "rbac_action_map", {})
        view_action = getattr(view, "action", None)
        if view_action and view_action in action_overrides:
            action = action_overrides[view_action]
        elif getattr(view, "rbac_action", None):
            action = view.rbac_action
        else:
            action = action_map.get(request.method, self.action)
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


class CanManageLlm(BasePermission):
    """
    Allow access to LLM features only for Faculty and above (priority >= 70).
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        if not request.user.role:
            return False
        return request.user.role.priority >= 70
