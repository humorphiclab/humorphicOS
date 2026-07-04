from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import Certificate, CertificateTemplate


class CertificateTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificateTemplate
        fields = "__all__"


class CertificateSerializer(serializers.ModelSerializer):
    recipient_detail = UserListSerializer(source="recipient", read_only=True)
    template_detail = CertificateTemplateSerializer(source="template", read_only=True)

    class Meta:
        model = Certificate
        fields = (
            "id", "certificate_id", "template", "template_detail", "recipient",
            "recipient_detail", "title", "event_name", "issued_by", "issued_at", "verification_code",
        )
        read_only_fields = ("certificate_id", "issued_by", "issued_at", "verification_code")

    def create(self, validated_data):
        validated_data["issued_by"] = self.context["request"].user
        return super().create(validated_data)
