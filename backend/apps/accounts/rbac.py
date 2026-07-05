from rest_framework.permissions import IsAuthenticated

from .permissions import HasResourcePermission


class RBACMixin:
    """Attach to ViewSets — set rbac_resource and optional rbac_action_map."""

    permission_classes = [IsAuthenticated, HasResourcePermission]
