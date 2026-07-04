from django.urls import path

from .views import ChatView, InsightsView, SummarizeView

urlpatterns = [
    path("chat/", ChatView.as_view(), name="ai-chat"),
    path("summarize/", SummarizeView.as_view(), name="ai-summarize"),
    path("insights/", InsightsView.as_view(), name="ai-insights"),
]
