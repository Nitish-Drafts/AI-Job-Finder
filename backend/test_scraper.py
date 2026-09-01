import asyncio
from app.database import SessionLocal
from app.services.scraper import scraper_service

async def main():
    async with SessionLocal() as db:
        count = await scraper_service.scrape_greenhouse(db, "vercel")
        print("VERCEL JOBS SAVED:", count)

asyncio.run(main())
