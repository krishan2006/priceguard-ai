"""Dashboard stats, agent logs, and demo routes."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import MonitoringTask, Alert, Notification, AgentLog, PriceHistory
from app.schemas import AgentLogResponse, StatsResponse, SimulatePriceDropRequest
from app.agent.agent import get_event_log
from app.agent.tools.product_search import (
    simulate_price_drop, _demo_price_sequences, _demo_price_indices,
)

router = APIRouter(tags=["dashboard"])
logger = logging.getLogger(__name__)


@router.get("/api/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    """Get dashboard statistics."""
    active_monitors = db.query(MonitoringTask).filter(
        MonitoringTask.is_active == True,
        MonitoringTask.is_paused == False,
    ).count()

    products_tracked = db.query(MonitoringTask).filter(
        MonitoringTask.is_active == True
    ).count()

    alerts_triggered = db.query(Alert).count()

    # Calculate average price drop from alerts
    avg_drop_result = db.query(func.avg(Alert.price_change_percent)).filter(
        Alert.price_change_percent < 0
    ).scalar()
    avg_price_drop = abs(avg_drop_result or 0.0)

    # Get last agent run
    last_log = db.query(AgentLog).order_by(AgentLog.timestamp.desc()).first()
    last_run = last_log.timestamp if last_log else None

    return StatsResponse(
        active_monitors=active_monitors,
        products_tracked=products_tracked,
        alerts_triggered=alerts_triggered,
        avg_price_drop=round(avg_price_drop, 2),
        last_agent_run=last_run,
    )


@router.get("/api/agent/logs")
def get_agent_logs(limit: int = 100, db: Session = Depends(get_db)):
    """Get agent activity logs from DB + in-memory."""
    db_logs = db.query(AgentLog).order_by(AgentLog.timestamp.desc()).limit(limit).all()
    
    # Also include in-memory events
    memory_logs = get_event_log()
    
    serialized = []
    for log in db_logs:
        serialized.append({
            "id": log.id,
            "task_id": log.task_id,
            "level": log.level,
            "emoji": log.emoji,
            "message": log.message,
            "details": log.details,
            "timestamp": log.timestamp.isoformat(),
        })
    
    return {"logs": serialized, "count": len(serialized)}


@router.get("/api/agent/events")
def get_agent_events():
    """Get real-time in-memory agent events."""
    return {"events": get_event_log()}


@router.post("/api/demo/simulate-price-drop")
async def demo_simulate_price_drop(
    payload: SimulatePriceDropRequest,
    db: Session = Depends(get_db),
):
    """Simulate a price drop for demo purposes."""
    task = db.query(MonitoringTask).filter(MonitoringTask.id == payload.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Monitor not found")
    
    if not task.demo_mode:
        raise HTTPException(status_code=400, detail="Task is not in demo mode")
    
    # Advance the demo price sequence
    simulate_price_drop(payload.task_id)
    
    current_idx = _demo_price_indices.get(payload.task_id, 0)
    seq = _demo_price_sequences.get(payload.task_id, [])
    simulated_price = seq[min(current_idx, len(seq) - 1)] if seq else None
    
    return {
        "message": "Price drop simulated. Run CHECK NOW to trigger the monitoring cycle.",
        "task_id": payload.task_id,
        "simulated_price_approx": simulated_price,
        "note": "The autonomous agent will detect this on the next check cycle.",
    }


@router.get("/api/health")
def health_check():
    """Health check endpoint."""
    import os
    return {
        "status": "healthy",
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "telegram_configured": bool(os.getenv("TELEGRAM_BOT_TOKEN")),
        "serper_configured": bool(os.getenv("SERPER_API_KEY")),
        "smtp_configured": bool(os.getenv("SMTP_HOST")),
        "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
    }


@router.get("/api/telegram/status")
async def telegram_status():
    """Get Telegram Bot connection status and subscribers count."""
    from app.agent.tools.telegram_service import validate_telegram_bot, sync_telegram_subscribers, _load_subscribers
    bot_val = await validate_telegram_bot()
    sub_count = await sync_telegram_subscribers()
    return {
        "bot": bot_val,
        "subscribers_count": sub_count,
        "subscribers": list(_load_subscribers()),
        "bot_username": bot_val.get("username", "Ai_pricing_detectionbot"),
    }


@router.post("/api/telegram/broadcast-test")
async def telegram_broadcast_test():
    """Send an immediate test alert / status message to all Telegram subscribers."""
    from app.agent.tools.telegram_service import broadcast_telegram_message
    msg = (
        "🟢 *PriceGuard AI — Server Online*\n\n"
        "Hello! Server is running and actively monitoring prices.\n"
        "Live price alerts, product discoveries, and status updates will be sent here in real-time."
    )
    sent = await broadcast_telegram_message(msg)
    return {
        "success": True,
        "message_sent": msg,
        "subscribers_reached": sent,
    }


class TelegramSubscribePayload(BaseModel):
    chat_id: str


@router.post("/api/telegram/subscribe")
async def telegram_subscribe(payload: TelegramSubscribePayload):
    """Manually register a chat ID and send an immediate verification message."""
    from app.agent.tools.telegram_service import register_subscriber, send_telegram_raw
    cid = payload.chat_id.strip()
    if not cid:
        raise HTTPException(status_code=400, detail="chat_id cannot be empty")
    
    registered = register_subscriber(cid)
    msg = (
        "🚀 *PriceGuard AI Connected!*\n\n"
        "Hello! Server is running and actively monitoring prices.\n"
        "You will receive live price alerts and heartbeat status updates here."
    )
    sent = await send_telegram_raw(cid, msg)
    return {
        "success": registered,
        "chat_id": cid,
        "verified_sent": sent,
    }

