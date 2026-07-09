import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils.html import strip_tags
from .models import Notification, NotificationPreference

logger = logging.getLogger(__name__)

def send_notification_to_user(user, pref_key, title, message, link="", priority="normal", context=None):
    """
    Unified dispatcher to send notification to a user based on preferences.
    pref_key should be one of:
      - 'task_assigned'
      - 'task_review'
      - 'task_completed'
      - 'task_needs_changes'
      - 'messages'
      - 'meetings'
    """
    if not user or not user.is_active:
        return

    # 1. Get or create notification preferences for the user
    prefs, _ = NotificationPreference.objects.get_or_create(user=user)

    # Map preference key to notification type
    type_mapping = {
        "task_assigned": Notification.Type.TASK,
        "task_review": Notification.Type.TASK,
        "task_completed": Notification.Type.TASK,
        "task_needs_changes": Notification.Type.TASK,
        "messages": Notification.Type.MESSAGE,
        "meetings": Notification.Type.MEETING,
    }
    notification_type = type_mapping.get(pref_key, Notification.Type.SYSTEM)

    # 2. In-App Notification
    in_app_enabled = getattr(prefs, f"in_app_{pref_key}", True)
    if in_app_enabled:
        try:
            Notification.objects.create(
                user=user,
                title=title,
                message=message,
                notification_type=notification_type,
                priority=priority,
                link=link
            )
        except Exception as e:
            logger.error(f"Failed to create in-app notification for {user.email}: {e}")

    # 3. Email Notification
    email_enabled = getattr(prefs, f"email_{pref_key}", True)
    if email_enabled and user.email:
        try:
            # Build full absolute frontend URL if link is relative
            full_link = link
            if link and link.startswith("/"):
                frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
                full_link = f"{frontend_url}{link}"

            # Format button HTML if link is provided
            button_html = ""
            if full_link:
                button_html = f"""
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0 10px 0;">
                  <tr>
                    <td align="center">
                      <a href="{full_link}" target="_blank" style="background-color: #3b82f6; color: #ffffff; display: inline-block; padding: 12px 24px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">View Details</a>
                    </td>
                  </tr>
                </table>
                """

            subject = f"HumorphicOS: {title}"
            
            # HTML Email Body template
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>{subject}</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f6f9fc; padding: 40px 0;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 32px 40px; text-align: center;">
                          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">HumorphicOS</h1>
                          <p style="color: #bfdbfe; margin: 4px 0 0 0; font-size: 14px; font-weight: 500;">Robotics Club Management Platform</p>
                        </td>
                      </tr>
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px 40px 32px 40px;">
                          <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px; font-weight: 600; line-height: 1.3;">{title}</h2>
                          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">{message}</p>
                          {button_html}
                        </td>
                      </tr>
                      <!-- Divider -->
                      <tr>
                        <td style="padding: 0 40px;">
                          <div style="border-top: 1px solid #e5e7eb; height: 1px; line-height: 1px;"></div>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style="padding: 32px 40px; background-color: #f9fafb; text-align: center;">
                          <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0 0 8px 0;">
                            You are receiving this email because it matches your notification preferences.<br>
                            You can configure or turn off these alerts in your settings.
                          </p>
                          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                            &copy; 2026 Humorphic Labs. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """
            
            text_body = f"{title}\n\n{message}\n\nView details here: {full_link}" if full_link else f"{title}\n\n{message}"
            
            # Send email
            from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "info@humorphic.in")
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=from_email,
                to=[user.email]
            )
            msg.attach_alternative(html_body, "text/html")
            msg.send(fail_silently=False)
        except Exception as e:
            logger.error(f"Failed to send email notification to {user.email}: {e}")
