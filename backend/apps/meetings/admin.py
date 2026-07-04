from django.contrib import admin

from .models import Meeting, MeetingAttendance


class MeetingAttendanceInline(admin.TabularInline):
    model = MeetingAttendance
    extra = 0


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = ("title", "organizer", "start_time", "end_time")
    list_filter = ("start_time",)
    filter_horizontal = ("participants",)
    inlines = [MeetingAttendanceInline]
