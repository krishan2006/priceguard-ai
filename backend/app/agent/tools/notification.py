"""Notification tools - in-app, browser push, and email."""
import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from app.models import Alert, Notification, MonitoringTask

logger = logging.getLogger(__name__)


def create_notification(
    db: Session,
    alert: Alert,
    task: MonitoringTask,
    notification_types: List[str] = None,
) -> List[Notification]:
    """Create notification records for an alert."""
    if notification_types is None:
        notification_types = ["in_app", "browser"]

    price_change_pct = alert.price_change_percent or 0
    direction = "dropped" if price_change_pct < 0 else "changed"
    
    title = f"🚨 Price Alert: {task.product_name}"
    body = (
        f"{task.product_name} is now ₹{alert.current_price:,.0f}. "
        f"Price has {direction} by {abs(price_change_pct):.1f}%. "
        f"Reason: {alert.agent_reason or 'Condition satisfied.'}"
    )

    notifications = []
    for n_type in notification_types:
        notif = Notification(
            alert_id=alert.id,
            notification_type=n_type,
            title=title,
            body=body,
            is_sent=True,
            timestamp=datetime.utcnow(),
        )
        db.add(notif)
        notifications.append(notif)

    db.commit()
    logger.info(f"Created {len(notifications)} notification(s) for alert {alert.id}")
    return notifications


async def send_email_notification(
    alert: Alert,
    task: MonitoringTask,
    recipient_email: Optional[str] = None,
) -> bool:
    """Send email notification using SMTP config from environment."""
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USERNAME", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")

    if not all([smtp_host, smtp_user, smtp_pass]):
        logger.info("Email notification skipped: SMTP not configured")
        return False

    if not recipient_email:
        recipient_email = smtp_user

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🚨 PriceGuard: Price Alert for {task.product_name}"
        msg["From"] = smtp_user
        msg["To"] = recipient_email

        price_change_pct = alert.price_change_percent or 0
        html = f"""
        <html><body style="font-family: Arial, sans-serif; background: #0f0f1a; color: #e2e8f0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 12px; overflow: hidden; border: 1px solid #7c3aed;">
          <div style="background: linear-gradient(135deg, #7c3aed, #2563eb); padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🚨 Price Alert Triggered!</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">PriceGuard AI Monitoring Agent</p>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #a78bfa; margin: 0 0 16px;">{task.product_name}</h2>
            <div style="background: rgba(124, 58, 237, 0.1); border: 1px solid #7c3aed; border-radius: 8px; padding: 20px; margin: 16px 0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #94a3b8;">Current Price</span>
                <strong style="color: #34d399; font-size: 20px;">₹{alert.current_price:,.0f}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #94a3b8;">Target Price</span>
                <strong style="color: #e2e8f0;">₹{(alert.target_price or 0):,.0f}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Price Change</span>
                <strong style="color: {'#34d399' if price_change_pct < 0 else '#f87171'};">{price_change_pct:+.1f}%</strong>
              </div>
            </div>
            <div style="background: rgba(52, 211, 153, 0.1); border: 1px solid #34d399; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; color: #34d399;"><strong>AI Reasoning:</strong></p>
              <p style="margin: 8px 0 0; color: #e2e8f0;">{alert.agent_reason or 'Condition satisfied'}</p>
            </div>
            <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">
              Sent by PriceGuard AI Autonomous Agent
            </p>
          </div>
        </div>
        </body></html>
        """

        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, recipient_email, msg.as_string())

        logger.info(f"Email sent to {recipient_email} for alert {alert.id}")
        return True

    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return False


def get_notification_preferences(pref: str) -> List[str]:
    """Parse notification preference string to list of types."""
    if pref == "all":
        return ["in_app", "browser", "email"]
    elif pref == "in_app":
        return ["in_app"]
    elif pref == "browser":
        return ["browser"]
    elif pref == "email":
        return ["in_app", "email"]
    else:
        return ["in_app", "browser"]
