from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import KnowledgeArticle, KnowledgeQuestion, KnowledgeAnswer


class KnowledgeAnswerSerializer(serializers.ModelSerializer):
    author_detail = UserListSerializer(source="author", read_only=True)

    class Meta:
        model = KnowledgeAnswer
        fields = ("id", "question", "author", "author_detail", "answer_text", "is_accepted", "created_at", "updated_at")
        read_only_fields = ("author", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)


class KnowledgeQuestionSerializer(serializers.ModelSerializer):
    author_detail = UserListSerializer(source="author", read_only=True)
    answers = KnowledgeAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = KnowledgeQuestion
        fields = ("id", "article", "author", "author_detail", "question_text", "is_resolved", "answers", "created_at", "updated_at")
        read_only_fields = ("author", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)


class KnowledgeArticleSerializer(serializers.ModelSerializer):
    author_detail = UserListSerializer(source="author", read_only=True)
    questions = KnowledgeQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = KnowledgeArticle
        fields = (
            "id", "title", "slug", "content", "article_type", "material_format", 
            "author", "author_detail", "department", "project", "tags", 
            "file_url", "file_upload", "is_published", "view_count", 
            "questions", "created_at", "updated_at",
        )
        read_only_fields = ("author", "view_count", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)
