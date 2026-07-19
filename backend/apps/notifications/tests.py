from django.test import TestCase
from django.utils import timezone
from apps.accounts.models import User, Role
from apps.announcements.models import Announcement
from apps.events.models import Event, EventRegistration
from apps.knowledge.models import KnowledgeArticle
from apps.attendance.models import LeaveRequest
from apps.notifications.models import Notification, NotificationPreference
from apps.certificates.models import Certificate
from apps.gamification.models import Achievement, UserProfile


class NotificationSignalsTestCase(TestCase):
    def setUp(self):
        # Create roles
        self.leader_role = Role.objects.create(name="President", slug="president", priority=90, is_leadership=True)
        self.member_role = Role.objects.create(name="Member", slug="member", priority=10, is_leadership=False)

        # Create users
        self.admin = User.objects.create_superuser(
            username="admin", email="admin@test.com", password="password"
        )
        self.leader = User.objects.create_user(
            username="leader", email="leader@test.com", password="password", role=self.leader_role
        )
        self.user = User.objects.create_user(
            username="user", email="user@test.com", password="password", role=self.member_role
        )

        # Create preference objects (should be automatically created, but we ensure they exist)
        NotificationPreference.objects.get_or_create(user=self.admin)
        NotificationPreference.objects.get_or_create(user=self.leader)
        NotificationPreference.objects.get_or_create(user=self.user)

    def test_new_announcement_signal(self):
        Notification.objects.all().delete()
        
        # Creating announcement should trigger notifications for active users
        Announcement.objects.create(
            title="General Announcement",
            content="This is a test announcement.",
            author=self.leader,
            priority=Announcement.Priority.GENERAL,
            is_active=True
        )

        # Admin and User should receive notifications. Leader shouldn't receive notification about their own announcement.
        notifications = Notification.objects.filter(notification_type=Notification.Type.ANNOUNCEMENT)
        self.assertEqual(notifications.count(), 2)
        recipients = [n.user for n in notifications]
        self.assertIn(self.admin, recipients)
        self.assertIn(self.user, recipients)
        self.assertNotIn(self.leader, recipients)

    def test_new_lecture_signal(self):
        Notification.objects.all().delete()

        KnowledgeArticle.objects.create(
            title="Introduction to Robotics",
            slug="intro-to-robotics",
            content="Tutorial details...",
            article_type=KnowledgeArticle.ArticleType.TUTORIAL,
            author=self.leader,
            is_published=True
        )

        notifications = Notification.objects.filter(notification_type=Notification.Type.LECTURE)
        self.assertEqual(notifications.count(), 2)

    def test_new_event_and_registration_signals(self):
        Notification.objects.all().delete()

        event = Event.objects.create(
            title="Hackathon 2026",
            slug="hackathon-2026",
            description="Robotics competition",
            event_type=Event.EventType.HACKATHON,
            organizer=self.leader,
            start_time=timezone.now() + timezone.timedelta(days=1),
            end_time=timezone.now() + timezone.timedelta(days=2),
            is_public=True
        )

        # Should trigger event notifications for active users (admin, user)
        event_notifications = Notification.objects.filter(notification_type=Notification.Type.EVENT, title="New Event Scheduled")
        self.assertEqual(event_notifications.count(), 2)

        # Register user
        EventRegistration.objects.create(event=event, user=self.user)

        # Registration confirmation notification to registrant
        reg_notification = Notification.objects.filter(notification_type=Notification.Type.EVENT, title="Event Registration Confirmed")
        self.assertEqual(reg_notification.count(), 1)
        self.assertEqual(reg_notification.first().user, self.user)

    def test_leave_request_signals(self):
        Notification.objects.all().delete()

        leave = LeaveRequest.objects.create(
            user=self.user,
            leave_type=LeaveRequest.LeaveType.SICK,
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=1),
            reason="Feeling unwell",
            status=LeaveRequest.Status.PENDING
        )

        # Notify leadership (admin, leader)
        leave_notifications = Notification.objects.filter(notification_type=Notification.Type.LEAVE_REQUEST, title="New Leave Request Submitted")
        self.assertEqual(leave_notifications.count(), 2)
        recipients = [n.user for n in leave_notifications]
        self.assertIn(self.admin, recipients)
        self.assertIn(self.leader, recipients)

        # Approve leave
        leave.status = LeaveRequest.Status.APPROVED
        leave.approved_by = self.leader
        leave.save()

        # Should notify user
        approval_notification = Notification.objects.filter(notification_type=Notification.Type.LEAVE_REQUEST, title="Leave Request Approved")
        self.assertEqual(approval_notification.count(), 1)
        self.assertEqual(approval_notification.first().user, self.user)

    def test_certificate_signals(self):
        from apps.certificates.models import CertificateTemplate
        Notification.objects.all().delete()

        template = CertificateTemplate.objects.create(
            name="Default Template",
            template_type=CertificateTemplate.TemplateType.CUSTOM,
            html_template="<div>{{name}}</div>"
        )

        Certificate.objects.create(
            template=template,
            title="Best Innovator",
            recipient=self.user,
            issued_by=self.leader,
            event_name="Innovation Challenge",
            verification_code="CERT-123"
        )

        notifications = Notification.objects.filter(notification_type=Notification.Type.CERTIFICATE)
        self.assertEqual(notifications.count(), 1)
        self.assertEqual(notifications.first().user, self.user)

    def test_gamification_signals(self):
        Notification.objects.all().delete()

        # Award an achievement
        Achievement.objects.create(
            user=self.user,
            title="First Step",
            description="Unlocked first achievement",
            xp_awarded=50
        )

        notifications = Notification.objects.filter(notification_type=Notification.Type.GAMIFICATION, title="🏆 Achievement Unlocked!")
        self.assertEqual(notifications.count(), 1)
        self.assertEqual(notifications.first().user, self.user)

        # Test level up logic
        profile, _ = UserProfile.objects.get_or_create(user=self.user)
        # Setting level to 1
        profile.level = 1
        profile.xp = 50
        profile.save()

        Notification.objects.all().delete()
        # Add enough XP to level up (needs level transition from 1 to 2)
        profile.add_xp(60) # xp becomes 110, level becomes 2
        
        level_up_notifications = Notification.objects.filter(notification_type=Notification.Type.GAMIFICATION, title="🎉 Level Up!")
        self.assertEqual(level_up_notifications.count(), 1)
        self.assertEqual(level_up_notifications.first().user, self.user)


