from datetime import datetime, date
from typing import List, Optional, Any
from pydantic import BaseModel, EmailStr, Field


# ========================================================
# AUTHENTICATION & TOKENS
# ========================================================

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    type: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


# ========================================================
# USER SCHEMAS
# ========================================================

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "user"
    is_active: bool = True
    provider: str = "local"


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    profile_photo_path: Optional[str] = None


class UserOut(UserBase):
    id: int
    profile_photo_path: Optional[str] = None
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ========================================================
# COMPANY SCHEMAS
# ========================================================

class CompanyBase(BaseModel):
    name: str
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    description: Optional[str] = None


class CompanyCreate(CompanyBase):
    pass


class CompanyOut(CompanyBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ========================================================
# JOB SCHEMAS
# ========================================================

class JobBase(BaseModel):
    title: str
    location: Optional[str] = None
    salary_range: Optional[str] = None
    experience_level: Optional[str] = None
    remote_status: str = "onsite"
    description: str
    apply_url: str
    is_active: bool = True
    
    # New normalized fields
    source: Optional[str] = None
    salary: Optional[dict] = None
    skills: Optional[List[str]] = None
    employment_type: str = "Full-time"


class JobCreate(JobBase):
    company_name: str
    logo_url: Optional[str] = None
    website_url: Optional[str] = None


class JobUpdate(BaseModel):
    title: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    experience_level: Optional[str] = None
    remote_status: Optional[str] = None
    description: Optional[str] = None
    apply_url: Optional[str] = None
    is_active: Optional[bool] = None
    source: Optional[str] = None
    salary: Optional[dict] = None
    skills: Optional[List[str]] = None
    employment_type: Optional[str] = None


class JobOut(JobBase):
    id: int
    company_id: int
    company: CompanyOut
    posting_date: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ========================================================
# RESUME SCHEMAS
# ========================================================

class ResumeBase(BaseModel):
    resume_path: str
    raw_text: Optional[str] = None
    skills: Optional[List[str]] = None
    experience: Optional[List[Any]] = None
    education: Optional[List[Any]] = None
    projects: Optional[List[Any]] = None
    certificates: Optional[List[str]] = None


class ResumeCreate(ResumeBase):
    user_id: int


class ResumeOut(ResumeBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ========================================================
# APPLICATION SCHEMAS
# ========================================================

class ApplicationBase(BaseModel):
    job_id: int
    status: str = "wishlist"
    notes: Optional[str] = None


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class ApplicationOut(BaseModel):
    id: int
    user_id: int
    job_id: int
    status: str
    notes: Optional[str] = None
    applied_date: datetime
    created_at: datetime
    updated_at: datetime
    job: JobOut

    class Config:
        from_attributes = True


# ========================================================
# SAVED JOB SCHEMAS
# ========================================================

class SavedJobBase(BaseModel):
    job_id: int
    tags: List[str] = []


class SavedJobCreate(SavedJobBase):
    pass


class SavedJobOut(BaseModel):
    id: int
    user_id: int
    job_id: int
    tags: List[str]
    created_at: datetime
    job: JobOut

    class Config:
        from_attributes = True


# ========================================================
# COVER LETTER SCHEMAS
# ========================================================

class CoverLetterBase(BaseModel):
    job_id: int
    content: str


class CoverLetterCreate(CoverLetterBase):
    pass


class CoverLetterOut(CoverLetterBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    job: JobOut

    class Config:
        from_attributes = True


# ========================================================
# INTERVIEW QUESTIONS
# ========================================================

class InterviewQuestionBase(BaseModel):
    job_id: int
    question_type: str
    question: str
    expected_answer: Optional[str] = None
    difficulty: str = "medium"


class InterviewQuestionCreate(InterviewQuestionBase):
    pass


class InterviewQuestionOut(InterviewQuestionBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ========================================================
# NOTIFICATION SCHEMAS
# ========================================================

class NotificationOut(BaseModel):
    id: int
    user_id: int
    message: str
    is_read: bool
    type: str
    created_at: datetime

    class Config:
        from_attributes = True


# ========================================================
# AI MATCHING SCHEMAS
# ========================================================

class JobMatchResult(BaseModel):
    job_id: int
    job_title: str
    company_name: str
    match_score: int  # ATS Match Score in percentage
    missing_skills: List[str]
    suggested_improvements: List[str]
    explanation: str
