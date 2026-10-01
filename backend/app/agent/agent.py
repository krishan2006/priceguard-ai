"""
Core AI Agent - orchestrates the complete monitoring pipeline.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models import MonitoringTask, PriceHistory, Alert, AgentLog, Notification
from app.agent.tools.product_search import (
    get_current_price,
    verify_product_identity,
    simulate_price_drop,
)
from app.agent.tools.price_calculator import (
    normalize_price,
    calculate_price_change,
    calculate_discount,
    compare_price_condition,
    detect_meaningful_change,
)
from app.agent.tools.notification import (
    create_notification,
    send_email_notification,
    get_notification_preferences,
)
from app.agent.reasoning import run_ai_reasoning
from app.agent.state_manager import transition_alert_state

logger = logging.getLogger(__name__)

# Global event log for real-time streaming
_event_log: list = []


def add_event(task_id: Optional[int], emoji: str, message: str, level: str = "INFO", details: str = None):
    """Add event to in-memory log and persist to DB on next cycle."""
    event = {
        "task_id": task_id,
        "emoji": emoji,
        "message": message,
        "level": level,
        "details": details,
        "timestamp": datetime.utcnow().isoformat(),
    }
    _event_log.append(event)
    # Keep only last 200 events in memory
    if len(_event_log) > 200:
        _event_log.pop(0)
    logger.info(f"{emoji} {message}")


def get_event_log() -> list:
    return list(reversed(_event_log))


def _save_event_to_db(db: Session, task_id: Optional[int], emoji: str, message: str, level: str = "INFO", details: str = None):
    """Persist event to AgentLog table."""
    try:
        log = AgentLog(
            task_id=task_id,
            level=level,
            emoji=emoji,
            message=message,
            details=details,
            timestamp=datetime.utcnow(),
        )
        db.add(log)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to save event to DB: {e}")


def save_price_history(
    db: Session,
    task: MonitoringTask,
    price: float,
    source: str,
    source_url: Optional[str],
    agent_action: str,
    agent_reason: str,
    alert_state: str,
) -> PriceHistory:
    """Save a price history record."""
    change, change_pct = calculate_price_change(price, task.current_price)
    
    history = PriceHistory(
        task_id=task.id,
        price=price,
        previous_price=task.current_price,
        price_change=change,
        price_change_percent=change_pct,
        source=source,
        source_url=source_url,
        agent_action=agent_action,
        agent_reason=agent_reason,
        alert_state=alert_state,
        timestamp=datetime.utcnow(),
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return history


async def run_monitoring_cycle(
    db: Session,
    task: MonitoringTask,
    force: bool = False,
) -> Dict[str, Any]:
    """
    Execute a complete monitoring cycle for a task.
    
    Pipeline:
    1. Search product
    2. Get current price
    3. Normalize price
    4. Calculate changes
    5. Compare with condition
    6. AI reasoning
    7. State transition
    8. Save history
    9. Create notification if needed
    
    Returns cycle result dict.
    """
    task_id = task.id
    product_name = task.product_name
    
    add_event(task_id, "🔄", f"Starting monitoring cycle for '{product_name}'")
    _save_event_to_db(db, task_id, "🔄", f"Starting monitoring cycle for '{product_name}'")

    # Step 1: Fetch current price
    add_event(task_id, "🔍", f"Searching price for '{product_name}'...")
    _save_event_to_db(db, task_id, "🔍", f"Searching price for '{product_name}'...")

    try:
        price_data = await get_current_price(
            task_id=task_id,
            product_name=product_name,
            demo_mode=task.demo_mode,
            external_id=None,
        )
    except Exception as e:
        add_event(task_id, "❌", f"Price fetch failed: {str(e)}", level="ERROR")
        _save_event_to_db(db, task_id, "❌", f"Price fetch failed: {str(e)}", level="ERROR")
        
        # Update task
        task.last_checked = datetime.utcnow()
        task.next_check = datetime.utcnow() + timedelta(minutes=task.check_interval_minutes)
        db.commit()
        
        return {"success": False, "action": "SOURCE_UNAVAILABLE", "reason": str(e)}

    if not price_data.get("success"):
        add_event(task_id, "⚠️", "Price source unavailable", level="WARNING")
        return {"success": False, "action": "SOURCE_UNAVAILABLE", "reason": "No price found"}

    # Step 1b: Product identity verification (only for locked products in live mode)
    if task.product_locked and not task.demo_mode:
        add_event(task_id, "🔐", f"Verifying product identity: '{task.locked_product_name}'...")
        _save_event_to_db(db, task_id, "🔐", "Verifying product identity")
        verify = await verify_product_identity(task_id, task.locked_product_name or product_name)
        if not verify["verified"]:
            reason = verify.get("reason", "Variant not found")
            add_event(task_id, "🚫", f"Product identity check FAILED: {reason}", level="WARNING")
            _save_event_to_db(db, task_id, "🚫", f"Identity failed: {reason}", level="WARNING")
            task.last_checked = datetime.utcnow()
            task.next_check = datetime.utcnow() + timedelta(minutes=task.check_interval_minutes)
            db.commit()
            return {"success": False, "action": "SOURCE_UNAVAILABLE", "reason": reason}
        add_event(task_id, "✅", f"Product identity verified (score={verify.get('match_score', 0):.2f})")
        _save_event_to_db(db, task_id, "✅", f"Identity verified: {verify.get('reason')}")

    # Step 2: Normalize price
    raw_price = price_data.get("price")
    current_price = normalize_price(raw_price)

    if current_price is None:
        add_event(task_id, "❌", "Could not normalize price", level="ERROR")
        return {"success": False, "action": "SOURCE_UNAVAILABLE", "reason": "Invalid price"}

    source = price_data.get("source", "DummyJSON")
    source_url = price_data.get("source_url")
    
    add_event(task_id, "💰", f"Current price found: ₹{current_price:,.0f} (Source: {source})")
    _save_event_to_db(db, task_id, "💰", f"Current price found: ₹{current_price:,.0f}", details=f"Source: {source}")

    previous_price = task.current_price
    change, change_pct = calculate_price_change(current_price, previous_price)

    if previous_price:
        add_event(task_id, "📊", f"Previous: ₹{previous_price:,.0f} → Current: ₹{current_price:,.0f} ({change_pct:+.1f}%)")
        _save_event_to_db(db, task_id, "📊", f"Price change: {change_pct:+.1f}%")

    # Step 3: Check for meaningful change
    is_meaningful = detect_meaningful_change(current_price, previous_price)
    if not is_meaningful and not force:
        add_event(task_id, "➡️", f"Price unchanged (< 0.5% change), skipping deep analysis")
        
        # Still update timestamps
        task.last_checked = datetime.utcnow()
        task.next_check = datetime.utcnow() + timedelta(minutes=task.check_interval_minutes)
        db.commit()
        
        save_price_history(db, task, current_price, source, source_url, "PRICE_UNCHANGED",
                           "Price has not changed meaningfully", task.alert_state)
        
        task.current_price = current_price
        task.previous_price = previous_price
        db.commit()
        
        return {"success": True, "action": "PRICE_UNCHANGED", "price": current_price}

    # Step 4: Evaluate condition
    add_event(task_id, "🧠", f"Evaluating condition: '{task.condition}'...")
    _save_event_to_db(db, task_id, "🧠", f"Evaluating condition: '{task.condition}'")

    condition_met, programmatic_action, programmatic_reason = compare_price_condition(
        current_price=current_price,
        condition=task.condition,
        target_price=task.target_price,
        min_price=task.min_price,
        max_price=task.max_price,
        discount_threshold=task.discount_threshold,
        price_drop_percent=task.price_drop_percent,
        original_price=previous_price,
        previous_price=previous_price,
    )
    
    add_event(task_id, "📋", f"Condition met: {condition_met} — {programmatic_reason}")
    _save_event_to_db(db, task_id, "📋", f"Condition result: {programmatic_action}", details=programmatic_reason)

    # Step 5: AI Reasoning
    add_event(task_id, "🤖", "Running AI reasoning engine...")
    _save_event_to_db(db, task_id, "🤖", "Running AI reasoning")

    ai_result = await run_ai_reasoning(
        product_name=product_name,
        current_price=current_price,
        previous_price=previous_price,
        target_price=task.target_price,
        condition=task.condition,
        price_change_pct=change_pct,
        alert_state=task.alert_state,
        condition_met=condition_met,
        programmatic_action=programmatic_action,
        programmatic_reason=programmatic_reason,
    )

    ai_decision = ai_result.get("decision", "NO_ALERT")
    ai_reason = ai_result.get("reason", programmatic_reason)
    ai_confidence = ai_result.get("confidence", 0.9)
    ai_action = ai_result.get("recommended_action", "NO_ACTION")

    add_event(task_id, "💡", f"AI Decision: {ai_decision} (confidence: {ai_confidence:.0%})")
    _save_event_to_db(db, task_id, "💡", f"AI: {ai_decision}", details=ai_reason)

    # Step 6: State transition & duplicate check
    new_state, should_alert = transition_alert_state(
        current_state=task.alert_state,
        condition_met=condition_met,
    )

    # Override: if AI says NO_ALERT override should_alert
    if ai_decision == "NO_ALERT" and should_alert:
        should_alert = False
        add_event(task_id, "🛡️", "AI overriding alert: duplicate suppression")

    add_event(task_id, "🔀", f"State: {task.alert_state} → {new_state} | Alert: {should_alert}")
    _save_event_to_db(db, task_id, "🔀", f"State transition: {task.alert_state} → {new_state}")

    # Step 7: Save price history
    final_action = "ALERT" if should_alert else programmatic_action
    history = save_price_history(
        db, task, current_price, source, source_url,
        final_action, ai_reason, new_state
    )

    # Step 8: Update task
    task.current_price = current_price
    task.previous_price = previous_price
    task.alert_state = new_state
    task.last_checked = datetime.utcnow()
    task.next_check = datetime.utcnow() + timedelta(minutes=task.check_interval_minutes)
    db.commit()

    # Step 9: Create alert & notification if needed
    if should_alert:
        add_event(task_id, "🚨", f"Alert triggered! Price ₹{current_price:,.0f}", level="ALERT")
        _save_event_to_db(db, task_id, "🚨", f"Alert triggered at ₹{current_price:,.0f}", level="ALERT")

        alert = Alert(
            task_id=task_id,
            product_name=product_name,
            current_price=current_price,
            target_price=task.target_price,
            price_change_percent=change_pct,
            condition=task.condition,
            agent_decision=ai_decision,
            agent_reason=ai_reason,
            confidence=ai_confidence,
            timestamp=datetime.utcnow(),
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)

        # Create notifications
        notif_types = get_notification_preferences(task.notification_pref)
        create_notification(db, alert, task, notif_types)

        # Attempt email
        await send_email_notification(alert, task)

        add_event(task_id, "🔔", f"Notification sent via: {', '.join(notif_types)}")
        _save_event_to_db(db, task_id, "🔔", f"Notification sent", details=f"Types: {', '.join(notif_types)}")

        return {
            "success": True,
            "action": "ALERT",
            "price": current_price,
            "reason": ai_reason,
            "alert_id": alert.id,
            "new_state": new_state,
        }

    else:
        if condition_met:
            add_event(task_id, "🔕", "Condition met but alert suppressed (duplicate prevention)")
            _save_event_to_db(db, task_id, "🔕", "Alert suppressed — duplicate prevention")
        else:
            add_event(task_id, "✅", f"Condition not satisfied. No alert needed.")
            _save_event_to_db(db, task_id, "✅", "Condition not satisfied")

        return {
            "success": True,
            "action": final_action,
            "price": current_price,
            "reason": ai_reason,
            "new_state": new_state,
        }
