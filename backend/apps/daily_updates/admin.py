from django.contrib import admin

from .models import DailyUpdate


@admin.register(DailyUpdate)
class DailyUpdateAdmin(admin.ModelAdmin):
    list_display = ("user", "date", "hours_worked", "project")
    list_filter = ("date", "project")
    date_hierarchy = "date"
