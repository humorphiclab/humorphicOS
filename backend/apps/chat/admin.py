from django.contrib import admin

from .models import Channel, ChannelMessage, DirectMessage

admin.site.register(Channel)
admin.site.register(ChannelMessage)
admin.site.register(DirectMessage)
