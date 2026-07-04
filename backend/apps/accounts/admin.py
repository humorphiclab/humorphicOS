from django.contrib import admin

from .models import AuditLog, Permission, Role, User


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_leadership", "priority")
    list_filter = ("is_leadership",)


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ("role", "resource", "action")
    list_filter = ("role", "action", "resource")


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("email", "first_name", "last_name", "role", "is_active")
    list_filter = ("role", "is_active", "year")
    search_fields = ("email", "first_name", "last_name")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "resource", "user", "created_at")
    list_filter = ("action", "resource")
