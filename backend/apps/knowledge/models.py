from django.conf import settings
from django.db import models


class KnowledgeArticle(models.Model):
    class ArticleType(models.TextChoices):
        DOCUMENTATION = "documentation", "Documentation"
        RESEARCH = "research", "Research Paper"
        TUTORIAL = "tutorial", "Tutorial"
        MEETING_NOTES = "meeting_notes", "Meeting Notes"
        DESIGN = "design", "Design File"
        FAQ = "faq", "FAQ"
        WIKI = "wiki", "Project Wiki"

    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=300, unique=True)
    content = models.TextField(blank=True)
    article_type = models.CharField(max_length=20, choices=ArticleType.choices, default=ArticleType.DOCUMENTATION)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="knowledge_articles")
    department = models.ForeignKey(
        "departments.Department", on_delete=models.SET_NULL, null=True, blank=True
    )
    project = models.ForeignKey(
        "projects.Project", on_delete=models.SET_NULL, null=True, blank=True
    )
    tags = models.JSONField(default=list, blank=True)
    file_url = models.URLField(blank=True)
    file_upload = models.FileField(upload_to="knowledge_files/", null=True, blank=True)
    
    class MaterialFormat(models.TextChoices):
        PDF = "pdf", "PDF"
        DOCX = "docx", "DOCX"
        MARKDOWN = "md", "Markdown"
        YOUTUBE = "youtube", "YouTube Video"
        OTHER = "other", "Other"
        
    material_format = models.CharField(
        max_length=20, choices=MaterialFormat.choices, default=MaterialFormat.OTHER
    )

    is_published = models.BooleanField(default=True)
    view_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title


class KnowledgeQuestion(models.Model):
    article = models.ForeignKey(KnowledgeArticle, on_delete=models.CASCADE, related_name="questions")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="knowledge_questions")
    question_text = models.TextField()
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Question by {self.author} on {self.article.title}"


class KnowledgeAnswer(models.Model):
    question = models.ForeignKey(KnowledgeQuestion, on_delete=models.CASCADE, related_name="answers")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="knowledge_answers")
    answer_text = models.TextField()
    is_accepted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Answer by {self.author} on {self.question}"
