from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import KnowledgeArticleViewSet, KnowledgeQuestionViewSet, KnowledgeAnswerViewSet

router = DefaultRouter()
router.register("questions", KnowledgeQuestionViewSet, basename="knowledge-questions")
router.register("answers", KnowledgeAnswerViewSet, basename="knowledge-answers")
router.register("", KnowledgeArticleViewSet, basename="knowledge")

urlpatterns = [path("", include(router.urls))]
