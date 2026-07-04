from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import Channel, ChannelMessage, DirectMessage


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
        validated_data["sender"] = self.context["request"].user
        return super().create(validated_data)
