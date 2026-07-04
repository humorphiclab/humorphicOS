from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import KnowledgeArticle
from .serializers import KnowledgeArticleSerializer


class KnowledgeArticleViewSet(viewsets.ModelViewSet):
    queryset = KnowledgeArticle.objects.select_related("author", "department", "project").filter(is_published=True)
    serializer_class = KnowledgeArticleSerializer
    search_fields = ("title", "content", "tags")
    filterset_fields = ("article_type", "department", "project")
    lookup_field = "slug"

    @action(detail=True, methods=["post"])
    def view(self, request, slug=None):
        article = self.get_object()
        article.view_count += 1
        article.save(update_fields=["view_count"])
        return Response(KnowledgeArticleSerializer(article).data)
