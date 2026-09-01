"""
One-shot script to fix existing mock job descriptions and company logos in the SQLite DB.
Run from backend/ directory:
    python fix_existing_jobs.py
"""
import asyncio
import textwrap
from sqlalchemy import select, update
from app.database import SessionLocal
from app.models.models import Job, Company

FIXED_DESCRIPTIONS = {
    "Senior AI & Machine Learning Engineer": (
        "Google is seeking a Senior AI and Machine Learning Engineer to work on next-generation search systems.\n\n"
        "Key Technologies: Python, TensorFlow, PyTorch, Kubernetes, Docker, Transformer models, LLMs.\n\n"
        "Requirements:\n"
        "- 3+ years of experience deploying machine learning systems in production.\n"
        "- Strong experience in cloud infrastructure (GCP/AWS), Kubernetes containers, and Docker.\n"
        "- Knowledge of Vector Databases and NLP models.\n"
        "- Core software development background using clean Python and C++."
    ),
    "Full Stack Engineer (React/Python)": (
        "Stripe is building payment infrastructures for the internet. We are looking for a Full Stack Engineer to support merchant billing engines.\n\n"
        "Key Technologies: React, TypeScript, Python, FastAPI, PostgreSQL, AWS S3.\n\n"
        "Requirements:\n"
        "- 2+ years of experience with backend Python (FastAPI/Flask) and relational database design.\n"
        "- Proficient with React.js, TypeScript, and modern state-management patterns.\n"
        "- Solid experience with unit testing and CI/CD pipelines using GitHub Actions."
    ),
    "DevOps & Infrastructure Architect": (
        "Netflix is searching for an Infrastructure/DevOps Architect to build scalable encoding tools.\n\n"
        "Key Technologies: Docker, Kubernetes, AWS S3, Terraform, Python, Shell Scripting, CI/CD.\n\n"
        "Requirements:\n"
        "- 4+ years of cloud infrastructure management (AWS).\n"
        "- Advanced container orchestration using Kubernetes and Docker configurations.\n"
        "- Background in Python scripting for automation."
    ),
    "Junior Frontend Engineer": (
        "Join Vercel to optimize web deployments. We need a Junior Frontend Developer to join our dashboard team.\n\n"
        "Key Technologies: Next.js, React, TailwindCSS, TypeScript, Vitest, CI/CD.\n\n"
        "Requirements:\n"
        "- 1+ years of web development experience building dashboards.\n"
        "- Deep knowledge of React, Next.js, and CSS styling frameworks like Tailwind.\n"
        "- Experience writing client-side unit tests in Vitest or Jest."
    ),
    "Large Language Model SRE": (
        "Maintain and scale core inference endpoints at OpenAI.\n\n"
        "Key Technologies: Kubernetes, Docker, Triton, PyTorch, Pytest, Python, AWS.\n\n"
        "Requirements:\n"
        "- Extensive knowledge in Kubernetes infrastructure and deployment files.\n"
        "- Background in SRE methodologies and high-throughput Python API tuning.\n"
        "- Familiarity with NLP systems."
    ),
}

# Company logo fixes
COMPANY_LOGOS = {
    "Google": "https://logo.clearbit.com/google.com",
    "Stripe": "https://logo.clearbit.com/stripe.com",
    "Netflix": "https://logo.clearbit.com/netflix.com",
    "Vercel": "https://logo.clearbit.com/vercel.com",
    "Openai": "https://logo.clearbit.com/openai.com",
    "OpenAI": "https://logo.clearbit.com/openai.com",
}


async def fix_db():
    async with SessionLocal() as db:
        # Fix job descriptions
        result = await db.execute(select(Job))
        jobs = result.scalars().all()
        fixed_count = 0
        for job in jobs:
            fixed_desc = FIXED_DESCRIPTIONS.get(job.title)
            if fixed_desc:
                job.description = fixed_desc
                fixed_count += 1
        await db.commit()
        print(f"Fixed {fixed_count} job descriptions.")

        # Fix company logos
        result = await db.execute(select(Company))
        companies = result.scalars().all()
        logo_fixed = 0
        for company in companies:
            logo = COMPANY_LOGOS.get(company.name)
            if logo and company.logo_url != logo:
                company.logo_url = logo
                logo_fixed += 1
            elif not company.logo_url:
                slug = company.name.lower().replace(" ", "").replace(".", "")
                company.logo_url = f"https://logo.clearbit.com/{slug}.com"
                logo_fixed += 1
        await db.commit()
        print(f"Fixed {logo_fixed} company logos.")

        print("Done.")


if __name__ == "__main__":
    asyncio.run(fix_db())
