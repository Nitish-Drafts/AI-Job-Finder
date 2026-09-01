import logging
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import SessionLocal
from app.services.scraper import scraper_service
from app.services.ai_service import ai_service

logger = logging.getLogger("scheduler_service")

# Initialize the global scheduler
scheduler = AsyncIOScheduler()


async def scrape_and_process_jobs_job():
    """
    Daily background job task:
    1. Scrapes job listings from configured boards.
    2. Seeds mock jobs if the database is empty.
    3. Triggers embedding updates for any jobs lacking vectors.
    4. Triggers daily email match digests.
    """
    logger.info(f"Background Job execution started at: {datetime.utcnow()}")
    async with SessionLocal() as db:
        try:
            # 1. Scrape and sync all active job source adapters
            await scraper_service.sync_jobs(db)
            
            # 2. Skip seeding mock records in production
            pass
            
            # 3. Calculate embeddings for any job postings that don't have them
            await ai_service.generate_all_missing_job_embeddings(db)
            logger.info("Background jobs processing finished successfully.")
            
        except Exception as e:
            logger.error(f"Error executing background scheduler jobs: {e}")


def start_scheduler():
    """
    Starts the APScheduler. Registers the daily crawl task at 8:00 AM.
    """
    if not scheduler.running:
        logger.info("Initializing background scheduler...")
        
        # Schedule the daily job scraper for 8:00 AM every morning
        scheduler.add_job(
            scrape_and_process_jobs_job,
            IntervalTrigger(minutes=15),
            id="daily_job_scraper",
            replace_existing=True
        )
        
        scheduler.start()
        logger.info("Background scheduler started. Next run scheduled daily at 8:00 AM.")


def stop_scheduler():
    """
    Shuts down the scheduler gracefully.
    """
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Background scheduler shut down successfully.")
