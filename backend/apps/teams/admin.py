from django.contrib import admin

from .models import Team


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "department", "lead", "is_active", "is_archived")
    list_filter = ("department", "is_active", "is_archived")
    filter_horizontal = ("members",)
