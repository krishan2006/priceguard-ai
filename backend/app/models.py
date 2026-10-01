"""SQLAlchemy models for PriceGuard AI."""
import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class MonitoringCondition(str, enum.Enum):
    PRICE_BELOW_TARGET = "price_below_target"
    PRICE_REACHES_TARGET = "price_reaches_target"
    PRICE_IN_RANGE = "price_in_range"
    DISCOUNT_REACHES_PERCENT = "discount_reaches_percent"
    PRICE_DROPS_BY_PERCENT = "price_drops_by_percent"


class AlertState(str, enum.Enum):
    NOT_TRIGGERED = "NOT_TRIGGERED"
    TRIGGERED = "TRIGGERED"
    ALERT_SENT = "ALERT_SENT"
    WAITING_FOR_STATE_CHANGE = "WAITING_FOR_STATE_CHANGE"
    TRIGGERED_AGAIN = "TRIGGERED_AGAIN"


class AgentAction(str, enum.Enum):
    ALERT = "ALERT"
    NO_ALERT = "NO_ALERT"
    PRICE_UNCHANGED = "PRICE_UNCHANGED"
    PRICE_ABOVE_TARGET = "PRICE_ABOVE_TARGET"
    PRICE_WITHIN_RANGE = "PRICE_WITHIN_RANGE"
    PRICE_BELOW_THRESHOLD = "PRICE_BELOW_THRESHOLD"
    SOURCE_UNAVAILABLE = "SOURCE_UNAVAILABLE"


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    brand = Column(String(255), nullable=True)
    category = Column(String(255), nullable=True)
    image_url = Column(Text, nullable=True)
    source = Column(String(100), nullable=True, default="dummyjson")
    source_url = Column(Text, nullable=True)
    external_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    monitoring_tasks = relationship("MonitoringTask", back_populates="product")


class MonitoringTask(Base):
    __tablename__ = "monitoring_tasks"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    product_name = Column(String(255), nullable=False)
    condition = Column(String(100), nullable=False)
    target_price = Column(Float, nullable=True)
    min_price = Column(Float, nullable=True)
    max_price = Column(Float, nullable=True)
    discount_threshold = Column(Float, nullable=True)
    price_drop_percent = Column(Float, nullable=True)
    check_interval_minutes = Column(Integer, default=1)
    notification_pref = Column(String(50), default="all")
    is_active = Column(Boolean, default=True)
    is_paused = Column(Boolean, default=False)
    demo_mode = Column(Boolean, default=False)
    demo_price_index = Column(Integer, default=0)
    alert_state = Column(String(50), default="NOT_TRIGGERED")
    current_price = Column(Float, nullable=True)
    previous_price = Column(Float, nullable=True)
    last_checked = Column(DateTime, nullable=True)
    next_check = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    search_query = Column(String(255), nullable=True)
    # Locked product identity
    locked_product_name = Column(String(255), nullable=True)
    locked_brand = Column(String(100), nullable=True)
    locked_model = Column(String(255), nullable=True)
    locked_generation = Column(String(100), nullable=True)
    locked_storage = Column(String(50), nullable=True)
    locked_ram = Column(String(50), nullable=True)
    locked_color = Column(String(100), nullable=True)
    locked_source = Column(String(100), nullable=True)
    locked_source_url = Column(Text, nullable=True)
    locked_match_score = Column(Float, nullable=True)
    product_locked = Column(Boolean, default=False)

    product = relationship("Product", back_populates="monitoring_tasks")
    price_history = relationship("PriceHistory", back_populates="task", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="task", cascade="all, delete-orphan")


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("monitoring_tasks.id"), nullable=False)
    price = Column(Float, nullable=False)
    previous_price = Column(Float, nullable=True)
    price_change = Column(Float, nullable=True)
    price_change_percent = Column(Float, nullable=True)
    source = Column(String(100), nullable=True)
    source_url = Column(Text, nullable=True)
    agent_action = Column(String(100), nullable=True)
    agent_reason = Column(Text, nullable=True)
    alert_state = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    task = relationship("MonitoringTask", back_populates="price_history")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("monitoring_tasks.id"), nullable=False)
    product_name = Column(String(255), nullable=False)
    current_price = Column(Float, nullable=False)
    target_price = Column(Float, nullable=True)
    price_change_percent = Column(Float, nullable=True)
    condition = Column(String(100), nullable=False)
    agent_decision = Column(String(100), nullable=False)
    agent_reason = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    is_read = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    task = relationship("MonitoringTask", back_populates="alerts")
    notifications = relationship("Notification", back_populates="alert", cascade="all, delete-orphan")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=False)
    notification_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    is_sent = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    alert = relationship("Alert", back_populates="notifications")


class AgentLog(Base):
    __tablename__ = "agent_logs"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("monitoring_tasks.id"), nullable=True)
    level = Column(String(20), default="INFO")
    emoji = Column(String(10), nullable=True)
    message = Column(Text, nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
