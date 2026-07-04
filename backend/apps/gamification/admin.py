from django.contrib import admin

from .models import Achievement, Badge, UserProfile

admin.site.register(Badge)
admin.site.register(UserProfile)
admin.site.register(Achievement)
