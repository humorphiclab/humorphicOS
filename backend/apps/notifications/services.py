import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from .models import Notification, NotificationPreference

logger = logging.getLogger(__name__)

def send_html_email_to_user(user, title, message, link="", priority="normal"):
    """
    Sends a premium, responsive dark-theme cyber-aesthetic HTML email to a user.
    """
    if not user or not user.email:
        return

    try:
        # Build full absolute frontend URL if link is relative
        full_link = link
        if link and link.startswith("/"):
            frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
            full_link = f"{frontend_url}{link}"

        # Settings link
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
        settings_link = f"{frontend_url}/settings"

        # Format button HTML if link is provided (Left-aligned premium action button)
        button_html = ""
        if full_link:
            button_html = f"""
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 25px 0 10px 0;">
              <tr>
                <td align="left">
                  <a href="{full_link}" target="_blank" style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #ffffff; display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);">View Details</a>
                </td>
              </tr>
            </table>
            """

        subject = f"HumorphicOS: {title}"
        
        # HTML Email Body template (Vibrant dark cyber aesthetic - Deep Blue Glow Theme)
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>{subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #0b0f19; padding: 40px 0;">
            <tr>
              <td align="center">
                <!-- Main Card Container -->
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #111827; border: 1px solid rgba(37, 99, 235, 0.2); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
                  
                  <!-- Neon Header Gradient Stripe -->
                  <tr>
                    <td height="4" style="background: linear-gradient(90deg, #2563eb, #4f46e5); line-height: 4px; font-size: 0px;">&nbsp;</td>
                  </tr>
                  
                  <!-- Header Logo Area -->
                  <tr>
                    <td style="padding: 32px 40px; text-align: left; background-color: #13192a; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td>
                            <span style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; background: linear-gradient(90deg, #60a5fa, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">HumorphicOS</span>
                          </td>
                          <td align="right">
                            <span style="font-size: 10px; text-transform: uppercase; color: rgba(255, 255, 255, 0.4); letter-spacing: 2px; font-weight: 700;">Club Alert</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Main Content Area -->
                  <tr>
                    <td style="padding: 40px 40px 36px 40px;">
                      <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 20px; font-weight: 700; line-height: 1.3; letter-spacing: -0.2px;">{title}</h2>
                      <p style="color: #9ca3af; font-size: 15px; line-height: 1.7; margin: 0 0 28px 0; font-weight: 400;">{message}</p>
                      
                      <!-- Action Button -->
                      {button_html}
                    </td>
                  </tr>

                  <!-- Divider -->
                  <tr>
                    <td style="padding: 0 40px;">
                      <div style="border-top: 1px solid rgba(255, 255, 255, 0.06); height: 1px; line-height: 1px;"></div>
                    </td>
                  </tr>

                  <!-- Footer Area -->
                  <tr>
                    <td style="padding: 32px 40px; background-color: #0f1322; text-align: left; border-top: 1px solid rgba(255, 255, 255, 0.03);">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td>
                            <p style="color: rgba(255, 255, 255, 0.35); font-size: 11px; line-height: 1.6; margin: 0;">
                              You are receiving this update as a registered member of Humorphic Robotics Club.<br>
                              Manage your preferences in your <a href="{settings_link}" style="color: #60a5fa; text-decoration: none; font-weight: 600;">Account Settings</a>.
                            </p>
                            <p style="color: rgba(255, 255, 255, 0.2); font-size: 10px; margin: 12px 0 0 0; font-weight: 500;">
                              &copy; 2026 Humorphic Labs. Built for next-gen builders.
                            </p>
                          </td>
                        </tr>
                      </table>
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
        
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "humorphic.labs@gmail.com")
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=from_email,
            to=[user.email]
        )
        msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)
    except Exception as e:
        logger.error(f"Failed to send email to {user.email}: {e}")


def send_notification_to_user(user, pref_key, title, message, link="", priority="normal", context=None):
    """
    Unified dispatcher to send notification to a user based on preferences.
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
        send_html_email_to_user(user, title, message, link, priority)
