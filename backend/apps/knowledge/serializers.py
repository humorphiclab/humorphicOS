from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import KnowledgeArticle


class KnowledgeArticleSerializer(serializers.ModelSerializer):
    author_detail = UserListSerializer(source="author", read_only=True)

    class Meta:
        model = KnowledgeArticle
        fields = (
            "id", "title", "slug", "content", "article_type", "author", "author_detail",
            "department", "project", "tags", "file_url", "is_published",
            "view_count", "created_at", "updated_at",
        )
        read_only_fields = ("author", "view_count", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)
