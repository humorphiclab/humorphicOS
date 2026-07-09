from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import serializers

from apps.accounts.rbac import RBACMixin  # type: ignore

from .models import Channel, ChannelMessage, DirectMessage, FriendRequest
from .serializers import (
    ChannelMessageSerializer,
    ChannelSerializer,
    DirectMessageSerializer,
    FriendRequestSerializer,
)


class ChannelViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "chat"
    rbac_action_map = {"messages": "create"}
    queryset = Channel.objects.select_related("created_by", "team", "department").prefetch_related("members")  # type: ignore
    serializer_class = ChannelSerializer
    lookup_field = "slug"

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return self.queryset
        return self.queryset.filter(Q(members=user) | Q(is_private=False)).distinct()

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


class DirectMessageViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "chat"
    rbac_action_map = {"conversation": "read", "contacts": "read"}
    serializer_class = DirectMessageSerializer
    http_method_names = ["get", "post", "patch"]

    def get_queryset(self):
        user = self.request.user
        return DirectMessage.objects.filter(  # type: ignore
            Q(sender=user) | Q(recipient=user)
        ).select_related("sender", "recipient")

    @action(detail=False, methods=["get"])
    def conversation(self, request):
        other_id = request.query_params.get("user")
        if not other_id:
            return Response({"detail": "user param required."}, status=400)
        msgs = DirectMessage.objects.filter(  # type: ignore
            Q(sender=request.user, recipient_id=other_id)
            | Q(sender_id=other_id, recipient=request.user)
        ).select_related("sender", "recipient").order_by("created_at")
        DirectMessage.objects.filter(  # type: ignore
            sender_id=other_id, recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response(DirectMessageSerializer(msgs, many=True).data)

    @action(detail=False, methods=["get"])
    def contacts(self, request):
        user = request.user
        
        # If user is admin/superuser, they can chat with everyone in the club
        is_admin = user.is_superuser or (user.role and user.role.slug in ("super_admin", "president", "vice_president", "faculty"))
        if is_admin:
            from apps.accounts.models import User as ClubUser
            users = ClubUser.objects.filter(is_active=True).exclude(id=user.id).select_related("role")
            from apps.accounts.serializers import UserListSerializer
            return Response(UserListSerializer(users, many=True).data)
            
        # Otherwise, they can chat with:
        # 1. Their accepted friends
        accepted_requests = FriendRequest.objects.filter(
            Q(sender=user) | Q(receiver=user),
            status=FriendRequest.Status.ACCEPTED
        ).select_related("sender", "receiver")
        
        friend_ids = set()
        for req in accepted_requests:
            other = req.receiver if req.sender == user else req.sender
            friend_ids.add(other.id)
            
        # 2. All admins / superusers
        from apps.accounts.models import User as ClubUser
        admins = ClubUser.objects.filter(
            Q(is_superuser=True) | Q(role__slug__in=("super_admin", "president", "vice_president", "faculty")),
            is_active=True
        ).exclude(id=user.id)
        
        admin_ids = set(admins.values_list("id", flat=True))
        
        # Combined list
        allowed_ids = friend_ids.union(admin_ids)
        allowed_users = ClubUser.objects.filter(id__in=allowed_ids, is_active=True).select_related("role")
        
        from apps.accounts.serializers import UserListSerializer
        return Response(UserListSerializer(allowed_users, many=True).data)


class FriendRequestViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "chat"
    rbac_action_map = {"respond": "update", "friends": "read"}
    serializer_class = FriendRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return FriendRequest.objects.filter(
            Q(sender=user) | Q(receiver=user)
        ).select_related("sender", "receiver")

    def perform_create(self, serializer):
        receiver_id = self.request.data.get("receiver")
        if not receiver_id:
            raise serializers.ValidationError("Receiver is required.")
        
        if int(receiver_id) == self.request.user.id:
            raise serializers.ValidationError("You cannot send a friend request to yourself.")
        
        # Check if they are already friends or a pending request exists
        existing = FriendRequest.objects.filter(
            (Q(sender=self.request.user, receiver_id=receiver_id) | Q(sender_id=receiver_id, receiver=self.request.user))
        ).first()

        if existing:
            if existing.status == FriendRequest.Status.ACCEPTED:
                raise serializers.ValidationError("You are already friends.")
            elif existing.status == FriendRequest.Status.PENDING:
                raise serializers.ValidationError("A friend request is already pending.")
            else:
                # If previously rejected, allow sending again by updating the status to pending and resetting sender
                existing.status = FriendRequest.Status.PENDING
                existing.sender = self.request.user
                existing.receiver_id = receiver_id
                existing.save()
                serializer.instance = existing
                return

        serializer.save(sender=self.request.user)
        
        # Notify receiver
        from apps.notifications.services import send_notification_to_user
        receiver = serializer.instance.receiver
        send_notification_to_user(
            user=receiver,
            pref_key="messages",
            title="New Friend Request",
            message=f"{self.request.user.get_full_name() or self.request.user.email} sent you a friend request.",
            link="/chat",
            priority="normal"
        )

    @action(detail=True, methods=["post"])
    def respond(self, request, pk=None):
        friend_request = self.get_object()
        if friend_request.receiver != request.user:
            return Response({"detail": "You can only respond to requests sent to you."}, status=400)
        
        action_choice = request.data.get("action")
        if action_choice not in ["accept", "reject"]:
            return Response({"detail": "Action must be 'accept' or 'reject'."}, status=400)

        if action_choice == "accept":
            friend_request.status = FriendRequest.Status.ACCEPTED
            # Notify sender
            from apps.notifications.services import send_notification_to_user
            send_notification_to_user(
                user=friend_request.sender,
                pref_key="messages",
                title="Friend Request Accepted",
                message=f"{request.user.get_full_name() or request.user.email} accepted your friend request.",
                link="/chat",
                priority="normal"
            )
        else:
            friend_request.status = FriendRequest.Status.REJECTED

        friend_request.save()
        return Response(FriendRequestSerializer(friend_request).data)

    @action(detail=False, methods=["get"])
    def friends(self, request):
        user = request.user
        accepted_requests = FriendRequest.objects.filter(
            Q(sender=user) | Q(receiver=user),
            status=FriendRequest.Status.ACCEPTED
        ).select_related("sender", "receiver")
        
        friends = []
        for req in accepted_requests:
            other = req.receiver if req.sender == user else req.sender
            friends.append(other)
            
        from apps.accounts.serializers import UserListSerializer
        return Response(UserListSerializer(friends, many=True).data)

