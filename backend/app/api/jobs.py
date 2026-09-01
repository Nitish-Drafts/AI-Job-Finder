import datetime
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_, func
import sqlalchemy as sa
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.models import Job, Company, SavedJob, Resume, User
from app.schemas.schemas import JobOut, SavedJobOut, JobMatchResult
from app.api.deps import get_current_active_user, get_current_admin_user
from app.services.ai_service import ai_service
from app.services.scraper import scraper_service

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/sources/status")
async def get_sources_status(
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Returns the status (working, unavailable) of all integrated job boards.
    """
    return scraper_service.get_sources_status()


@router.get("", response_model=List[JobOut])
async def read_jobs(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
    q: Optional[str] = None,
    experience: Optional[str] = None,
    remote_status: Optional[str] = None,
    location: Optional[str] = None,
    employment_type: Optional[str] = None,
    source: Optional[str] = None,
    min_salary: Optional[int] = None,
    posted_days: Optional[int] = None,
    sort_by: str = "newest",
) -> Any:
    """
    Search and filter job listings.
    Supports filtering by keyword, experience level, remote status, location, employment type, source, min salary, and post date.
    Supports sorting by newest, relevance, and salary high-to-low/low-to-high.
    """
    query = select(Job).options(selectinload(Job.company)).join(Company).where(Job.is_active == True)
    
    # Apply filters
    if q:
        query = query.where(
            (Job.title.ilike(f"%{q}%")) | 
            (Job.description.ilike(f"%{q}%")) |
            (Company.name.ilike(f"%{q}%"))
        )
    if experience:
        query = query.where(Job.experience_level == experience)
    if remote_status:
        query = query.where(Job.remote_status == remote_status)
    if location:
        query = query.where(Job.location.ilike(f"%{location}%"))
    if employment_type:
        query = query.where(Job.employment_type == employment_type)
    if source:
        query = query.where(Job.source.ilike(f"%{source}%"))
        
    # Database-agnostic JSON salary filters
    if min_salary is not None:
        if db.bind and db.bind.dialect.name == "postgresql":
            query = query.where(sa.cast(Job.salary["max"].astext, sa.Integer) >= min_salary)
        else:
            query = query.where(sa.cast(func.json_extract(Job.salary, "$.max"), sa.Integer) >= min_salary)
            
    if posted_days:
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=posted_days)
        query = query.where(Job.posting_date >= cutoff)
        
    # Sorting
    if sort_by == "newest":
        query = query.order_by(Job.posting_date.desc())
    elif sort_by == "salary_high_low":
        if db.bind and db.bind.dialect.name == "postgresql":
            salary_expr = sa.cast(Job.salary["max"].astext, sa.Integer)
        else:
            salary_expr = sa.cast(func.json_extract(Job.salary, "$.max"), sa.Integer)
        # Order nulls last
        query = query.order_by(salary_expr.desc().nulls_last())
    elif sort_by == "salary_low_high":
        if db.bind and db.bind.dialect.name == "postgresql":
            salary_expr = sa.cast(Job.salary["min"].astext, sa.Integer)
        else:
            salary_expr = sa.cast(func.json_extract(Job.salary, "$.min"), sa.Integer)
        query = query.order_by(salary_expr.asc().nulls_last())
    else:
        # Default or relevance (sorted by title matches first, then posting date)
        query = query.order_by(Job.posting_date.desc())

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/matched", response_model=List[JobMatchResult])
async def read_matched_jobs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    limit: int = 15
) -> Any:
    """
    Calculate and return job recommendations based on the user's uploaded resume using vector embeddings.
    """
    # Fetch active user resume
    res_query = select(Resume).where(Resume.user_id == current_user.id).order_by(Resume.created_at.desc())
    res_exec = await db.execute(res_query)
    resume = res_exec.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(
            status_code=400,
            detail="No uploaded resume found. Please upload a PDF/DOCX resume first."
        )
        
    # Lazy calculate embeddings if missing
    from app.models.models import ResumeEmbedding
    r_emb_chk = await db.execute(select(ResumeEmbedding).where(ResumeEmbedding.resume_id == resume.id))
    if not r_emb_chk.scalar_one_or_none():
        await ai_service.generate_resume_embedding(db, resume.id)
        
    # Generate all missing job embeddings as well
    await ai_service.generate_all_missing_job_embeddings(db)
    
    # Match
    matches = await ai_service.match_resume_to_jobs(db, resume.id, limit=limit)
    return matches


@router.get("/saved", response_model=List[SavedJobOut])
async def read_saved_jobs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get user's bookmarked job postings.
    """
    query = select(SavedJob).where(SavedJob.user_id == current_user.id).order_by(SavedJob.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{job_id}", response_model=JobOut)
async def read_job(
    job_id: int,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Get detailed information for a specific job posting.
    """
    result = await db.execute(select(Job).options(selectinload(Job.company)).where(Job.id == job_id)
)
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found.")
    return job


@router.post("/{job_id}/save", response_model=SavedJobOut)
async def save_job(
    job_id: int,
    tags: List[str] = Query([]),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Bookmark a job posting for the user. Supports optional tag grouping.
    """
    # Verify job exists
    job_chk = await db.execute(select(Job).where(Job.id == job_id))
    if not job_chk.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Job posting not found.")
        
    # Check if already saved
    dupe_chk = await db.execute(
        select(SavedJob).where(and_(SavedJob.user_id == current_user.id, SavedJob.job_id == job_id))
    )
    saved = dupe_chk.scalar_one_or_none()
    if saved:
        saved.tags = list(set(saved.tags + tags))
    else:
        saved = SavedJob(user_id=current_user.id, job_id=job_id, tags=tags)
        db.add(saved)
        
    await db.commit()
    await db.refresh(saved)
    return saved


@router.delete("/{job_id}/unsave")
async def unsave_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Remove a bookmarked job posting.
    """
    await db.execute(
        delete(SavedJob).where(and_(SavedJob.user_id == current_user.id, SavedJob.job_id == job_id))
    )
    await db.commit()
    return {"message": "Job bookmark removed successfully."}


@router.post("/scrape-sync", status_code=status.HTTP_200_OK)
async def trigger_scraper_sync(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Admin-only endpoint to trigger a scraping cycle immediately.
    """
    try:
        # Seed mock jobs to ensure tables are loaded
        seeded = await scraper_service.seed_mock_postings(db)
        # Run all active crawlers
        sync_result = await scraper_service.sync_jobs(db)
        # Run embedding updates
        await ai_service.generate_all_missing_job_embeddings(db)
        
        return {
            "message": "Crawl sync completed successfully.",
            "seeded_records": seeded,
            "scraped_records": sync_result.get("saved", 0),
            "errors": sync_result.get("errors", {})
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Crawl sync encountered errors: {e}"
        )
