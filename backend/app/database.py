"""Database configuration and session management."""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

import tempfile

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    # Check for serverless / read-only filesystem environments (Vercel, AWS Lambda)
    is_serverless = bool(
        os.getenv("VERCEL")
        or os.getenv("VERCEL_ENV")
        or os.getenv("AWS_LAMBDA_FUNCTION_NAME")
        or os.getenv("LAMBDA_TASK_ROOT")
        or os.path.exists("/var/task")
    )
    if is_serverless:
        db_path = os.path.join(tempfile.gettempdir(), "priceguard.db")
        DATABASE_URL = f"sqlite:///{db_path}"
    else:
        DATABASE_URL = "sqlite:///./priceguard.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models import Product, MonitoringTask, PriceHistory, Alert, Notification, AgentLog  # noqa
    Base.metadata.create_all(bind=engine)
