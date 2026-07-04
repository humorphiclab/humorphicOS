from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Organization, OrganizationMember
from .serializers import OrganizationMemberSerializer, OrganizationSerializer


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.select_related("owner").filter(is_active=True)
    serializer_class = OrganizationSerializer
    lookup_field = "slug"

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def public(self, request):
        orgs = self.queryset[:20]
        return Response(OrganizationSerializer(orgs, many=True).data)

    @action(detail=True, methods=["get", "post"])
    def members(self, request, slug=None):
        org = self.get_object()
        if request.method == "GET":
            members = org.memberships.select_related("user")
            return Response(OrganizationMemberSerializer(members, many=True).data)
        user_id = request.data.get("user")
        role = request.data.get("org_role", OrganizationMember.OrgRole.MEMBER)
        member, created = OrganizationMember.objects.get_or_create(
            organization=org, user_id=user_id, defaults={"org_role": role}
        )
        if not created:
            return Response({"detail": "Already a member."}, status=400)
        return Response(OrganizationMemberSerializer(member).data, status=201)
