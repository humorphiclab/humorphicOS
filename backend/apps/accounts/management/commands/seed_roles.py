from django.core.management.base import BaseCommand

# pyrefly: ignore [missing-import]
from apps.accounts.models import Permission, Role


DEFAULT_ROLES = [
    {"name": "Founder", "slug": "founder", "is_leadership": True, "priority": 110},
    {"name": "Super Admin", "slug": "super_admin", "is_leadership": True, "priority": 100},
    {"name": "President", "slug": "president", "is_leadership": True, "priority": 90},
    {"name": "Vice President", "slug": "vice_president", "is_leadership": True, "priority": 80},
    {"name": "Faculty", "slug": "faculty", "is_leadership": True, "priority": 70},
    {"name": "Mentor", "slug": "mentor", "is_leadership": False, "priority": 60},
    {"name": "Team Lead", "slug": "team_lead", "is_leadership": False, "priority": 50},
    {"name": "Member", "slug": "member", "is_leadership": False, "priority": 10},
    {"name": "Guest", "slug": "guest", "is_leadership": False, "priority": 0},
]

LEADERSHIP_RESOURCES = [
    "users", "departments", "teams", "projects", "tasks",
    "meetings", "reports", "announcements", "settings",
    "attendance", "inventory", "knowledge", "certificates",
    "events", "chat", "organizations", "analytics",
]
MEMBER_RESOURCES = [
    "tasks", "daily_updates", "meetings", "projects",
    "attendance", "inventory", "knowledge", "events", "chat", "settings",
]
LEADERSHIP_ACTIONS = ["create", "read", "update", "delete", "approve", "assign", "export", "manage"]
MEMBER_ACTIONS = ["create", "read", "update"]


class Command(BaseCommand):
    help = "Seed default roles and permissions"

    def handle(self, *args, **options):
        for role_data in DEFAULT_ROLES:
            role, created = Role.objects.update_or_create(
                slug=role_data["slug"],
                defaults=role_data,
            )
            action = "Created" if created else "Updated"
            self.stdout.write(f"{action} role: {role.name}")

            Permission.objects.filter(role=role).delete()

            if role.slug in ("founder", "super_admin", "president", "vice_president", "faculty"):
                resources = LEADERSHIP_RESOURCES
                actions = LEADERSHIP_ACTIONS
            elif role.slug == "team_lead":
                resources = LEADERSHIP_RESOURCES
                actions = ["create", "read", "update", "assign", "approve", "export"]
            elif role.slug == "mentor":
                resources = MEMBER_RESOURCES + ["teams"]
                actions = ["read", "update", "assign"]
            elif role.slug == "guest":
                resources = ["projects", "announcements"]
                actions = ["read"]
            else:
                resources = MEMBER_RESOURCES
                actions = MEMBER_ACTIONS

            perms = [
                Permission(role=role, resource=res, action=act)
                for res in resources
                for act in actions
            ]
            Permission.objects.bulk_create(perms, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS("Roles and permissions seeded successfully."))
