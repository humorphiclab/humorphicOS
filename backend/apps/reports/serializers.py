from rest_framework import serializers

from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = (
            "id", "title", "report_type", "generated_by",
            "data", "period_start", "period_end", "created_at",
        )
        read_only_fields = ("generated_by", "data", "created_at")
