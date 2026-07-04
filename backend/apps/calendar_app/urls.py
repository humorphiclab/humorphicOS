from django.urls import path
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta


class CalendarView(APIView):
    def get(self, request):
        from apps.meetings.models import Meeting
        from apps.tasks.models import Task
        from apps.events.models import Event
        from apps.attendance.models import Holiday, LeaveRequest

        start = request.query_params.get("start")
        end = request.query_params.get("end")
        today = timezone.now().date()
        range_start = timezone.datetime.fromisoformat(start).date() if start else today - timedelta(days=30)
        range_end = timezone.datetime.fromisoformat(end).date() if end else today + timedelta(days=60)

        events = []
        for m in Meeting.objects.filter(start_time__date__gte=range_start, start_time__date__lte=range_end):
            events.append({"id": f"m-{m.id}", "type": "meeting", "title": m.title, "start": m.start_time, "end": m.end_time, "color": "#6366f1"})
        for t in Task.objects.filter(due_date__gte=range_start, due_date__lte=range_end, assignee=request.user):
            events.append({"id": f"t-{t.id}", "type": "task", "title": t.title, "start": t.due_date, "end": t.due_date, "color": "#f59e0b"})
        for e in Event.objects.filter(start_time__date__gte=range_start, start_time__date__lte=range_end, is_active=True):
            events.append({"id": f"e-{e.id}", "type": "event", "title": e.title, "start": e.start_time, "end": e.end_time, "color": "#22d3ee"})
        for h in Holiday.objects.filter(date__gte=range_start, date__lte=range_end):
            events.append({"id": f"h-{h.id}", "type": "holiday", "title": h.name, "start": h.date, "end": h.date, "color": "#ef4444"})
        for l in LeaveRequest.objects.filter(user=request.user, status="approved", start_date__lte=range_end, end_date__gte=range_start):
            events.append({"id": f"l-{l.id}", "type": "leave", "title": f"Leave ({l.leave_type})", "start": l.start_date, "end": l.end_date, "color": "#94a3b8"})

        return Response({"events": events, "range_start": range_start, "range_end": range_end})


urlpatterns = [path("", CalendarView.as_view())]
