from rest_framework import serializers

from .models import Permission, Role, User, AuditLog


# Roles that can see the full enrollment number (beyond the owner themselves)
PRIVILEGED_ROLE_SLUGS = {"super_admin", "president", "vice_president", "faculty", "mentor"}


def mask_enrollment(enrollment: str) -> str:
    """
    Mask the last 4 digits of the enrollment number.
    Format: CCCCBBYYNNNN → CCCCBBYYXXXX
    """
    if not enrollment or len(enrollment) < 12:
        return enrollment
    return enrollment[:8] + "XXXX"

def mask_phone(phone: str) -> str:
    """
    Mask the phone number (hide middle digits).
    E.g. 9876543210 -> 98XXXX3210
    """
    if not phone or len(phone) < 10:
        return phone
    return phone[:2] + ("X" * (len(phone) - 6)) + phone[-4:]


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
    enrollment_number = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id", "email", "username", "first_name", "last_name", "full_name",
            "phone", "avatar", "role", "enrollment_number", "college", "branch", "batch", "skills",
            "linkedin", "github", "portfolio", "bio", "is_active", "last_active",
            "date_joined", "is_superuser",
        )

    def get_phone(self, obj: User) -> str:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return mask_phone(obj.phone)

        viewer = request.user
        if viewer.id == obj.id or viewer.is_superuser or (viewer.role and viewer.role.slug in PRIVILEGED_ROLE_SLUGS):
            return obj.phone
        return mask_phone(obj.phone)

    def get_enrollment_number(self, obj: User) -> str:
        """Return full enrollment number only for privileged users or the owner."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return mask_enrollment(obj.enrollment_number)

        viewer = request.user
        # Owner always sees their own full number
        if viewer.id == obj.id:
            return obj.enrollment_number
        # Superuser always sees full number
        if viewer.is_superuser:
            return obj.enrollment_number
        # Privileged roles see full number
        if viewer.role and viewer.role.slug in PRIVILEGED_ROLE_SLUGS:
            return obj.enrollment_number
        # Everyone else sees masked number
        return mask_enrollment(obj.enrollment_number)


class UserDetailSerializer(UserListSerializer):
    class Meta(UserListSerializer.Meta):
        fields = UserListSerializer.Meta.fields + ("is_email_verified", "two_factor_enabled")


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = (
            "email", "username", "password", "first_name", "last_name",
            "phone", "enrollment_number", "college", "branch", "batch",
            "avatar", "skills", "linkedin", "github",
        )

    def validate_enrollment_number(self, value: str) -> str:
        if not value:
            return value
        if len(value) != 12:
            raise serializers.ValidationError(
                "Enrollment number must be exactly 12 characters long."
            )
        branch = value[4:6]
        if not branch.isalpha():
            raise serializers.ValidationError(
                "Characters 5–6 of the enrollment number (branch code) must be alphabetic letters (e.g. IA, CS, ME)."
            )
        return value.upper()

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
            "enrollment_number", "batch", "skills", "linkedin", "github", "portfolio", "bio",
        )

    def validate_enrollment_number(self, value: str) -> str:
        if not value:
            return value
        if len(value) != 12:
            raise serializers.ValidationError(
                "Enrollment number must be exactly 12 characters long."
            )
        branch = value[4:6]
        if not branch.isalpha():
            raise serializers.ValidationError(
                "Characters 5–6 of the enrollment number (branch code) must be alphabetic letters (e.g. IA, CS, ME)."
            )
        return value.upper()


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = AuditLog
        fields = ("id", "user", "user_name", "action", "resource", "resource_id", "details", "ip_address", "created_at")
