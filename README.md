# AI Job Finder

AI Job Finder is a production-grade, automated SaaS application designed to scale and optimize software engineering job applications. It automatically crawls connected boards (Greenhouse, Lever, Ashby, Company portals), parses PDF/DOCX resume nodes using AI, computes ATS match scores using dense vector similarities, generates customizable cover letters/summaries, compiles technical question prep sheets, and tracks active funnels on a Kanban interface.

---

## System Architecture

```mermaid
graph TD
    Client[React SPA Client / Vite] -->|HTTPS Calls| Nginx[Nginx Reverse Proxy]
    Nginx -->|Frontend Routes| HTML[Static Assets HTML/JS]
    Nginx -->|/api/v1| FastAPI[FastAPI Server]
    FastAPI -->|Async Engine| Postgres[(PostgreSQL DB)]
    FastAPI -->|Vector Similarity| Numpy[NumPy Math Engine]
    FastAPI -->|AI Completions| OpenAI[OpenAI API]
    FastAPI -->|PDF/DOCX Reading| Extractors[PyPDF / python-docx]
    APScheduler[APScheduler Job Worker] -->|Triggers| Scrapers[Scraper Service]
    Scrapers -->|Boards API / BS4| Web[Greenhouse, Lever, Ashby, etc.]
    Scrapers -->|Seeds / Saves| Postgres
```

---

## Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    USERS {
        int id PK
        string email UK
        string hashed_password
        string full_name
        string role
        string profile_photo_path
        boolean is_active
        boolean is_verified
        string provider
        string provider_id
        datetime created_at
        datetime updated_at
    }
    COMPANIES {
        int id PK
        string name UK
        string logo_url
        string website_url
        string description
        datetime created_at
    }
    JOBS {
        int id PK
        int company_id FK
        string title
        string location
        string salary_range
        string experience_level
        string remote_status
        string description
        string apply_url
        datetime posting_date
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    RESUMES {
        int id PK
        int user_id FK
        string resume_path
        string raw_text
        json skills
        json experience
        json education
        json projects
        json certificates
        datetime created_at
    }
    APPLICATIONS {
        int id PK
        int user_id FK
        int job_id FK
        string status
        string notes
        datetime applied_date
        datetime created_at
        datetime updated_at
    }
    SAVED_JOBS {
        int id PK
        int user_id FK
        int job_id FK
        json tags
        datetime created_at
    }
    COVER_LETTERS {
        int id PK
        int user_id FK
        int job_id FK
        string content
        datetime created_at
        datetime updated_at
    }
    INTERVIEW_QUESTIONS {
        int id PK
        int user_id FK
        int job_id FK
        string question_type
        string question
        string expected_answer
        string difficulty
        datetime created_at
    }
    NOTIFICATIONS {
        int id PK
        int user_id FK
        string message
        boolean is_read
        string type
        datetime created_at
    }
    JOB_EMBEDDINGS {
        int job_id PK, FK
        array_float embedding
    }
    RESUME_EMBEDDINGS {
        int resume_id PK, FK
        array_float embedding
    }

    USERS ||--o{ RESUMES : uploads
    USERS ||--o{ APPLICATIONS : tracks
    USERS ||--o{ SAVED_JOBS : bookmarks
    USERS ||--o{ COVER_LETTERS : generates
    USERS ||--o{ INTERVIEW_QUESTIONS : practices
    USERS ||--o{ NOTIFICATIONS : receives
    COMPANIES ||--o{ JOBS : posts
    JOBS ||--o{ APPLICATIONS : has
    JOBS ||--o{ SAVED_JOBS : has
    JOBS ||--o{ COVER_LETTERS : has
    JOBS ||--o{ INTERVIEW_QUESTIONS : has
    JOBS ||--o| JOB_EMBEDDINGS : has
    RESUMES ||--o| RESUME_EMBEDDINGS : has
```

---

## Installation & Developer Quickstart

### Prerequisites
- [Docker & Docker Compose](https://docs.docker.com/get-docker/) installed.

### Local Execution (Docker Compose)
To compile and boot the entire stack (PostgreSQL, FastAPI Backend, React Frontend served via Nginx) simply execute:

```bash
docker compose up --build
```

The services will initialize:
- **Web App Interface**: Visit [http://localhost](http://localhost)
- **FastAPI Interactive Docs**: Visit [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger)
- **PostgreSQL Database**: Port `5432`

---

## Configuration Variables (.env)
Copy the `.env.example` file and configure your details:

```bash
cp .env.example .env
```

| Key | Description | Default |
|-----|-------------|---------|
| `SECRET_KEY` | JWT Signing key | `supersecretjwtkey...` |
| `DATABASE_URL` | Database Connection string | `postgresql+asyncpg://...` |
| `OPENAI_API_KEY` | OpenAI completion key (optional, falls back to local vector matching if blank) | `""` |

---

## API Documentation (OpenAPI)
The backend is powered by FastAPI and generates standard OpenAPI 3.0 documentation.
Once running, navigate to:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Production Deployment Guide

1. **Proxy & SSL Routing**:
   Ensure port `80` and `443` are open on the hosting gateway. The included Nginx configurations serve standard fallback paths for React Router routing support.
2. **Database Engine Migrations**:
   Alembic is configured to run automatically on server boot (`app/core/database_utils.py`), removing manual startup command locks.
3. **Environment Security**:
   Ensure `SECRET_KEY` and `OPENAI_API_KEY` are injected via secure runtime secret managers rather than committed inside files.
