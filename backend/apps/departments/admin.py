from django.contrib import admin

from .models import Department


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "head", "is_active")
    prepopulated_fields = {"slug": ("name",)}
