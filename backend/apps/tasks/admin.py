from django.contrib import admin

from .models import Subtask, Task, TaskComment


class SubtaskInline(admin.TabularInline):
    model = Subtask
    extra = 0


class TaskCommentInline(admin.TabularInline):
    model = TaskComment
    extra = 0


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "assignee", "status", "priority", "due_date", "project")
    list_filter = ("status", "priority", "project")
    inlines = [SubtaskInline, TaskCommentInline]
