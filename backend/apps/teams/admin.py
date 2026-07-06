from django.contrib import admin

from .models import Team


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "project", "lead", "is_active", "is_archived")
    list_filter = ("project", "is_active", "is_archived")
    filter_horizontal = ("members",)
