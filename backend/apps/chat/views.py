from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Channel, ChannelMessage, DirectMessage
from .serializers import ChannelMessageSerializer, ChannelSerializer, DirectMessageSerializer


class ChannelViewSet(viewsets.ModelViewSet):
    queryset = Channel.objects.select_related("created_by", "team", "department").prefetch_related("members")
    serializer_class = ChannelSerializer
    lookup_field = "slug"

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return self.queryset
        return self.queryset.filter(members=user)

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, slug=None):
        channel = self.get_object()
        if request.method == "GET":
            msgs = channel.messages.select_related("author").order_by("-created_at")[:100]
            return Response(ChannelMessageSerializer(reversed(list(msgs)), many=True).data)
        serializer = ChannelMessageSerializer(
            data={**request.data, "channel": channel.id}, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(channel=channel)
        return Response(serializer.data, status=201)


class DirectMessageViewSet(viewsets.ModelViewSet):
    serializer_class = DirectMessageSerializer
    http_method_names = ["get", "post", "patch"]

    def get_queryset(self):
        user = self.request.user
        return DirectMessage.objects.filter(
            Q(sender=user) | Q(recipient=user)
        ).select_related("sender", "recipient")

    @action(detail=False, methods=["get"])
    def conversation(self, request):
        other_id = request.query_params.get("user")
        if not other_id:
            return Response({"detail": "user param required."}, status=400)
        msgs = DirectMessage.objects.filter(
            Q(sender=request.user, recipient_id=other_id)
            | Q(sender_id=other_id, recipient=request.user)
        ).select_related("sender", "recipient").order_by("created_at")
        DirectMessage.objects.filter(
            sender_id=other_id, recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response(DirectMessageSerializer(msgs, many=True).data)
