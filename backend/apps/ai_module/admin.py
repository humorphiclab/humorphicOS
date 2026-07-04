from django.contrib import admin

from .models import AiInsight, ChatMessage

admin.site.register(ChatMessage)
admin.site.register(AiInsight)
