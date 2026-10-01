"""Monitoring task routes — with product identity locking."""
import logging
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MonitoringTask, Product, PriceHistory, Alert
from app.schemas import MonitoringTaskCreate, MonitoringTaskResponse, PriceHistoryResponse
from app.agent.agent import run_monitoring_cycle
from app.agent.tools.product_search import (
    simulate_price_drop, lock_product_for_task,
    _demo_price_sequences, _demo_price_indices,
)
from app.scheduler import schedule_task, remove_job, pause_task, resume_task

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/monitor", tags=["monitoring"])


@router.post("", response_model=MonitoringTaskResponse)
async def create_monitor(payload: MonitoringTaskCreate, db: Session = Depends(get_db)):
    """Create a new monitoring task with optional product identity lock."""

    # Create or find product record
    product = db.query(Product).filter(Product.name == payload.product_name).first()
    if not product:
        product = Product(
            name=payload.product_name,
            source=payload.locked_source or "dummyjson",
            source_url=payload.locked_source_url,
        )
        db.add(product)
        db.commit()
        db.refresh(product)

    task = MonitoringTask(
        product_id=product.id,
        product_name=payload.product_name,
        condition=payload.condition,
        target_price=payload.target_price,
        min_price=payload.min_price,
        max_price=payload.max_price,
        discount_threshold=payload.discount_threshold,
        price_drop_percent=payload.price_drop_percent,
        check_interval_minutes=payload.check_interval_minutes,
        notification_pref=payload.notification_pref,
        demo_mode=payload.demo_mode,
        is_active=True,
        is_paused=False,
        alert_state="NOT_TRIGGERED",
        next_check=datetime.utcnow() + timedelta(minutes=payload.check_interval_minutes),
        search_query=payload.search_query or payload.product_name,
        # Product identity lock
        locked_product_name=payload.locked_product_name or payload.product_name,
        locked_brand=payload.locked_brand,
        locked_model=payload.locked_model,
        locked_generation=payload.locked_generation,
        locked_storage=payload.locked_storage,
        locked_ram=payload.locked_ram,
        locked_color=payload.locked_color,
        locked_source=payload.locked_source,
        locked_source_url=payload.locked_source_url,
        locked_match_score=payload.locked_match_score,
        product_locked=payload.product_locked,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Lock product in memory for the agent
    if payload.product_locked and payload.locked_product_name:
        lock_product_for_task(task.id, {
            "name": payload.locked_product_name,
            "brand": payload.locked_brand,
            "model": payload.locked_model,
            "generation": payload.locked_generation,
            "storage": payload.locked_storage,
            "ram": payload.locked_ram,
            "color": payload.locked_color,
            "source": payload.locked_source,
            "source_url": payload.locked_source_url,
            "match_score": payload.locked_match_score,
        })

    # Schedule
    schedule_task(task.id, task.check_interval_minutes)

    # Initial run
    try:
        await run_monitoring_cycle(db, task)
        db.refresh(task)
    except Exception as e:
        logger.error(f"Initial monitoring cycle failed: {e}")

    return task


@router.get("", response_model=List[MonitoringTaskResponse])
def list_monitors(db: Session = Depends(get_db)):
    """List all active monitoring tasks."""
    return (
        db.query(MonitoringTask)
        .filter(MonitoringTask.is_active == True)
        .order_by(MonitoringTask.created_at.desc())
        .all()
    )


@router.get("/{task_id}", response_model=MonitoringTaskResponse)
def get_monitor(task_id: int, db: Session = Depends(get_db)):
    task = db.query(MonitoringTask).filter(MonitoringTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Monitor not found")
    return task


@router.delete("/{task_id}")
def delete_monitor(task_id: int, db: Session = Depends(get_db)):
    task = db.query(MonitoringTask).filter(MonitoringTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Monitor not found")
    remove_job(f"task_{task_id}")
    task.is_active = False
    db.commit()
    return {"message": "Monitor deleted", "id": task_id}


@router.post("/{task_id}/check")
async def force_check(task_id: int, db: Session = Depends(get_db)):
    """Force an immediate monitoring cycle."""
    task = db.query(MonitoringTask).filter(
        MonitoringTask.id == task_id, MonitoringTask.is_active == True
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Monitor not found")

    # Re-lock in memory if it was lost (e.g. after restart)
    if task.product_locked and task.locked_product_name:
        from app.agent.tools.product_search import get_locked_product
        if not get_locked_product(task_id):
            lock_product_for_task(task_id, {
                "name": task.locked_product_name,
                "brand": task.locked_brand,
                "model": task.locked_model,
                "generation": task.locked_generation,
                "storage": task.locked_storage,
                "source": task.locked_source,
                "source_url": task.locked_source_url,
                "match_score": task.locked_match_score,
            })

    result = await run_monitoring_cycle(db, task, force=True)
    db.refresh(task)
    return {"result": result, "task": MonitoringTaskResponse.from_orm(task)}


@router.post("/{task_id}/pause")
def pause_monitor(task_id: int, db: Session = Depends(get_db)):
    task = db.query(MonitoringTask).filter(MonitoringTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Monitor not found")
    task.is_paused = True
    db.commit()
    pause_task(task_id)
    return {"message": "Monitor paused", "id": task_id}


@router.post("/{task_id}/resume")
def resume_monitor(task_id: int, db: Session = Depends(get_db)):
    task = db.query(MonitoringTask).filter(MonitoringTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Monitor not found")
    task.is_paused = False
    db.commit()
    resume_task(task_id)
    return {"message": "Monitor resumed", "id": task_id}


@router.get("/{task_id}/history", response_model=List[PriceHistoryResponse])
def get_history(task_id: int, limit: int = 50, db: Session = Depends(get_db)):
    task = db.query(MonitoringTask).filter(MonitoringTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Monitor not found")
    history = (
        db.query(PriceHistory)
        .filter(PriceHistory.task_id == task_id)
        .order_by(PriceHistory.timestamp.desc())
        .limit(limit)
        .all()
    )
    return history
