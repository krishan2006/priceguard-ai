"""Alerts and notifications routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Alert, Notification
from app.schemas import AlertResponse, NotificationResponse

router = APIRouter(tags=["alerts"])


@router.get("/api/alerts", response_model=List[AlertResponse])
def get_alerts(limit: int = 50, db: Session = Depends(get_db)):
    """Get all alerts."""
    return db.query(Alert).order_by(Alert.timestamp.desc()).limit(limit).all()


@router.post("/api/alerts/{alert_id}/read")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db)):
    """Mark an alert as read."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    return {"message": "Alert marked as read"}


@router.post("/api/alerts/{alert_id}/dismiss")
def dismiss_alert(alert_id: int, db: Session = Depends(get_db)):
    """Dismiss an alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_dismissed = True
    alert.is_read = True
    db.commit()
    return {"message": "Alert dismissed"}


@router.get("/api/notifications", response_model=List[NotificationResponse])
def get_notifications(limit: int = 50, db: Session = Depends(get_db)):
    """Get all notifications."""
    return db.query(Notification).order_by(Notification.timestamp.desc()).limit(limit).all()


@router.post("/api/notifications/{notif_id}/read")
def mark_notification_read(notif_id: int, db: Session = Depends(get_db)):
    """Mark a notification as read."""
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}
