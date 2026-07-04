from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response


class GlobalSearchView(APIView):
    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if len(q) < 2:
            return Response({"query": q, "results": []})

        from apps.accounts.models import User
        from apps.tasks.models import Task
        from apps.projects.models import Project
        from apps.meetings.models import Meeting
        from apps.knowledge.models import KnowledgeArticle
        from apps.announcements.models import Announcement

        results = []
        for u in User.objects.filter(Q(first_name__icontains=q) | Q(last_name__icontains=q) | Q(email__icontains=q))[:5]:
            results.append({"type": "member", "id": u.id, "title": u.get_full_name(), "subtitle": u.email, "url": f"/members/{u.id}"})
        for t in Task.objects.filter(Q(title__icontains=q) | Q(description__icontains=q))[:5]:
            results.append({"type": "task", "id": t.id, "title": t.title, "subtitle": t.status, "url": f"/tasks/{t.id}"})
        for p in Project.objects.filter(Q(title__icontains=q) | Q(description__icontains=q))[:5]:
            results.append({"type": "project", "id": p.id, "title": p.title, "subtitle": p.status, "url": f"/projects/{p.slug}"})
        for m in Meeting.objects.filter(Q(title__icontains=q) | Q(agenda__icontains=q))[:5]:
            results.append({"type": "meeting", "id": m.id, "title": m.title, "subtitle": str(m.start_time), "url": "/meetings"})
        for k in KnowledgeArticle.objects.filter(Q(title__icontains=q) | Q(content__icontains=q), is_published=True)[:5]:
            results.append({"type": "knowledge", "id": k.id, "title": k.title, "subtitle": k.article_type, "url": f"/knowledge/{k.slug}"})
        for a in Announcement.objects.filter(Q(title__icontains=q) | Q(content__icontains=q), is_active=True)[:5]:
            results.append({"type": "announcement", "id": a.id, "title": a.title, "subtitle": a.priority, "url": "/announcements"})

        return Response({"query": q, "count": len(results), "results": results})
