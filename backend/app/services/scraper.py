import logging
import asyncio
import re
import datetime
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import Job, Company
from app.core.config import settings
from app.services.adapters import (
    GreenhouseAdapter,
    LeverAdapter,
    AshbyAdapter,
    YCJobsAdapter,
    RemoteOKAdapter,
    StubJobAdapter
)

logger = logging.getLogger("scraper_service")


class ScraperService:
    """
    Handles scraping jobs from major boards (Greenhouse, Lever, Ashby, YC Startup, Company Pages),
    normalizing job fields, and preventing duplicates in the database.
    """
    def __init__(self):
        # Configure active and stub adapters
        self.adapters = [
            GreenhouseAdapter(),
            LeverAdapter(),
            AshbyAdapter(),
            YCJobsAdapter(),
            RemoteOKAdapter(),
            # Stubbed/Unavailable adapters (require paid API or bypass login/CAPTCHA)
            StubJobAdapter("Indeed", reason="Requires paid API subscription"),
            StubJobAdapter("Naukri", reason="Login-walled, anti-bot protection"),
            StubJobAdapter("LinkedIn", reason="Login-walled, strict ToS"),
            StubJobAdapter("Internshala", reason="Login-walled"),
            StubJobAdapter("Wellfound", reason="Login-walled")
        ]

    def get_sources_status(self) -> List[Dict[str, Any]]:
        """Returns the status list of all crawlers for frontend display."""
        status_list = []
        for adapter in self.adapters:
            # Active adapters are working; stub/inactive ones are unavailable
            status_list.append({
                "name": adapter.name,
                "status": "working" if adapter.active else "unavailable",
                "reason": getattr(adapter, "reason", None) if not adapter.active else None
            })
        return status_list

    @staticmethod
    def normalize_remote_status(title: str, text: str) -> str:
        """Standardizes job remote status."""
        text_lower = (title + " " + text).lower()
        if "hybrid" in text_lower or "flexible hybrid" in text_lower:
            return "hybrid"
        elif "remote" in text_lower or "work from home" in text_lower or "telecommute" in text_lower:
            return "remote"
        return "onsite"

    @staticmethod
    def normalize_experience_level(title: str, description: str) -> str:
        """Standardizes job experience requirements."""
        text = (title + " " + description).lower()
        match = re.search(r"(\d+)\+?\s*years?\s*of\s*experience", text)
        if match:
            years = int(match.group(1))
            if years == 0:
                return "0 Years"
            elif years == 1:
                return "1 Year"
            elif years == 2:
                return "2 Years"
            else:
                return "3+ Years"
        
        if "junior" in text or "jr" in text or "entry level" in text or "graduate" in text:
            return "1 Year"
        elif "senior" in text or "sr" in text or "lead" in text or "architect" in text or "principal" in text:
            return "3+ Years"
        
        return "2 Years"

    @staticmethod
    def clean_html(html_content: str) -> str:
        """Strips HTML tags cleanly using BeautifulSoup and returns formatted text."""
        if not html_content:
            return ""
        soup = BeautifulSoup(html_content, "html.parser")
        for element in soup(["script", "style"]):
            element.decompose()
        text = soup.get_text(separator="\n")
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        return "\n".join(chunk for chunk in chunks if chunk)

    @staticmethod
    def clean_and_parse_salary(salary_range_str: Optional[str], description: str) -> Optional[Dict[str, Any]]:
        """Parses and normalizes salary range information from string/description text."""
        min_val = None
        max_val = None
        currency = None
        period = "year"
        display = "Salary not disclosed"

        search_text = salary_range_str or ""
        if not search_text:
            # Look for common monetary formats (INR Lakhs, USD k/k-range, GBP/EUR ranges)
            patterns = [
                r"([₹\$£€])\s*([0-9,]+[kK]?)\s*-\s*([₹\$£€])?\s*([0-9,]+[kK]?)\s*(LPA|Lakh|per\s+year|/yr|/year|/month|/hr|/hour)?",
                r"([0-9,]+[kK]?)\s*-\s*([0-9,]+[kK]?)\s*(LPA|Lakh|per\s+year|/yr|/year|/month|/hr|/hour)",
                r"([₹\$£€])\s*([0-9,]+[kK]?)\s*(LPA|Lakh|per\s+year|/yr|/year|/month|/hr|/hour)?"
            ]
            for pat in patterns:
                match = re.search(pat, description, re.IGNORECASE)
                if match:
                    search_text = match.group(0)
                    break
        
        if not search_text:
            return {
                "min": None,
                "max": None,
                "currency": None,
                "period": None,
                "display": "Salary not disclosed"
            }

        display = re.sub(r'\s+', ' ', search_text).strip()

        # Currency detection
        if "₹" in display or "inr" in display.lower() or "rs" in display.lower() or "rupees" in display.lower():
            currency = "₹"
        elif "$" in display or "usd" in display.lower():
            currency = "$"
        elif "£" in display or "gbp" in display.lower():
            currency = "£"
        elif "€" in display or "eur" in display.lower():
            currency = "€"

        # Period detection
        if "hour" in display.lower() or "/hr" in display.lower() or "hourly" in display.lower():
            period = "hour"
        elif "month" in display.lower() or "/mo" in display.lower() or "monthly" in display.lower():
            period = "month"
        else:
            period = "year"

        # Extract numerical boundaries
        numbers = []
        cleaned_text = display.lower()
        matches = re.findall(r"([0-9\.,]+)\s*(lpa|lakh|k|million|m)?", cleaned_text)
        for num_str, multiplier in matches:
            try:
                val = float(num_str.replace(",", ""))
                if multiplier == "lpa" or multiplier == "lakh":
                    val = val * 100000
                elif multiplier == "k":
                    val = val * 1000
                elif multiplier == "million" or multiplier == "m":
                    val = val * 1000000
                numbers.append(val)
            except ValueError:
                continue

        if len(numbers) >= 2:
            min_val = min(numbers[0], numbers[1])
            max_val = max(numbers[0], numbers[1])
        elif len(numbers) == 1:
            min_val = numbers[0]
            max_val = numbers[0]

        # Standard formatting rules
        if currency == "₹" and period == "year":
            if min_val and max_val and min_val != max_val:
                min_lpa = min_val / 100000
                max_lpa = max_val / 100000
                min_str = f"{min_lpa:.1f}".rstrip('0').rstrip('.')
                max_str = f"{max_lpa:.1f}".rstrip('0').rstrip('.')
                display = f"₹{min_str} LPA – ₹{max_str} LPA"
            elif min_val:
                lpa = min_val / 100000
                lpa_str = f"{lpa:.1f}".rstrip('0').rstrip('.')
                display = f"₹{lpa_str} LPA"
        elif currency == "$" and period == "year":
            if min_val and max_val and min_val != max_val:
                min_k = min_val / 1000
                max_k = max_val / 1000
                min_str = f"{min_k:.1f}".rstrip('0').rstrip('.')
                max_str = f"{max_k:.1f}".rstrip('0').rstrip('.')
                display = f"${min_str}k – ${max_str}k"
            elif min_val:
                k = min_val / 1000
                k_str = f"{k:.1f}".rstrip('0').rstrip('.')
                display = f"${k_str}k"

        return {
            "min": min_val,
            "max": max_val,
            "currency": currency,
            "period": period,
            "display": display
        }

    @staticmethod
    def clean_salary_range(text: str) -> Optional[str]:
        """Legacy helper. Passes to dynamic parser."""
        parsed = ScraperService.clean_and_parse_salary(None, text)
        return parsed.get("display") if parsed else None

    @staticmethod
    def normalize_string(s: str) -> str:
        """Helper to lowercase and strip punctuation for duplicate comparisons."""
        if not s:
            return ""
        return re.sub(r'[^a-z0-9\s]', '', s.lower()).strip()

    async def is_duplicate_job(self, db: AsyncSession, title: str, company_id: int, location: Optional[str]) -> bool:
        """Fuzzy duplicate check: matches company, title, and location within the last 30 days."""
        thirty_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=30)
        result = await db.execute(
            select(Job).where(
                Job.company_id == company_id,
                Job.posting_date >= thirty_days_ago
            )
        )
        existing_jobs = result.scalars().all()
        
        norm_title = self.normalize_string(title)
        norm_loc = self.normalize_string(location or "remote")
        
        for job in existing_jobs:
            if self.normalize_string(job.title) == norm_title:
                job_loc = self.normalize_string(job.location or "remote")
                if norm_loc == job_loc or not norm_loc or not job_loc:
                    return True
        return False

    async def get_or_create_company(self, db: AsyncSession, name: str, logo_url: Optional[str] = None) -> Company:
        """Ensures a company exists in the database and returns it."""
        result = await db.execute(select(Company).where(Company.name == name))
        company = result.scalar_one_or_none()
        
        # Build a Clearbit logo URL as the default (broken images fall back to initials in the frontend)
        default_logo = f"https://logo.clearbit.com/{name.lower().replace(' ', '').replace('.', '')}.com"
        resolved_logo = logo_url or default_logo

        if not company:
            company = Company(
                name=name,
                logo_url=resolved_logo,
                website_url=f"https://www.{name.lower().replace(' ', '')}.com"
            )
            db.add(company)
            await db.commit()
            await db.refresh(company)
        elif not company.logo_url:
            # Backfill logo for companies created without one
            company.logo_url = resolved_logo
            await db.commit()
            await db.refresh(company)
            
        return company

    async def sync_jobs(self, db: AsyncSession) -> Dict[str, Any]:
        """Runs all active adapters to scrape, normalize, and ingest jobs into database."""
        logger.info("Executing job synchronization cycle...")
        jobs_saved = 0
        errors = {}
        
        for adapter in self.adapters:
            if not adapter.active:
                continue
            try:
                fetched_jobs = await adapter.fetch_jobs(db)
                for job_data in fetched_jobs:
                    # Resolve company
                    company = await self.get_or_create_company(
                        db, 
                        job_data["company_name"], 
                        job_data["company_logo_url"]
                    )
                    
                    # Deduplication 1: Same title/company/location
                    if await self.is_duplicate_job(db, job_data["title"], company.id, job_data["location"]):
                        continue
                    
                    # Deduplication 2: Exact apply URL check
                    dupe_check = await db.execute(select(Job).where(Job.apply_url == job_data["apply_url"]))
                    if dupe_check.scalar_one_or_none() is not None:
                        continue
                        
                    cleaned_description = self.clean_html(job_data["description"])
                    if not cleaned_description:
                        cleaned_description = "Description unavailable. View the original posting for complete details."
                        
                    # Extract tags/skills from content + any pre-tagged skills from adapter
                    skills = []
                    desc_lower = cleaned_description.lower()
                    # Start with tags provided by the adapter (e.g. RemoteOK tags)
                    for tag in job_data.get("_tags", []):
                        if tag and isinstance(tag, str):
                            skills.append(tag)
                    from app.services.ai_service import TECH_KEYWORDS
                    for kw in TECH_KEYWORDS:
                        pattern = r"\b" + re.escape(kw) + r"\b" if len(kw) <= 4 else re.escape(kw)
                        if re.search(pattern, desc_lower):
                            skills.append(kw.capitalize() if kw not in ["aws", "gcp", "jwt", "sql", "api", "html", "css", "nlp", "llm", "s3", "ci/cd"] else kw.upper())
                    # Deduplicate while preserving order
                    seen = set()
                    unique_skills = []
                    for s in skills:
                        s_lower = s.lower()
                        if s_lower not in seen:
                            seen.add(s_lower)
                            unique_skills.append(s)
                    skills = unique_skills
                            
                    # Parse salaries dynamically
                    salary_info = self.clean_and_parse_salary(job_data.get("salary_range"), cleaned_description)
                    salary_range = salary_info.get("display") if salary_info else "Salary not disclosed"
                    
                    # Parse location features
                    remote_status = self.normalize_remote_status(job_data["title"], cleaned_description)
                    experience_level = self.normalize_experience_level(job_data["title"], cleaned_description)
                    
                    job = Job(
                        company_id=company.id,
                        title=job_data["title"],
                        location=job_data["location"] or "Remote",
                        salary_range=salary_range,
                        salary=salary_info,
                        experience_level=experience_level,
                        remote_status=remote_status,
                        description=cleaned_description,
                        apply_url=job_data["apply_url"],
                        posting_date=job_data["posting_date"],
                        source=job_data["source"],
                        skills=skills[:10],
                        employment_type=job_data.get("employment_type", "Full-time"),
                        is_active=True
                    )
                    db.add(job)
                    jobs_saved += 1
                await db.commit()
            except Exception as e:
                logger.error(f"Error running adapter {adapter.name}: {e}")
                errors[adapter.name] = str(e)
                await db.rollback()
                
        return {"saved": jobs_saved, "errors": errors}

    # ========================================================
    # LEGACY / COMPATIBILITY FALLBACKS
    # ========================================================

    async def scrape_greenhouse(self, db: AsyncSession, board_token: str) -> int:
        """Adapts Greenhouse scraper for legacy router triggers."""
        adapter = GreenhouseAdapter([board_token])
        jobs = await adapter.fetch_jobs(db)
        saved = 0
        for job_data in jobs:
            company = await self.get_or_create_company(db, job_data["company_name"], job_data["company_logo_url"])
            if await self.is_duplicate_job(db, job_data["title"], company.id, job_data["location"]):
                continue
            dupe_check = await db.execute(select(Job).where(Job.apply_url == job_data["apply_url"]))
            if dupe_check.scalar_one_or_none() is not None:
                continue
                
            cleaned_desc = self.clean_html(job_data["description"])
            salary_info = self.clean_and_parse_salary(None, cleaned_desc)
            
            job = Job(
                company_id=company.id,
                title=job_data["title"],
                location=job_data["location"],
                salary_range=salary_info.get("display") if salary_info else "Salary not disclosed",
                salary=salary_info,
                experience_level=self.normalize_experience_level(job_data["title"], cleaned_desc),
                remote_status=self.normalize_remote_status(job_data["title"], cleaned_desc),
                description=cleaned_desc,
                apply_url=job_data["apply_url"],
                posting_date=datetime.datetime.utcnow(),
                source="Greenhouse",
                employment_type="Full-time"
            )
            db.add(job)
            saved += 1
        await db.commit()
        return saved

    async def scrape_lever(self, db: AsyncSession, site_token: str) -> int:
        """Adapts Lever scraper for legacy triggers."""
        adapter = LeverAdapter([site_token])
        jobs = await adapter.fetch_jobs(db)
        saved = 0
        for job_data in jobs:
            company = await self.get_or_create_company(db, job_data["company_name"], job_data["company_logo_url"])
            if await self.is_duplicate_job(db, job_data["title"], company.id, job_data["location"]):
                continue
            dupe_check = await db.execute(select(Job).where(Job.apply_url == job_data["apply_url"]))
            if dupe_check.scalar_one_or_none() is not None:
                continue
            cleaned_desc = self.clean_html(job_data["description"])
            salary_info = self.clean_and_parse_salary(None, cleaned_desc)
            job = Job(
                company_id=company.id,
                title=job_data["title"],
                location=job_data["location"],
                salary_range=salary_info.get("display") if salary_info else "Salary not disclosed",
                salary=salary_info,
                experience_level=self.normalize_experience_level(job_data["title"], cleaned_desc),
                remote_status=self.normalize_remote_status(job_data["title"], cleaned_desc),
                description=cleaned_desc,
                apply_url=job_data["apply_url"],
                posting_date=datetime.datetime.utcnow(),
                source="Lever",
                employment_type="Full-time"
            )
            db.add(job)
            saved += 1
        await db.commit()
        return saved

    async def scrape_ashby(self, db: AsyncSession, board_token: str) -> int:
        """Adapts Ashby scraper for legacy triggers."""
        adapter = AshbyAdapter([board_token])
        jobs = await adapter.fetch_jobs(db)
        saved = 0
        for job_data in jobs:
            company = await self.get_or_create_company(db, job_data["company_name"], job_data["company_logo_url"])
            if await self.is_duplicate_job(db, job_data["title"], company.id, job_data["location"]):
                continue
            dupe_check = await db.execute(select(Job).where(Job.apply_url == job_data["apply_url"]))
            if dupe_check.scalar_one_or_none() is not None:
                continue
            cleaned_desc = self.clean_html(job_data["description"])
            salary_info = self.clean_and_parse_salary(None, cleaned_desc)
            job = Job(
                company_id=company.id,
                title=job_data["title"],
                location=job_data["location"],
                salary_range=salary_info.get("display") if salary_info else "Salary not disclosed",
                salary=salary_info,
                experience_level=self.normalize_experience_level(job_data["title"], cleaned_desc),
                remote_status=self.normalize_remote_status(job_data["title"], cleaned_desc),
                description=cleaned_desc,
                apply_url=job_data["apply_url"],
                posting_date=datetime.datetime.utcnow(),
                source="Ashby",
                employment_type="Full-time"
            )
            db.add(job)
            saved += 1
        await db.commit()
        return saved

    async def scrape_custom_page(self, db: AsyncSession, url: str, company_name: str) -> int:
        """BS4 web scraper. Removed hardcoded defaults."""
        jobs_saved = 0
        try:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, "html.parser")
                    company = await self.get_or_create_company(db, company_name)
                    
                    links = soup.find_all("a", href=True)
                    for link in links:
                        href = link["href"]
                        text = link.get_text().strip()
                        
                        if any(keyword in text.lower() for keyword in ["engineer", "developer", "programmer", "architect"]) and \
                           any(path in href.lower() for path in ["/job/", "/posting/", "/careers/", "/vacancy/"]):
                            
                            if not href.startswith("http"):
                                from urllib.parse import urljoin
                                href = urljoin(url, href)
                                
                            if await self.is_duplicate_job(db, text, company.id, "Onsite"):
                                continue
                            dupe_check = await db.execute(select(Job).where(Job.apply_url == href))
                            if dupe_check.scalar_one_or_none() is not None:
                                continue
                                
                            job = Job(
                                company_id=company.id,
                                title=text,
                                location="Onsite",
                                salary_range="Salary not disclosed",
                                salary={"min": None, "max": None, "currency": None, "period": None, "display": "Salary not disclosed"},
                                experience_level=None,
                                remote_status="onsite",
                                description="Description unavailable. View the original posting for complete details.",
                                apply_url=href,
                                posting_date=datetime.datetime.utcnow(),
                                source="Company Website",
                                employment_type="Full-time"
                            )
                            db.add(job)
                            jobs_saved += 1
                            
                    await db.commit()
        except Exception as e:
            logger.error(f"Error scraping custom career page {url}: {e}")
            
        return jobs_saved

    async def seed_mock_postings(self, db: AsyncSession) -> int:
        """Generates clean mock postings with normalized values."""
        mock_jobs = [
            {
                "company": "Google",
                "title": "Senior AI & Machine Learning Engineer",
                "location": "Mountain View, CA",
                "remote_status": "hybrid",
                "experience_level": "3+ Years",
                "salary_range": "$180,000 - $240,000",
                "apply_url": "https://careers.google.com/jobs/results/mock-1",
                "description": "Google is seeking a Senior AI and Machine Learning Engineer to work on next-generation search systems.\n\nKey Technologies: Python, TensorFlow, PyTorch, Kubernetes, Docker, Transformer models, LLMs.\n\nRequirements:\n- 3+ years of experience deploying machine learning systems in production.\n- Strong experience in cloud infrastructure (GCP/AWS), Kubernetes containers, and Docker.\n- Knowledge of Vector Databases and NLP models.\n- Core software development background using clean Python and C++."
            },
            {
                "company": "Stripe",
                "title": "Full Stack Engineer (React/Python)",
                "location": "San Francisco, CA",
                "remote_status": "remote",
                "experience_level": "2 Years",
                "salary_range": "$140,000 - $190,000",
                "apply_url": "https://careers.stripe.com/jobs/results/mock-2",
                "description": "Stripe is building payment infrastructures for the internet. We are looking for a Full Stack Engineer to support merchant billing engines.\n\nKey Technologies: React, TypeScript, Python, FastAPI, PostgreSQL, AWS S3.\n\nRequirements:\n- 2+ years of experience with backend Python (FastAPI/Flask) and relational database design.\n- Proficient with React.js, TypeScript, and modern state-management patterns.\n- Solid experience with unit testing and CI/CD pipelines using GitHub Actions."
            },
            {
                "company": "Netflix",
                "title": "DevOps & Infrastructure Architect",
                "location": "Los Gatos, CA",
                "remote_status": "onsite",
                "experience_level": "3+ Years",
                "salary_range": "$220,000 - $290,000",
                "apply_url": "https://careers.netflix.com/jobs/results/mock-3",
                "description": "Netflix is searching for an Infrastructure/DevOps Architect to build scalable encoding tools.\n\nKey Technologies: Docker, Kubernetes, AWS S3, Terraform, Python, Shell Scripting, CI/CD.\n\nRequirements:\n- 4+ years of cloud infrastructure management (AWS).\n- Advanced container orchestration using Kubernetes and Docker configurations.\n- Background in Python scripting for automation."
            },
            {
                "company": "Vercel",
                "title": "Junior Frontend Engineer",
                "location": "New York, NY",
                "remote_status": "remote",
                "experience_level": "1 Year",
                "salary_range": "$90,000 - $120,000",
                "apply_url": "https://careers.vercel.com/jobs/results/mock-4",
                "description": "Join Vercel to optimize web deployments. We need a Junior Frontend Developer to join our dashboard team.\n\nKey Technologies: Next.js, React, TailwindCSS, TypeScript, Vitest, CI/CD.\n\nRequirements:\n- 1+ years of web development experience building dashboards.\n- Deep knowledge of React, Next.js, and CSS styling frameworks like Tailwind.\n- Experience writing client-side unit tests in Vitest or Jest."
            },
            {
                "company": "OpenAI",
                "title": "Large Language Model SRE",
                "location": "San Francisco, CA",
                "remote_status": "hybrid",
                "experience_level": "3+ Years",
                "salary_range": "$250,000 - $350,000",
                "apply_url": "https://careers.openai.com/jobs/results/mock-5",
                "description": "Maintain and scale core inference endpoints at OpenAI.\n\nKey Technologies: Kubernetes, Docker, Triton, PyTorch, Pytest, Python, AWS.\n\nRequirements:\n- Extensive knowledge in Kubernetes infrastructure and deployment files.\n- Background in SRE methodologies and high-throughput Python API tuning.\n- Familiarity with NLP systems."
            }
        ]

        jobs_saved = 0
        for item in mock_jobs:
            if await self.is_duplicate_job(db, item["title"], (await self.get_or_create_company(db, item["company"])).id, item["location"]):
                continue
            dupe_check = await db.execute(select(Job).where(Job.apply_url == item["apply_url"]))
            if dupe_check.scalar_one_or_none() is not None:
                continue
                
            company = await self.get_or_create_company(db, item["company"])
            salary_info = self.clean_and_parse_salary(item["salary_range"], item["description"])
            
            job = Job(
                company_id=company.id,
                title=item["title"],
                location=item["location"],
                salary_range=salary_info.get("display") if salary_info else "Salary not disclosed",
                salary=salary_info,
                experience_level=item["experience_level"],
                remote_status=item["remote_status"],
                description=item["description"].strip(),
                apply_url=item["apply_url"],
                posting_date=datetime.datetime.utcnow() - datetime.timedelta(days=jobs_saved),
                source="Company Website",
                skills=["Python", "Machine learning"] if "AI" in item["title"] else ["React", "Fastapi"],
                employment_type="Full-time"
            )
            db.add(job)
            jobs_saved += 1
            
        await db.commit()
        return jobs_saved


scraper_service = ScraperService()
