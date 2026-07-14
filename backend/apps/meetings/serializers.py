from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer
from apps.departments.serializers import DepartmentSerializer
from apps.teams.serializers import TeamSerializer
from apps.departments.models import Department
from apps.teams.models import Team

from .models import Meeting, MeetingAttendance


class MeetingAttendanceSerializer(serializers.ModelSerializer):
    user_detail = UserListSerializer(source="user", read_only=True)

    class Meta:
        model = MeetingAttendance
        fields = ("id", "user", "user_detail", "status", "joined_at", "notes")


def generate_google_meet_link_via_oauth(title, start_time, end_time, agenda="", description=""):
    import json
    import urllib.request
    import urllib.parse
    import uuid
    import logging
    from django.conf import settings

    logger = logging.getLogger(__name__)
    refresh_token = getattr(settings, "GOOGLE_CALENDAR_REFRESH_TOKEN", None)
    client_id = getattr(settings, "GOOGLE_CLIENT_ID", None)
    client_secret = getattr(settings, "GOOGLE_CLIENT_SECRET", None)

    if not refresh_token or not client_id or not client_secret:
        logger.info("Google Calendar credentials not fully configured. Skipping Meet link generation.")
        return None

    try:
        # 1. Exchange refresh token for access token
        token_url = "https://oauth2.googleapis.com/token"
        token_data = urllib.parse.urlencode({
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token"
        }).encode("utf-8")

        req = urllib.request.Request(token_url, data=token_data, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            token_resp = json.loads(resp.read().decode("utf-8"))
            access_token = token_resp.get("access_token")

        if not access_token:
            logger.error("Failed to retrieve access token from Google OAuth endpoint.")
            return None

        # 2. Create the calendar event requesting Hangouts Meet
        start_iso = start_time.isoformat() if hasattr(start_time, "isoformat") else str(start_time)
        end_iso = end_time.isoformat() if hasattr(end_time, "isoformat") else str(end_time)

        if start_iso and "+" not in start_iso and "-" not in start_iso.split("T")[-1]:
            start_iso += "Z"
        if end_iso and "+" not in end_iso and "-" not in end_iso.split("T")[-1]:
            end_iso += "Z"

        event_url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1"
        event_payload = {
            "summary": title,
            "description": agenda or description or "Club meeting scheduled via HumorphicOS.",
            "start": { "dateTime": start_iso },
            "end": { "dateTime": end_iso },
            "conferenceData": {
                "createRequest": {
                    "requestId": f"meet-{uuid.uuid4()}",
                    "conferenceSolutionKey": { "type": "hangoutsMeet" }
                }
            }
        }

        event_data = json.dumps(event_payload).encode("utf-8")
        event_req = urllib.request.Request(
            event_url,
            data=event_data,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            method="POST"
        )

        with urllib.request.urlopen(event_req, timeout=10) as resp:
            event_resp = json.loads(resp.read().decode("utf-8"))

        meet_link = event_resp.get("hangoutLink")
        if not meet_link:
            entry_points = event_resp.get("conferenceData", {}).get("entryPoints", [])
            for ep in entry_points:
                if ep.get("entryPointType") == "video":
                    meet_link = ep.get("uri")
                    break

        return meet_link
    except Exception as e:
        logger.error(f"Failed to generate Google Meet link via Calendar API: {e}")
        return None


class MeetingSerializer(serializers.ModelSerializer):
    organizer_detail = UserListSerializer(source="organizer", read_only=True)
    participants_detail = UserListSerializer(source="participants", many=True, read_only=True)
    attendance_records = MeetingAttendanceSerializer(many=True, read_only=True)
    department_detail = DepartmentSerializer(source="department", read_only=True)
    team_detail = TeamSerializer(source="team", read_only=True)
    meet_link = serializers.URLField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Meeting
        fields = (
            "id", "title", "description", "agenda", "meet_link", "recording_link",
            "location", "organizer", "organizer_detail", "participants", "participants_detail",
            "department", "department_detail", "team", "team_detail", "start_time", "end_time", 
            "minutes", "action_items", "ai_summary", "attendance_records", "created_at",
        )
        read_only_fields = ("organizer", "ai_summary", "created_at")

    def validate(self, attrs):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication credentials were not provided.")

        user = request.user
        role_slug = user.role.slug if user.role else None

        # 1. President, Vice President, Founder, Superuser can create any meetings
        is_global_organizer = user.is_superuser or role_slug in ["founder", "president", "vice_president"]
        if is_global_organizer:
            return attrs

        # 2. Others must specify a department or team they lead
        department = attrs.get("department")
        team = attrs.get("team")

        if not department and not team:
            raise serializers.ValidationError(
                "You do not have permission to create global meetings. Only President and Vice President can create global meetings."
            )

        is_authorized = False

        if department:
            if department.head == user:
                is_authorized = True
            else:
                raise serializers.ValidationError(
                    {"department": "You are not the department head of this department."}
                )

        if team:
            if team.lead == user:
                is_authorized = True
            else:
                raise serializers.ValidationError(
                    {"team": "You are not the team leader of this team."}
                )

        if not is_authorized:
            raise serializers.ValidationError(
                "You must be either the head of the department or lead of the team to schedule this meeting."
            )

        return attrs

    def create(self, validated_data):
        participants = validated_data.pop("participants", [])
        validated_data["organizer"] = self.context["request"].user

        # Auto-generate Google Meet link if credentials are in .env, otherwise fallback to Jitsi Meet
        if not validated_data.get("meet_link"):
            meet_link = None
            start_time = validated_data.get("start_time")
            end_time = validated_data.get("end_time")
            if start_time:
                if not end_time:
                    from datetime import timedelta
                    end_time = start_time + timedelta(hours=1)
                meet_link = generate_google_meet_link_via_oauth(
                    title=validated_data.get("title", "Meeting on my website"),
                    start_time=start_time,
                    end_time=end_time,
                    agenda=validated_data.get("agenda", ""),
                    description=validated_data.get("description", "")
                )
            
            if meet_link:
                validated_data["meet_link"] = meet_link
            else:
                import random
                import string
                part1 = "".join(random.choices(string.ascii_lowercase, k=3))
                part2 = "".join(random.choices(string.ascii_lowercase, k=4))
                part3 = "".join(random.choices(string.ascii_lowercase, k=3))
                validated_data["meet_link"] = f"https://meet.jit.si/humorphic-{part1}-{part2}-{part3}"

        meeting = super().create(validated_data)
        
        if participants:
            meeting.participants.set(participants)
        else:
            from apps.accounts.models import User
            
            department = validated_data.get("department")
            team = validated_data.get("team")
            
            users_to_add = User.objects.filter(is_active=True)
            if department:
                users_to_add = users_to_add.filter(departments=department)
            elif team:
                users_to_add = users_to_add.filter(teams=team)
            
            # Convert to list and ensure organizer is included
            user_list = list(users_to_add)
            organizer = self.context["request"].user
            if organizer not in user_list:
                user_list.append(organizer)
                
            meeting.participants.set(user_list)
            
        return meeting

