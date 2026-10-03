"""Database configuration and session management."""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

import tempfile

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    try:
        # Check if local directory is writable
        test_file = "./.test_write"
        with open(test_file, "w") as f:
            f.write("1")
        if os.path.exists(test_file):
            os.remove(test_file)
        DATABASE_URL = "sqlite:///./priceguard.db"
    except Exception:
        # Fallback to temp directory on serverless/read-only systems
        try:
            tmp_db = os.path.join(tempfile.gettempdir(), "priceguard.db")
            with open(tmp_db, "a") as f:
                pass
            DATABASE_URL = f"sqlite:///{tmp_db}"
        except Exception:
            DATABASE_URL = "sqlite:///:memory:"

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
