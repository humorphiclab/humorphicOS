from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts.rbac import RBACMixin

from .models import Event, EventRegistration
from .serializers import EventRegistrationSerializer, EventSerializer


class EventViewSet(RBACMixin, viewsets.ModelViewSet):
    rbac_resource = "events"
    rbac_action_map = {"register": "create", "feedback": "update"}
    queryset = Event.objects.select_related("organizer").filter(is_active=True)
    serializer_class = EventSerializer
    search_fields = ("title", "description")
    filterset_fields = ("event_type", "is_public")
    lookup_field = "slug"

    def get_permissions(self):
        if self.action in ("list", "retrieve") and self.request.query_params.get("public"):
            return [AllowAny()]
        return super().get_permissions()

    @action(detail=True, methods=["post"])
    def register(self, request, slug=None):
        event = self.get_object()
        reg, created = EventRegistration.objects.get_or_create(event=event, user=request.user)
        if not created:
            return Response({"detail": "Already registered."}, status=400)
        return Response(EventRegistrationSerializer(reg).data, status=201)

    @action(detail=True, methods=["post"])
    def feedback(self, request, slug=None):
        event = self.get_object()
        reg = EventRegistration.objects.filter(event=event, user=request.user).first()
        if not reg:
            return Response({"detail": "Not registered."}, status=400)
        reg.feedback = request.data.get("feedback", "")
        reg.rating = request.data.get("rating")
        reg.attended = True
        reg.save()
        return Response(EventRegistrationSerializer(reg).data)


class EventRegistrationViewSet(RBACMixin, viewsets.ReadOnlyModelViewSet):
    rbac_resource = "events"
    serializer_class = EventRegistrationSerializer
    filterset_fields = ("event", "user")

    def get_queryset(self):
        return EventRegistration.objects.select_related("event", "user")
