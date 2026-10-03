"""FastAPI application entry point."""
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    is_serverless = bool(
        os.getenv("VERCEL")
        or os.getenv("VERCEL_ENV")
        or os.getenv("AWS_LAMBDA_FUNCTION_NAME")
        or os.getenv("LAMBDA_TASK_ROOT")
        or os.path.exists("/var/task")
    )

    # Startup
    try:
        from app.database import init_db
        logger.info("🚀 PriceGuard AI starting up...")
        init_db()
        logger.info("✅ Database initialized")
    except Exception as e:
        logger.warning(f"Database init notice: {e}")
    
    if not is_serverless:
        from app.scheduler import start_scheduler, reschedule_all_tasks
        start_scheduler()
        reschedule_all_tasks()
        logger.info("✅ Scheduler started")
    
    yield
    
    # Shutdown
    if not is_serverless:
        from app.scheduler import stop_scheduler
        stop_scheduler()
        logger.info("👋 PriceGuard AI shutting down")


app = FastAPI(
    title="PriceGuard AI",
    description="Autonomous AI Price Monitoring Agent",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from app.routes import products, monitoring, alerts, dashboard

app.include_router(products.router)
app.include_router(monitoring.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {
        "name": "PriceGuard AI",
        "version": "1.0.0",
        "description": "Autonomous AI Price Monitoring Agent",
        "docs": "/docs",
    }
