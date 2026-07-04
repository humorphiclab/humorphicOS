from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Certificate, CertificateTemplate
from .serializers import CertificateSerializer, CertificateTemplateSerializer


class CertificateTemplateViewSet(viewsets.ModelViewSet):
    queryset = CertificateTemplate.objects.filter(is_active=True)
    serializer_class = CertificateTemplateSerializer


class CertificateViewSet(viewsets.ModelViewSet):
    queryset = Certificate.objects.select_related("recipient", "template", "issued_by")
    serializer_class = CertificateSerializer
    filterset_fields = ("recipient", "template")

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def verify(self, request):
        code = request.query_params.get("code")
        if not code:
            return Response({"detail": "Verification code required."}, status=400)
        try:
            cert = Certificate.objects.select_related("recipient").get(verification_code=code)
            return Response({
                "valid": True,
                "title": cert.title,
                "recipient": cert.recipient.get_full_name(),
                "event_name": cert.event_name,
                "issued_at": cert.issued_at,
            })
        except Certificate.DoesNotExist:
            return Response({"valid": False}, status=404)
