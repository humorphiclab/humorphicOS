from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import Organization, OrganizationMember


class OrganizationSerializer(serializers.ModelSerializer):
    owner_detail = UserListSerializer(source="owner", read_only=True)
    member_count = serializers.IntegerField(source="memberships.count", read_only=True)

    class Meta:
        model = Organization
        fields = (
            "id", "name", "slug", "description", "logo", "website",
            "owner", "owner_detail", "is_active", "settings", "member_count", "created_at",
        )
        read_only_fields = ("owner", "created_at")

    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        org = super().create(validated_data)
        OrganizationMember.objects.create(
            organization=org, user=self.context["request"].user, org_role=OrganizationMember.OrgRole.OWNER
        )
        return org


class OrganizationMemberSerializer(serializers.ModelSerializer):
    user_detail = UserListSerializer(source="user", read_only=True)

    class Meta:
        model = OrganizationMember
        fields = ("id", "organization", "user", "user_detail", "org_role", "joined_at")
