from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.Model):
    """RBAC role with slug-based identification."""

    class Slug(models.TextChoices):
        SUPER_ADMIN = "super_admin", "Super Admin"
        PRESIDENT = "president", "President"
        VICE_PRESIDENT = "vice_president", "Vice President"
        FACULTY = "faculty", "Faculty"
        MENTOR = "mentor", "Mentor"
        TEAM_LEAD = "team_lead", "Team Lead"
        MEMBER = "member", "Member"
        GUEST = "guest", "Guest"

    name = models.CharField(max_length=100)
    slug = models.CharField(max_length=50, choices=Slug.choices, unique=True)
    description = models.TextField(blank=True)
    is_leadership = models.BooleanField(default=False)
    priority = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-priority", "name"]

    def __str__(self):
        return self.name


class Permission(models.Model):
    """Granular permission tied to a resource."""

    class Action(models.TextChoices):
        CREATE = "create", "Create"
        READ = "read", "Read"
        UPDATE = "update", "Update"
        DELETE = "delete", "Delete"
        APPROVE = "approve", "Approve"
        ASSIGN = "assign", "Assign"
        EXPORT = "export", "Export"
        MANAGE = "manage", "Manage"

    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="permissions")
    resource = models.CharField(max_length=100)
    action = models.CharField(max_length=20, choices=Action.choices)

    class Meta:
        unique_together = ("role", "resource", "action")

    def __str__(self):
        return f"{self.role.slug}:{self.action}:{self.resource}"


class User(AbstractUser):
    """Extended user model for club members."""

    class Year(models.TextChoices):
        FIRST = "1", "1st Year"
        SECOND = "2", "2nd Year"
        THIRD = "3", "3rd Year"
        FOURTH = "4", "4th Year"
        GRADUATE = "grad", "Graduate"
        OTHER = "other", "Other"

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    role = models.ForeignKey(
        Role, on_delete=models.SET_NULL, null=True, blank=True, related_name="users"
    )
    college = models.CharField(max_length=200, blank=True)
    branch = models.CharField(max_length=100, blank=True)
    year = models.CharField(max_length=10, choices=Year.choices, blank=True)
    skills = models.JSONField(default=list, blank=True)
    linkedin = models.URLField(blank=True)
    github = models.URLField(blank=True)
    portfolio = models.URLField(blank=True)
    bio = models.TextField(blank=True)
    is_email_verified = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    last_active = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name", "last_name"]

    class Meta:
        ordering = ["first_name", "last_name"]

    def __str__(self):
        return self.get_full_name() or self.email

    @property
    def full_name(self):
        return self.get_full_name()

    def has_permission(self, resource: str, action: str) -> bool:
        if self.is_superuser:
            return True
        if not self.role:
            return False
        return self.role.permissions.filter(resource=resource, action=action).exists()


class AuditLog(models.Model):
    """System audit trail."""

    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs"
    )
    action = models.CharField(max_length=100)
    resource = models.CharField(max_length=100)
    resource_id = models.CharField(max_length=100, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} on {self.resource} by {self.user}"
