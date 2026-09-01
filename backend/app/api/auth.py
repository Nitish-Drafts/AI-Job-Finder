import os
import shutil
import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.config import settings
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_password_reset_token,
    decode_token,
)
from app.database import get_db
from app.models.models import User, Resume
from app.schemas.schemas import (
    Token,
    UserCreate,
    UserLogin,
    UserOut,
    UserUpdate,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.api.deps import get_current_user
from app.services.email_service import send_password_reset_email

# Setup router
router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
async def signup(user_in: UserCreate, db: AsyncSession = Depends(get_db)) -> Any:
    """
    Register a new user account.
    """
    # Check if email is already taken
    result = await db.execute(select(User).where(User.email == user_in.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )

    # Create new user
    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Generate credentials
    access_token = create_access_token(new_user.id)
    refresh_token = create_refresh_token(new_user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/login", response_model=Token)
async def login(user_in: UserLogin, db: AsyncSession = Depends(get_db)) -> Any:
    """
    Standard JWT Authentication Login.
    """
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalar_one_or_none()
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=400, detail="Incorrect email or password"
        )
    if not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=400, detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # Generate credentials
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/login-form", response_model=Token)
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    FastAPI OAuth2 Form Authentication (for Swagger Docs).
    """
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=400, detail="Incorrect email or password"
        )
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=400, detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # Generate credentials
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_token: str, db: AsyncSession = Depends(get_db)) -> Any:
    """
    Generates a new access token using a valid refresh token.
    """
    payload = decode_token(refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
        
    user_id_str = payload.get("sub")
    token_type = payload.get("type")
    
    if user_id_str is None or token_type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token context",
        )
        
    user_id = int(user_id_str)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
        
    return {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
    }


@router.post("/forgot-password")
async def forgot_password(
    req: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Send password reset token link. Since this is local, we return the token in the API response
    for testing convenience, which fulfills mock email requirements.
    """
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    # Do not expose whether an account exists. A real deployment should email this link.
    if not user:
        return {"message": "If an account exists for that email, a reset link is on its way."}

    reset_token = create_password_reset_token(user.id)
    
    reset_link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={reset_token}"
    delivered = await send_password_reset_email(user.email, reset_link)
    response = {"message": "If an account exists for that email, a reset link is on its way."}
    # Keep local development convenient without ever exposing a token in production.
    if settings.APP_ENV.lower() != "production" and not delivered:
        response["reset_token"] = reset_token
    return response


@router.post("/reset-password")
async def reset_password(
    req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Reset user password using the generated token.
    """
    payload = decode_token(req.token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token is invalid or expired.",
        )
        
    user_id_str = payload.get("sub")
    if user_id_str is None or payload.get("type") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token content.",
        )
        
    user_id = int(user_id_str)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )
        
    user.hashed_password = get_password_hash(req.new_password)
    db.add(user)
    await db.commit()
    
    return {"message": "Password reset completed successfully."}


@router.get("/me", response_model=UserOut)
async def read_current_user(current_user: User = Depends(get_current_user)) -> Any:
    """
    Retrieve currently authenticated profile.
    """
    return current_user


@router.put("/me", response_model=UserOut)
async def update_current_user(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Update currently authenticated profile details.
    """
    if user_in.email is not None and user_in.email != current_user.email:
        # Check unique
        result = await db.execute(select(User).where(User.email == user_in.email))
        existing = result.scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered.")
        current_user.email = user_in.email

    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name
    if user_in.password is not None:
        current_user.hashed_password = get_password_hash(user_in.password)

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/me/photo", response_model=UserOut)
async def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Upload and save user profile photo.
    """
    # Create file suffix
    ext = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{ext}"
    dest_path = os.path.join(settings.UPLOAD_DIR, "profiles", unique_filename)
    
    # Save the file
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    current_user.profile_photo_path = dest_path
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    
    return current_user


@router.post("/me/resume")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Upload resume file (PDF or DOCX). Saves the file and triggers direct
    text parsing immediately to update user details in the system.
    """
    # Verify file extension
    ext = file.filename.split(".")[-1].lower()
    if ext not in ["pdf", "docx", "txt"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file extension. Please upload PDF, DOCX, or TXT."
        )
        
    unique_filename = f"{uuid.uuid4()}.{ext}"
    dest_path = os.path.join(settings.UPLOAD_DIR, "resumes", unique_filename)
    
    # Save file to disk
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Lazy imports to prevent circular dependencies
    from app.services.ai_service import ai_service
    
    # Parse text content from uploaded file
    try:
        raw_text = ai_service.extract_text_from_file(dest_path)
    except Exception as e:
        raw_text = ""
        
    # Extract structure details via mock/local AI parse if OpenAI API Key is missing
    parsed_resume = await ai_service.parse_resume(raw_text)
    
    # Create or update resume
    # Check if resume already exists for user
    result = await db.execute(select(Resume).where(Resume.user_id == current_user.id))
    existing_resume = result.scalar_one_or_none()
    
    if existing_resume:
        existing_resume.resume_path = dest_path
        existing_resume.raw_text = raw_text
        existing_resume.skills = parsed_resume.get("skills", [])
        existing_resume.experience = parsed_resume.get("experience", [])
        existing_resume.education = parsed_resume.get("education", [])
        existing_resume.projects = parsed_resume.get("projects", [])
        existing_resume.certificates = parsed_resume.get("certificates", [])
        db.add(existing_resume)
        await db.commit()
        await db.refresh(existing_resume)
        resume_record = existing_resume
    else:
        new_resume = Resume(
            user_id=current_user.id,
            resume_path=dest_path,
            raw_text=raw_text,
            skills=parsed_resume.get("skills", []),
            experience=parsed_resume.get("experience", []),
            education=parsed_resume.get("education", []),
            projects=parsed_resume.get("projects", []),
            certificates=parsed_resume.get("certificates", []),
        )
        db.add(new_resume)
        await db.commit()
        await db.refresh(new_resume)
        resume_record = new_resume
        
    # Programmatically trigger asynchronous embedding calculation
    try:
        await ai_service.generate_resume_embedding(db, resume_record.id)
    except Exception as emb_err:
        # Don't fail the whole upload if embedding generation fails (e.g. no internet/OpenAI key)
        pass

    return {
        "message": "Resume uploaded and processed successfully.",
        "resume_id": resume_record.id,
        "parsed_data": {
            "skills": resume_record.skills,
            "education": resume_record.education,
            "experience": resume_record.experience,
            "projects": resume_record.projects,
            "certificates": resume_record.certificates
        }
    }
