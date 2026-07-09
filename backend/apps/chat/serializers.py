from rest_framework import serializers
from django.db import models

from apps.accounts.serializers import UserListSerializer

from .models import Channel, ChannelMessage, DirectMessage, FriendRequest


class ChannelSerializer(serializers.ModelSerializer):
    created_by_detail = UserListSerializer(source="created_by", read_only=True)
    member_count = serializers.IntegerField(source="members.count", read_only=True)

    class Meta:
        model = Channel
        fields = (
            "id", "name", "slug", "description", "team", "department",
            "members", "is_private", "created_by", "created_by_detail", "member_count", "created_at",
        )
        read_only_fields = ("created_by", "created_at")

    def create(self, validated_data):
        members = validated_data.pop("members", [])
        validated_data["created_by"] = self.context["request"].user
        channel = super().create(validated_data)
        channel.members.add(self.context["request"].user)
        if members:
            channel.members.add(*members)
        return channel


class ChannelMessageSerializer(serializers.ModelSerializer):
    author_detail = UserListSerializer(source="author", read_only=True)

    class Meta:
        model = ChannelMessage
        fields = ("id", "channel", "author", "author_detail", "content", "is_pinned", "file_url", "created_at")
        read_only_fields = ("author", "created_at")

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)


class DirectMessageSerializer(serializers.ModelSerializer):
    sender_detail = UserListSerializer(source="sender", read_only=True)
    recipient_detail = UserListSerializer(source="recipient", read_only=True)

    class Meta:
        model = DirectMessage
        fields = (
            "id", "sender", "sender_detail", "recipient", "recipient_detail",
            "content", "is_read", "file_url", "created_at",
        )
        read_only_fields = ("sender", "created_at")

    def create(self, validated_data):
        sender = self.context["request"].user
        recipient = validated_data.get("recipient")

        # Let's perform validation:
        # 1. Sender and recipient cannot be the same
        if sender == recipient:
            raise serializers.ValidationError("You cannot send a message to yourself.")

        # 2. Check if sender or recipient is admin / superuser
        is_sender_admin = sender.is_superuser or (sender.role and sender.role.slug in ("super_admin", "president"))
        is_recipient_admin = recipient.is_superuser or (recipient.role and recipient.role.slug in ("super_admin", "president"))

        if not (is_sender_admin or is_recipient_admin):
            # Regular members must be friends (accepted friend request in either direction)
            friends = FriendRequest.objects.filter(
                (models.Q(sender=sender, receiver=recipient) | models.Q(sender=recipient, receiver=sender)),
                status=FriendRequest.Status.ACCEPTED
            ).exists()
            if not friends:
                raise serializers.ValidationError("You must be friends with this member to send them a message.")

        validated_data["sender"] = sender
        return super().create(validated_data)


class FriendRequestSerializer(serializers.ModelSerializer):
    sender_detail = UserListSerializer(source="sender", read_only=True)
    receiver_detail = UserListSerializer(source="receiver", read_only=True)

    class Meta:
        model = FriendRequest
        fields = ("id", "sender", "sender_detail", "receiver", "receiver_detail", "status", "created_at", "updated_at")
        read_only_fields = ("sender", "status", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["sender"] = self.context["request"].user
        return super().create(validated_data)

