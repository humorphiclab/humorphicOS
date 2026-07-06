import uuid

from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.daily_updates.models import DailyUpdate
from apps.meetings.models import Meeting
from apps.tasks.models import Task

from .models import AiInsight, ChatMessage
from .services import chat_response, generate_summary


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ("id", "role", "content", "session_id", "created_at")
        read_only_fields = ("created_at",)


class AiInsightSerializer(serializers.ModelSerializer):
    class Meta:
        model = AiInsight
        fields = ("id", "insight_type", "title", "content", "source_id", "created_at")


class ChatView(APIView):
    def post(self, request):
        message = request.data.get("message", "")
        session_id = request.data.get("session_id") or str(uuid.uuid4())
        if not message:
            return Response({"detail": "Message required."}, status=400)

        ChatMessage.objects.create(
            user=request.user, role=ChatMessage.Role.USER, content=message, session_id=session_id
        )

        user = request.user
        context_parts = [f"User Name: {user.get_full_name()}"]
        if user.role:
            context_parts.append(f"Role: {user.role.name}")
            
        pending_tasks = Task.objects.filter(assignee=user).exclude(status='completed')[:5]
        if pending_tasks:
            t_str = ", ".join([f"'{t.title}' ({t.status})" for t in pending_tasks])
            context_parts.append(f"Current Tasks: {t_str}")
            
        from apps.projects.models import Project
        active_projects = Project.objects.filter(members=user, status='active')[:3]
        if active_projects:
            p_str = ", ".join([p.title for p in active_projects])
            context_parts.append(f"Active Projects: {p_str}")

        context_str = " | ".join(context_parts)
        
        reply = chat_response(message, context=context_str)
        
        ChatMessage.objects.create(
            user=request.user, role=ChatMessage.Role.ASSISTANT, content=reply, session_id=session_id
        )
        return Response({"session_id": session_id, "reply": reply})

    def get(self, request):
        session_id = request.query_params.get("session_id")
        qs = ChatMessage.objects.filter(user=request.user)
        if session_id:
            qs = qs.filter(session_id=session_id)
        return Response(ChatMessageSerializer(qs.order_by("created_at")[:50], many=True).data)


class SummarizeView(APIView):
    def post(self, request):
        source_type = request.data.get("type", "task")
        source_id = request.data.get("id")

        if source_type == "task" and source_id:
            task = Task.objects.filter(id=source_id).first()
            if not task:
                return Response({"detail": "Task not found."}, status=404)
            text = f"{task.title}. {task.description}"
            summary = generate_summary(text, "task")
            task_ai = summary
            insight = AiInsight.objects.create(
                user=request.user, insight_type=AiInsight.InsightType.TASK,
                title=f"Summary: {task.title}", content=summary, source_id=str(task.id),
            )
            return Response(AiInsightSerializer(insight).data)

        if source_type == "meeting" and source_id:
            meeting = Meeting.objects.filter(id=source_id).first()
            if not meeting:
                return Response({"detail": "Meeting not found."}, status=404)
            text = f"{meeting.title}. Agenda: {meeting.agenda}. Minutes: {meeting.minutes}"
            summary = generate_summary(text, "meeting")
            insight = AiInsight.objects.create(
                user=request.user, insight_type=AiInsight.InsightType.MEETING,
                title=f"Summary: {meeting.title}", content=summary, source_id=str(meeting.id),
            )
            return Response(AiInsightSerializer(insight).data)

        if source_type == "daily":
            from django.utils import timezone
            updates = DailyUpdate.objects.filter(date=timezone.now().date())
            text = "\n".join(f"{u.user}: {u.work_done}" for u in updates[:20])
            summary = generate_summary(text or "No updates today.", "daily report")
            insight = AiInsight.objects.create(
                user=request.user, insight_type=AiInsight.InsightType.DAILY,
                title="Daily Report Summary", content=summary,
            )
            return Response(AiInsightSerializer(insight).data)

        return Response({"detail": "Invalid type or id."}, status=400)


class InsightsView(APIView):
    def get(self, request):
        qs = AiInsight.objects.filter(user=request.user)[:20]
        return Response(AiInsightSerializer(qs, many=True).data)
