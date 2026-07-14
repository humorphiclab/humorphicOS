from django.contrib.auth.backends import BaseBackend
from django.contrib.auth import get_user_model

class RBACAuthBackend(BaseBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        return None

    def get_user(self, user_id):
        try:
            return get_user_model().objects.get(pk=user_id)
        except get_user_model().DoesNotExist:
            return None

    def has_perm(self, user_obj, perm, obj=None):
        if not user_obj.is_active:
            return False
        if user_obj.is_superuser:
            return True
        if user_obj.role and user_obj.role.slug == "founder":
            return True
        
        # perm is in the format "app_label.action_modelname", e.g., "accounts.view_user"
        if "." in perm:
            app_label, codename = perm.split(".", 1)
            # Map django admin actions to custom action
            action_map = {
                "add": "create",
                "change": "update",
                "delete": "delete",
                "view": "read",
            }
            parts = codename.split("_", 1)
            if len(parts) == 2:
                django_action, model_name = parts
                custom_action = action_map.get(django_action)
                
                # Map standard model names to resources
                resource_map = {
                    "user": "users",
                    "department": "departments",
                    "team": "teams",
                    "project": "projects",
                    "task": "tasks",
                    "meeting": "meetings",
                    "report": "reports",
                    "announcement": "announcements",
                    "setting": "settings",
                    "attendance": "attendance",
                    "inventory": "inventory",
                    "knowledge": "knowledge",
                    "certificate": "certificates",
                    "event": "events",
                    "chat": "chat",
                    "organization": "organizations",
                }
                custom_resource = resource_map.get(model_name, model_name + "s")
                if custom_action:
                    return user_obj.has_permission(custom_resource, custom_action)
        return False

    def has_module_perms(self, user_obj, app_label):
        # Allow access to module/app if the user is superuser, founder, or has any permissions
        if not user_obj.is_active:
            return False
        if user_obj.is_superuser:
            return True
        if user_obj.role and user_obj.role.slug == "founder":
            return True
        if user_obj.role:
            # If the role has any permissions, we let them see modules
            return user_obj.role.permissions.exists()
        return False
