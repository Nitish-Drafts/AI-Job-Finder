import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.core.database_utils import run_migrations
from app.services.scheduler import start_scheduler, stop_scheduler, scrape_and_process_jobs_job
from app.api import auth, jobs, applications, optimization, analytics

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages FastAPI application startup and shutdown lifespan events.
    Excludes database locks and coordinates background schedule workers.
    """
    logger.info("Initializing application setup...")
    
    # 1. Run migrations or create direct SQLAlchemy metadata tables
    try:
        run_migrations()
    except Exception as err:
        logger.critical(f"Startup migration runner failed: {err}")

    # 2. Seed default listings and start the crawler scheduler
    if settings.ENABLE_SCHEDULER:
        try:
            start_scheduler()
            # Trigger an immediate background processing cycle to populate the DB with mock jobs if it is empty
            await scrape_and_process_jobs_job()
        except Exception as err:
            logger.error(f"Startup background seeding task failed: {err}")
        
    yield
    
    # Graceful shutdown
    logger.info("Initiating application shutdown...")
    if settings.ENABLE_SCHEDULER:
        stop_scheduler()


# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Scalable, Production-Ready backend API powering the AI Job Finder platform.",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Router Endpoints
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(jobs.router, prefix=settings.API_V1_STR)
app.include_router(applications.router, prefix=settings.API_V1_STR)
app.include_router(optimization.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)


@app.get("/", include_in_schema=False)
async def redirect_to_documentation():
    """
    Redirects direct API root requests to Swagger interactive docs.
    """
    return RedirectResponse(url="/docs")


@app.get("/health", tags=["health"])
async def get_health_status():
    """
    Lightweight health endpoint for Nginx and Docker container checks.
    """
    return {"status": "healthy", "service": settings.PROJECT_NAME}
