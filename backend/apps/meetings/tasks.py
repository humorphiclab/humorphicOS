import logging
from datetime import timedelta
from django.utils import timezone
from celery import shared_task
from .models import Meeting
from apps.notifications.services import send_notification_to_user

logger = logging.getLogger(__name__)

@shared_task
def send_meeting_reminder(meeting_id, priority, time_left_str):
    """
    Celery task to send a meeting reminder notification to all participants.
    Validates that the meeting is still scheduled near the expected reminder window.
    """
    try:
        meeting = Meeting.objects.get(id=meeting_id)
    except Meeting.DoesNotExist:
        logger.warning(f"Meeting with id {meeting_id} does not exist. Skipping reminder.")
        return

    # Check for rescheduling: only run if the task executes within a reasonable window of the current start_time
    time_diff = meeting.start_time - timezone.now()
    if time_left_str == "15 minutes":
        # Expecting around 15 minutes left (accepting 10 to 20 minutes)
        if not (timedelta(minutes=10) <= time_diff <= timedelta(minutes=20)):
            logger.info(f"Skipping stale 15-minute reminder for meeting {meeting.id} (actual diff: {time_diff}).")
            return
    elif time_left_str == "5 minutes":
        # Expecting around 5 minutes left (accepting 2 to 8 minutes)
        if not (timedelta(minutes=2) <= time_diff <= timedelta(minutes=8)):
            logger.info(f"Skipping stale 5-minute reminder for meeting {meeting.id} (actual diff: {time_diff}).")
            return

    organizer_name = meeting.organizer.get_full_name() if meeting.organizer else "A project lead"
    title = f"Upcoming Meeting: {meeting.title} ({time_left_str})"
    message = f"Reminder: The meeting '{meeting.title}' organized by {organizer_name} starts in {time_left_str}."
    
    participants = meeting.participants.all()
    if not participants.exists() and meeting.organizer:
        send_notification_to_user(
            user=meeting.organizer,
            pref_key="meetings",
            title=title,
            message=message,
            link="/calendar",
            priority=priority
        )
    else:
        for participant in participants:
            send_notification_to_user(
                user=participant,
                pref_key="meetings",
                title=title,
                message=message,
                link="/calendar",
                priority=priority
            )
            
    # Mark sent flags in database
    if time_left_str == "15 minutes":
        meeting.reminder_15m_sent = True
        meeting.save(update_fields=["reminder_15m_sent"])
    elif time_left_str == "5 minutes":
        meeting.reminder_5m_sent = True
        meeting.save(update_fields=["reminder_5m_sent"])


@shared_task
def check_and_send_meeting_reminders():
    """
    Periodic task (runs every minute) as a backup scheduler for meeting reminders.
    Looks for meetings starting in the next 15/5 minutes that haven't received reminders.
    """
    from django.utils import timezone
    from datetime import timedelta
    
    now = timezone.now()
    
    # 15-minute reminders (target window: meetings starting between now and 16 minutes)
    target_15m_start = now
    target_15m_end = now + timedelta(minutes=16)
    meetings_15m = Meeting.objects.filter(
        start_time__gt=target_15m_start,
        start_time__lte=target_15m_end,
        reminder_15m_sent=False
    )
    for meeting in meetings_15m:
        meeting.reminder_15m_sent = True
        meeting.save(update_fields=["reminder_15m_sent"])
        
        organizer_name = meeting.organizer.get_full_name() if meeting.organizer else "A project lead"
        title = f"Upcoming Meeting: {meeting.title} (15 minutes)"
        message = f"Reminder: The meeting '{meeting.title}' organized by {organizer_name} starts in 15 minutes."
        
        participants = meeting.participants.all()
        for participant in participants:
            send_notification_to_user(
                user=participant,
                pref_key="meetings",
                title=title,
                message=message,
                link="/calendar",
                priority="medium"
            )
            
    # 5-minute reminders (target window: meetings starting between now and 6 minutes)
    target_5m_start = now
    target_5m_end = now + timedelta(minutes=6)
    meetings_5m = Meeting.objects.filter(
        start_time__gt=target_5m_start,
        start_time__lte=target_5m_end,
        reminder_5m_sent=False
    )
    for meeting in meetings_5m:
        meeting.reminder_5m_sent = True
        meeting.save(update_fields=["reminder_5m_sent"])
        
        organizer_name = meeting.organizer.get_full_name() if meeting.organizer else "A project lead"
        title = f"Urgent Meeting Reminder: {meeting.title} (5 minutes)"
        message = f"Urgent Reminder: The meeting '{meeting.title}' organized by {organizer_name} starts in 5 minutes. Join now!"
        
        participants = meeting.participants.all()
        for participant in participants:
            send_notification_to_user(
                user=participant,
                pref_key="meetings",
                title=title,
                message=message,
                link="/calendar",
                priority="urgent"
            )
