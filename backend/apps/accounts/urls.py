from django.urls import path

from .views import (
    AuditLogListView,
    AuthConfigView,
    ChangePasswordView,
    DashboardStatsView,
    GoogleLoginView,
    LoginView,
    MeView,
    RegisterView,
    UserDetailView,
    UserListView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("google/", GoogleLoginView.as_view(), name="google-login"),
    path("config/", AuthConfigView.as_view(), name="auth-config"),
    path("me/", MeView.as_view(), name="me"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("users/", UserListView.as_view(), name="user-list"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="user-detail"),
    path("dashboard/", DashboardStatsView.as_view(), name="dashboard"),
    path("audit-logs/", AuditLogListView.as_view(), name="audit-logs"),
]
