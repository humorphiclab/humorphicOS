from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/organizations/", include("apps.organizations.urls")),
    path("api/v1/departments/", include("apps.departments.urls")),
    path("api/v1/teams/", include("apps.teams.urls")),
    path("api/v1/projects/", include("apps.projects.urls")),
    path("api/v1/tasks/", include("apps.tasks.urls")),
    path("api/v1/daily-updates/", include("apps.daily_updates.urls")),
    path("api/v1/meetings/", include("apps.meetings.urls")),
    path("api/v1/attendance/", include("apps.attendance.urls")),
    path("api/v1/announcements/", include("apps.announcements.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/reports/", include("apps.reports.urls")),
    path("api/v1/inventory/", include("apps.inventory.urls")),
    path("api/v1/knowledge/", include("apps.knowledge.urls")),
    path("api/v1/certificates/", include("apps.certificates.urls")),
    path("api/v1/events/", include("apps.events.urls")),
    path("api/v1/chat/", include("apps.chat.urls")),
    path("api/v1/gamification/", include("apps.gamification.urls")),
    path("api/v1/ai/", include("apps.ai_module.urls")),
    path("api/v1/calendar/", include("apps.calendar_app.urls")),
    path("api/v1/search/", include("apps.search_app.urls")),
    path("api/v1/analytics/", include("apps.analytics.urls")),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
