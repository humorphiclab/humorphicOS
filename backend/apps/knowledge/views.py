from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.rbac import RBACMixin
from apps.accounts.permissions import IsVicePresidentOrAbove

from .models import KnowledgeArticle, KnowledgeQuestion, KnowledgeAnswer
from .serializers import (
    KnowledgeArticleSerializer, 
    KnowledgeQuestionSerializer, 
    KnowledgeAnswerSerializer
)


class KnowledgeArticleViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "knowledge"
    rbac_action_map = {"view": "read"}
    permission_classes = [IsAuthenticated, IsVicePresidentOrAbove]
    queryset = KnowledgeArticle.objects.select_related("author", "department", "project").prefetch_related("questions__answers", "questions__author").filter(is_published=True)
    serializer_class = KnowledgeArticleSerializer
    search_fields = ("title", "content", "tags")
    filterset_fields = ("article_type", "material_format", "department", "project")
    lookup_field = "slug"

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def view(self, request, slug=None):
        article = self.get_object()
        article.view_count += 1
        article.save(update_fields=["view_count"])
        return Response(KnowledgeArticleSerializer(article).data)


class KnowledgeQuestionViewSet(mixins.CreateModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    queryset = KnowledgeQuestion.objects.all()
    serializer_class = KnowledgeQuestionSerializer
    permission_classes = [IsAuthenticated]


class KnowledgeAnswerViewSet(mixins.CreateModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    queryset = KnowledgeAnswer.objects.all()
    serializer_class = KnowledgeAnswerSerializer
    permission_classes = [IsAuthenticated]
