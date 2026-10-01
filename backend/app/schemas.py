"""Pydantic schemas for request/response validation."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    source: Optional[str] = "dummyjson"
    source_url: Optional[str] = None
    external_id: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductResponse(ProductBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class MonitoringTaskCreate(BaseModel):
    product_name: str
    product_id: Optional[int] = None
    condition: str
    target_price: Optional[float] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    discount_threshold: Optional[float] = None
    price_drop_percent: Optional[float] = None
    check_interval_minutes: int = 1
    notification_pref: str = "all"
    demo_mode: bool = True
    search_query: Optional[str] = None
    # Locked product identity (set when user selects from search results)
    locked_product_name: Optional[str] = None
    locked_brand: Optional[str] = None
    locked_model: Optional[str] = None
    locked_generation: Optional[str] = None
    locked_storage: Optional[str] = None
    locked_ram: Optional[str] = None
    locked_color: Optional[str] = None
    locked_source: Optional[str] = None
    locked_source_url: Optional[str] = None
    locked_match_score: Optional[float] = None
    product_locked: bool = False


class MonitoringTaskResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    condition: str
    target_price: Optional[float] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    discount_threshold: Optional[float] = None
    price_drop_percent: Optional[float] = None
    check_interval_minutes: int
    notification_pref: str
    is_active: bool
    is_paused: bool
    demo_mode: bool
    alert_state: str
    current_price: Optional[float] = None
    previous_price: Optional[float] = None
    last_checked: Optional[datetime] = None
    next_check: Optional[datetime] = None
    created_at: datetime
    search_query: Optional[str] = None
    locked_product_name: Optional[str] = None
    locked_brand: Optional[str] = None
    locked_model: Optional[str] = None
    locked_generation: Optional[str] = None
    locked_storage: Optional[str] = None
    locked_ram: Optional[str] = None
    locked_color: Optional[str] = None
    locked_source: Optional[str] = None
    locked_source_url: Optional[str] = None
    locked_match_score: Optional[float] = None
    product_locked: bool = False

    class Config:
        from_attributes = True


class PriceHistoryResponse(BaseModel):
    id: int
    task_id: int
    price: float
    previous_price: Optional[float] = None
    price_change: Optional[float] = None
    price_change_percent: Optional[float] = None
    source: Optional[str] = None
    source_url: Optional[str] = None
    agent_action: Optional[str] = None
    agent_reason: Optional[str] = None
    alert_state: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class AlertResponse(BaseModel):
    id: int
    task_id: int
    product_name: str
    current_price: float
    target_price: Optional[float] = None
    price_change_percent: Optional[float] = None
    condition: str
    agent_decision: str
    agent_reason: Optional[str] = None
    confidence: Optional[float] = None
    is_read: bool
    is_dismissed: bool
    timestamp: datetime

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    id: int
    alert_id: int
    notification_type: str
    title: str
    body: str
    is_sent: bool
    is_read: bool
    timestamp: datetime

    class Config:
        from_attributes = True


class AgentLogResponse(BaseModel):
    id: int
    task_id: Optional[int] = None
    level: str
    emoji: Optional[str] = None
    message: str
    details: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class AgentDecision(BaseModel):
    decision: str
    reason: str
    confidence: float
    recommended_action: str


class StatsResponse(BaseModel):
    active_monitors: int
    products_tracked: int
    alerts_triggered: int
    avg_price_drop: float
    last_agent_run: Optional[datetime] = None


class SimulatePriceDropRequest(BaseModel):
    task_id: int


class SearchResult(BaseModel):
    id: Optional[str] = None
    name: str
    brand: Optional[str] = None
    price: float
    discount_percentage: Optional[float] = None
    rating: Optional[float] = None
    image_url: Optional[str] = None
    source: str
    source_url: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
