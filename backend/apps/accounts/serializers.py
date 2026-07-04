from rest_framework import serializers

from .models import Permission, Role, User, AuditLog


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ("id", "name", "slug", "description", "is_leadership", "priority")


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ("id", "resource", "action")


class UserListSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "email", "username", "first_name", "last_name", "full_name",
            "phone", "avatar", "role", "college", "branch", "year", "skills",
            "linkedin", "github", "portfolio", "bio", "is_active", "last_active",
            "date_joined",
        )


class UserDetailSerializer(UserListSerializer):
    class Meta(UserListSerializer.Meta):
        fields = UserListSerializer.Meta.fields + ("is_email_verified", "two_factor_enabled")


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = (
            "email", "username", "password", "first_name", "last_name",
            "phone", "college", "branch", "year",
        )

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        member_role = Role.objects.filter(slug=Role.Slug.MEMBER).first()
        if member_role:
            user.role = member_role
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "first_name", "last_name", "phone", "avatar", "college", "branch",
            "year", "skills", "linkedin", "github", "portfolio", "bio",
        )


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = AuditLog
        fields = ("id", "user", "user_name", "action", "resource", "resource_id", "details", "ip_address", "created_at")
