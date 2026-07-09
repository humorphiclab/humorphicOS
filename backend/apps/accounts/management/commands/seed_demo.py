from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

# pyrefly: ignore [missing-import]
from apps.accounts.models import Role, User
# pyrefly: ignore [missing-import]
from apps.departments.models import Department
# pyrefly: ignore [missing-import]
from apps.teams.models import Team
# pyrefly: ignore [missing-import]
from apps.projects.models import Project
# pyrefly: ignore [missing-import]
from apps.tasks.models import Task
# pyrefly: ignore [missing-import]
from apps.announcements.models import Announcement
# pyrefly: ignore [missing-import]
from apps.gamification.models import Badge, UserProfile
# pyrefly: ignore [missing-import]
from apps.inventory.models import Component, Equipment
# pyrefly: ignore [missing-import]
from apps.knowledge.models import KnowledgeArticle
# pyrefly: ignore [missing-import]
from apps.events.models import Event
# pyrefly: ignore [missing-import]
from apps.organizations.models import Organization, OrganizationMember
# pyrefly: ignore [missing-import]
from apps.meetings.models import Meeting
# pyrefly: ignore [missing-import]
from apps.attendance.models import Holiday
# pyrefly: ignore [missing-import]
from apps.chat.models import Channel
# pyrefly: ignore [missing-import]
from apps.certificates.models import CertificateTemplate


DEPARTMENTS = [
    ("AI", "ai"), ("Machine Learning", "ml"), ("Computer Vision", "cv"),
    ("Embedded", "embedded"), ("Electronics", "electronics"), ("Mechanical", "mechanical"),
    ("Research", "research"), ("Design", "design"), ("Marketing", "marketing"),
    ("Management", "management"), ("Finance", "finance"), ("Documentation", "documentation"),
    ("Media", "media"),
]


class Command(BaseCommand):
    help = "Seed demo data for HumorphicOS"

    def handle(self, *args, **options):
        self.stdout.write("Seeding demo data...")

        for name, slug in DEPARTMENTS:
            Department.objects.get_or_create(slug=slug, defaults={"name": name})

        admin, _ = User.objects.get_or_create(
            email="president@humorphic.club",
            defaults={"username": "president", "first_name": "Club", "last_name": "President"},
        )
        # Always set the demo password so re-running seed never leaves unknown credentials
        admin.set_password("Demo@12345")
        president_role = Role.objects.filter(slug="president").first()
        if president_role:
            admin.role = president_role
        admin.is_staff = True
        admin.is_superuser = True
        admin.save()

        org, _ = Organization.objects.get_or_create(
            slug="humorphic-robotics",
            defaults={"name": "Humorphic Robotics Club", "owner": admin, "description": "Official club org"},
        )
        OrganizationMember.objects.get_or_create(organization=org, user=admin, defaults={"org_role": "owner"})

        ai_dept = Department.objects.get(slug="ai")
        team, _ = Team.objects.get_or_create(
            slug="ai-core",
            defaults={"name": "AI Core Team", "lead": admin},
        )
        team.members.add(admin)

        project, _ = Project.objects.get_or_create(
            slug="autonomous-rover",
            defaults={
                "title": "Autonomous Rover",
                "description": "Build an autonomous navigation rover using computer vision.",
                "owner": admin, "department": ai_dept,
                "status": "active", "health": "on_track", "completion_percentage": 35,
            },
        )
        project.members.add(admin)
        team.project = project
        team.save()

        Task.objects.get_or_create(
            title="Setup ROS2 environment",
            project=project,
            defaults={"assignee": admin, "assigned_by": admin, "priority": "high", "status": "in_progress", "due_date": timezone.now().date() + timedelta(days=3)},
        )
        Task.objects.get_or_create(
            title="Integrate camera module",
            project=project,
            defaults={"assignee": admin, "assigned_by": admin, "priority": "medium", "status": "todo", "due_date": timezone.now().date() + timedelta(days=7)},
        )

        Announcement.objects.get_or_create(
            title="Welcome to HumorphicOS!",
            defaults={"content": "All club operations are now centralized on HumorphicOS.", "author": admin, "priority": "general", "is_pinned": True},
        )

        Badge.objects.get_or_create(slug="first-task", defaults={"name": "First Task", "description": "Complete your first task", "xp_required": 10})
        Badge.objects.get_or_create(slug="daily-streak", defaults={"name": "Daily Streak", "description": "Submit 7 daily updates", "xp_required": 70})
        UserProfile.objects.get_or_create(user=admin, defaults={"xp": 150, "level": 2, "tasks_completed": 5})

        Component.objects.get_or_create(sku="ESP32-001", defaults={"name": "ESP32 Dev Board", "category": "controller", "quantity": 12, "min_stock": 5, "location": "Lab A"})
        Component.objects.get_or_create(sku="HC-SR04", defaults={"name": "Ultrasonic Sensor HC-SR04", "category": "sensor", "quantity": 2, "min_stock": 5, "location": "Lab A"})
        Equipment.objects.get_or_create(serial_number="ROVER-001", defaults={"name": "Autonomous Rover Prototype", "status": "in_use", "assigned_to": admin})

        KnowledgeArticle.objects.get_or_create(
            slug="getting-started-ros2",
            defaults={"title": "Getting Started with ROS2", "content": "ROS2 setup guide for beginners.", "author": admin, "article_type": "tutorial", "department": ai_dept},
        )

        Event.objects.get_or_create(
            slug="robotics-workshop-2026",
            defaults={
                "title": "Robotics Workshop 2026", "description": "Hands-on robotics workshop for new members.",
                "event_type": "workshop", "organizer": admin, "start_time": timezone.now() + timedelta(days=14),
                "end_time": timezone.now() + timedelta(days=14, hours=3), "location": "Lab Block A", "is_public": True,
            },
        )

        Meeting.objects.get_or_create(
            title="Weekly Club Sync",
            defaults={
                "organizer": admin,
                "agenda": "Project updates, task assignments, and blockers.",
                "meet_link": "https://meet.google.com/demo-link",
                "start_time": timezone.now() + timedelta(days=2),
                "end_time": timezone.now() + timedelta(days=2, hours=1),
            },
        )

        Holiday.objects.get_or_create(
            date=timezone.now().date().replace(month=8, day=15),
            defaults={"name": "Independence Day", "description": "National holiday"},
        )

        channel, _ = Channel.objects.get_or_create(
            slug="general",
            defaults={"name": "general", "description": "General club discussion", "created_by": admin},
        )
        channel.members.add(admin)

        CertificateTemplate.objects.get_or_create(
            name="Workshop Participation",
            defaults={
                "template_type": "workshop",
                "html_template": "<h1>Certificate of Participation</h1><p>{{name}} completed {{event}} on {{date}}</p>",
            },
        )

        self.stdout.write(self.style.SUCCESS("Demo data seeded! Login: president@humorphic.club / Demo@12345"))