class NotificationTasksTestCase(TestCase):
    def setUp(self):
        self.leader_role = Role.objects.create(name="President", slug="president", priority=90, is_leadership=True)
        self.member_role = Role.objects.create(name="Member", slug="member", priority=10, is_leadership=False)

        self.admin = User.objects.create_superuser(
            username="admin", email="admin@test.com", password="password"
        )
        self.leader = User.objects.create_user(
            username="leader", email="leader@test.com", password="password", role=self.leader_role
        )
        self.user = User.objects.create_user(
            username="user", email="user@test.com", password="password", role=self.member_role
        )

        NotificationPreference.objects.get_or_create(user=self.admin)
        NotificationPreference.objects.get_or_create(user=self.leader)
        NotificationPreference.objects.get_or_create(user=self.user)

    def test_send_attendance_reminder_task(self):
        from apps.reports.tasks import send_attendance_reminder
        from apps.attendance.models import AttendanceRecord

        Notification.objects.all().delete()

        # Mark attendance for leader
        AttendanceRecord.objects.create(
            user=self.leader,
            date=timezone.now().date(),
            status=AttendanceRecord.Status.PRESENT
        )

        # Run attendance reminder (default: normal / afternoon)
        send_attendance_reminder(priority="normal")

        # Admin and User should receive the reminder, leader should not (already marked)
        reminders = Notification.objects.filter(notification_type=Notification.Type.REMINDER, title="Attendance Reminder")
        self.assertEqual(reminders.count(), 2)
        recipients = [r.user for r in reminders]
        self.assertIn(self.admin, recipients)
        self.assertIn(self.user, recipients)
        self.assertNotIn(self.leader, recipients)

    def test_send_low_stock_alerts_task(self):
        from apps.reports.tasks import send_low_stock_alerts
        from apps.inventory.models import Component

        Notification.objects.all().delete()
        
        # Create low stock component
        Component.objects.create(
            name="Resistor 10k",
            sku="RES-10K",
            category=Component.Category.ELECTRONIC,
            quantity=2,
            min_stock=5,
            is_active=True
        )

        # Run stock scanner
        send_low_stock_alerts()

        # Low stock alert should be dispatched to leadership/managers (admin and leader)
        alerts = Notification.objects.filter(notification_type=Notification.Type.INVENTORY, title="Low Stock Alert")
        self.assertEqual(alerts.count(), 2)
        recipients = [a.user for a in alerts]
        self.assertIn(self.admin, recipients)
        self.assertIn(self.leader, recipients)
        self.assertNotIn(self.user, recipients)

