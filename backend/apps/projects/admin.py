from django.contrib import admin

from .models import Milestone, Project


class MilestoneInline(admin.TabularInline):
    model = Milestone
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "health", "completion_percentage", "owner")
    list_filter = ("status", "health", "department")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [MilestoneInline]
    filter_horizontal = ("members",)


@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "due_date", "is_completed")
