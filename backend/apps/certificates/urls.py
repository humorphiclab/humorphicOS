from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CertificateTemplateViewSet, CertificateViewSet

router = DefaultRouter()
router.register("templates", CertificateTemplateViewSet, basename="cert-template")
router.register("", CertificateViewSet, basename="certificate")

urlpatterns = [path("", include(router.urls))]
