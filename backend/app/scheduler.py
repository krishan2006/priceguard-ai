"""APScheduler background job management."""
import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import MonitoringTask
from app.agent.agent import run_monitoring_cycle

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


def get_db_session() -> Session:
    return SessionLocal()


async def run_task_cycle(task_id: int):
    """Run monitoring cycle for a specific task."""
    db = get_db_session()
    try:
        task = db.query(MonitoringTask).filter(
            MonitoringTask.id == task_id,
            MonitoringTask.is_active == True,
            MonitoringTask.is_paused == False,
        ).first()
        
        if not task:
            logger.info(f"Task {task_id} not found or inactive, removing job")
            remove_job(f"task_{task_id}")
            return
        
        await run_monitoring_cycle(db, task)
    except Exception as e:
        logger.error(f"Error in monitoring cycle for task {task_id}: {e}")
    finally:
        db.close()


async def run_all_active_tasks():
    """Run monitoring cycles for all active tasks (used at startup)."""
    db = get_db_session()
    try:
        tasks = db.query(MonitoringTask).filter(
            MonitoringTask.is_active == True,
            MonitoringTask.is_paused == False,
        ).all()
        
        for task in tasks:
            try:
                await run_monitoring_cycle(db, task)
            except Exception as e:
                logger.error(f"Error running task {task.id}: {e}")
    finally:
        db.close()


def schedule_task(task_id: int, interval_minutes: int):
    """Schedule a monitoring task with APScheduler."""
    job_id = f"task_{task_id}"
    
    # Remove existing job if any
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    
    scheduler.add_job(
        run_task_cycle,
        trigger=IntervalTrigger(minutes=interval_minutes),
        id=job_id,
        args=[task_id],
        replace_existing=True,
        next_run_time=datetime.utcnow() + timedelta(seconds=5),
    )
    logger.info(f"Scheduled task {task_id} every {interval_minutes} minute(s)")


def remove_job(job_id: str):
    """Remove a scheduled job."""
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
        logger.info(f"Removed job {job_id}")


def pause_task(task_id: int):
    """Pause a scheduled task."""
    job_id = f"task_{task_id}"
    if scheduler.get_job(job_id):
        scheduler.pause_job(job_id)
        logger.info(f"Paused task {task_id}")


def resume_task(task_id: int):
    """Resume a paused task."""
    job_id = f"task_{task_id}"
    if scheduler.get_job(job_id):
        scheduler.resume_job(job_id)
        logger.info(f"Resumed task {task_id}")


def start_scheduler():
    """Start the APScheduler."""
    if not scheduler.running:
        scheduler.start()
        logger.info("APScheduler started")


def stop_scheduler():
    """Stop the APScheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")


def reschedule_all_tasks():
    """Reschedule all active tasks from DB at startup."""
    db = get_db_session()
    try:
        tasks = db.query(MonitoringTask).filter(
            MonitoringTask.is_active == True,
        ).all()
        
        for task in tasks:
            schedule_task(task.id, task.check_interval_minutes)
            if task.is_paused:
                pause_task(task.id)
        
        logger.info(f"Rescheduled {len(tasks)} task(s)")
    finally:
        db.close()
