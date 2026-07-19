from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.db import models
from apps.accounts.models import User
from apps.notifications.services import send_notification_to_user
from .models import Equipment, LabBooking


@receiver(pre_save, sender=Equipment)
def track_equipment_assignment(sender, instance, **kwargs):
    # Track changes to assigned_to field
    if not instance.pk:
        return
    try:
        old_instance = Equipment.objects.get(pk=instance.pk)
        instance._old_assigned_to_id = old_instance.assigned_to_id
    except Equipment.DoesNotExist:
        instance._old_assigned_to_id = None


@receiver(post_save, sender=Equipment)
def notify_equipment_assignment(sender, instance, created, **kwargs):
    old_assigned_to_id = getattr(instance, "_old_assigned_to_id", None)
    
    # Notify if assigned_to has changed and is now set to a user
    if instance.assigned_to and (created or old_assigned_to_id != instance.assigned_to_id):
        title = "Equipment Assigned to You"
        message = f"The equipment '{instance.name}' (S/N: {instance.serial_number}) has been assigned to you."
        priority = "normal"
        link = "/inventory"

        try:
            send_notification_to_user(
                user=instance.assigned_to,
                pref_key="inventory",
                title=title,
                message=message,
                link=link,
                priority=priority
            )
        except Exception:
            pass


@receiver(post_save, sender=LabBooking)
def notify_lab_booking_updates(sender, instance, created, **kwargs):
    if created:
        # 1. Notify leadership / lab managers of the booking request
        title = "New Lab Booking Request"
        message = f"{instance.booked_by.get_full_name()} has requested to book the '{instance.lab_name}' from {instance.start_time.strftime('%b %d, %H:%M')} to {instance.end_time.strftime('%b %d, %H:%M')}."
        priority = "normal"
        link = "/inventory"

        # Find leadership/managers
        recipients = User.objects.filter(
            models.Q(is_superuser=True) |
            models.Q(role__is_leadership=True) |
            models.Q(role__slug__in=["founder", "president", "super_admin", "vice_president"])
        ).filter(is_active=True).distinct()

        for recipient in recipients:
            if recipient.id != instance.booked_by.id:
                try:
                    send_notification_to_user(
                        user=recipient,
                        pref_key="inventory",
                        title=title,
                        message=message,
                        link=link,
                        priority=priority
                    )
                except Exception:
                    pass
    else:
        # 2. Notify the user if booking was approved or cancelled
        if instance.status in ["approved", "cancelled"]:
            status_str = "Approved" if instance.status == "approved" else "Cancelled"
            title = f"Lab Booking {status_str}"
            message = f"Your request to book the '{instance.lab_name}' from {instance.start_time.strftime('%b %d, %H:%M')} to {instance.end_time.strftime('%b %d, %H:%M')} has been {status_str.lower()}."
            priority = "medium"
            link = "/inventory"

            try:
                send_notification_to_user(
                    user=instance.booked_by,
                    pref_key="inventory",
                    title=title,
                    message=message,
                    link=link,
                    priority=priority
                )
            except Exception:
                pass
