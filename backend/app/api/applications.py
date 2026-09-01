from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_

from app.database import get_db
from app.models.models import Application, Job, User
from app.schemas.schemas import ApplicationOut, ApplicationCreate, ApplicationUpdate
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("", response_model=List[ApplicationOut])
async def read_applications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get all tracked applications for the authenticated user.
    """
    query = select(Application).where(Application.user_id == current_user.id).order_by(Application.updated_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
async def create_application(
    app_in: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Start tracking a new job application.
    """
    # Verify job posting exists
    job_chk = await db.execute(select(Job).where(Job.id == app_in.job_id))
    if not job_chk.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Target job posting not found.")
        
    # Check if user is already tracking this job
    dupe_chk = await db.execute(
        select(Application).where(
            and_(Application.user_id == current_user.id, Application.job_id == app_in.job_id)
        )
    )
    existing_app = dupe_chk.scalar_one_or_none()
    if existing_app:
        raise HTTPException(
            status_code=400,
            detail="You are already tracking an application for this job posting."
        )
        
    new_app = Application(
        user_id=current_user.id,
        job_id=app_in.job_id,
        status=app_in.status,
        notes=app_in.notes
    )
    db.add(new_app)
    await db.commit()
    await db.refresh(new_app)
    
    # Reload with job details for validation mapping
    stmt = select(Application).where(Application.id == new_app.id)
    res = await db.execute(stmt)
    return res.scalar_one()


@router.get("/{app_id}", response_model=ApplicationOut)
async def read_application(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Retrieve details of a specific job application track.
    """
    query = select(Application).where(
        and_(Application.id == app_id, Application.user_id == current_user.id)
    )
    result = await db.execute(query)
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application tracking record not found.")
    return app


@router.put("/{app_id}", response_model=ApplicationOut)
async def update_application(
    app_id: int,
    app_in: ApplicationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Update status, notes, or timelines for an application.
    """
    query = select(Application).where(
        and_(Application.id == app_id, Application.user_id == current_user.id)
    )
    result = await db.execute(query)
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application tracking record not found.")
        
    if app_in.status is not None:
        app.status = app_in.status
    if app_in.notes is not None:
        app.notes = app_in.notes
        
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app


@router.delete("/{app_id}", status_code=status.HTTP_200_OK)
async def delete_application(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Remove an application from tracking.
    """
    query = select(Application).where(
        and_(Application.id == app_id, Application.user_id == current_user.id)
    )
    result = await db.execute(query)
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application tracking record not found.")
        
    await db.delete(app)
    await db.commit()
    return {"message": "Application removed from tracking successfully."}
