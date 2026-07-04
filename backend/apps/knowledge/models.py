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
    content = models.TextField()
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
    is_published = models.BooleanField(default=True)
    view_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title
