from django.urls import path
from .views import AnalyticsDashboardView, PerformanceTrendsView

urlpatterns = [
    path("dashboard/", AnalyticsDashboardView.as_view()),
    path("trends/", PerformanceTrendsView.as_view()),
]
