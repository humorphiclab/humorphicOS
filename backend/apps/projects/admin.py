from django.contrib import admin
from .models import Project, ProjectPhase, SubStage, SubLevel


class SubLevelInline(admin.TabularInline):
    model = SubLevel
    extra = 0


class SubStageInline(admin.TabularInline):
    model = SubStage
    extra = 0


class ProjectPhaseInline(admin.TabularInline):
    model = ProjectPhase
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "health", "completion_percentage", "owner")
    list_filter = ("status", "health", "department")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [ProjectPhaseInline]
    filter_horizontal = ("members",)


@admin.register(ProjectPhase)
class ProjectPhaseAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "is_completed")
    inlines = [SubStageInline]


@admin.register(SubStage)
class SubStageAdmin(admin.ModelAdmin):
    list_display = ("title", "phase", "is_completed")
    inlines = [SubLevelInline]


@admin.register(SubLevel)
class SubLevelAdmin(admin.ModelAdmin):
    list_display = ("title", "sub_stage", "is_completed")
