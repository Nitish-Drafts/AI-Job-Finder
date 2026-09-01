import logging
import re
import datetime
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("job_adapters")

class BaseJobAdapter:
    """Base interface for all job source adapters."""
    def __init__(self, name: str, active: bool = True, requires_auth: bool = False):
        self.name = name
        self.active = active
        self.requires_auth = requires_auth

    async def fetch_jobs(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """
        Fetches job listings from the source.
        Returns a list of normalized job dictionaries:
        {
            "title": str,
            "company_name": str,
            "company_logo_url": Optional[str],
            "company_website_url": Optional[str],
            "location": Optional[str],
            "remote_status": str, # "remote", "hybrid", "onsite"
            "experience_level": Optional[str],
            "salary_range": Optional[str], # original raw range
            "description": str, # raw cleaned text
            "apply_url": str,
            "posting_date": datetime.datetime,
            "source": str,
            "employment_type": str # "Full-time", "Internship", "Part-time", "Contract"
        }
        """
        raise NotImplementedError


class GreenhouseAdapter(BaseJobAdapter):
    """Fetches jobs from Greenhouse public board API."""
    def __init__(self, board_tokens: List[str] = None):
        super().__init__("Greenhouse", active=True)
        # Verified active Greenhouse board tokens
        self.board_tokens = board_tokens or ["vercel", "stripe", "figma", "notion", "airtable"]

    async def fetch_jobs(self, db: AsyncSession) -> List[Dict[str, Any]]:
        normalized_jobs = []
        async with httpx.AsyncClient(timeout=15.0) as client:
            for token in self.board_tokens:
                url = f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true"
                try:
                    response = await client.get(url)
                    if response.status_code == 200:
                        data = response.json()
                        jobs = data.get("jobs", [])
                        company_name = token.capitalize()

                        for item in jobs:
                            title = item.get("title", "")
                            apply_url = item.get("absolute_url", "")
                            desc_html = item.get("content", "")
                            soup = BeautifulSoup(desc_html, "html.parser")
                            description = soup.get_text(separator="\n").strip()
                            if not description:
                                description = "Description unavailable. View the original posting for complete details."
                            location = item.get("location", {}).get("name", "Remote")

                            normalized_jobs.append({
                                "title": title,
                                "company_name": company_name,
                                "company_logo_url": f"https://logo.clearbit.com/{token.lower()}.com",
                                "company_website_url": f"https://www.{token.lower()}.com",
                                "location": location,
                                "remote_status": "remote" if "remote" in location.lower() or "remote" in title.lower() else "onsite",
                                "experience_level": None,  # Will be parsed from text
                                "salary_range": None,      # Will be parsed from text
                                "description": description,
                                "apply_url": apply_url,
                                "posting_date": datetime.datetime.utcnow(),
                                "source": "Greenhouse",
                                "employment_type": "Full-time"
                            })
                except Exception as e:
                    logger.error(f"Greenhouse board {token} fetch error: {e}")
        return normalized_jobs


class LeverAdapter(BaseJobAdapter):
    """Fetches jobs from Lever public postings API."""
    def __init__(self, site_tokens: List[str] = None):
        super().__init__("Lever", active=True)
        # Verified companies that actually use Lever for job postings
        self.site_tokens = site_tokens or ["reddit", "duolingo", "plaid", "canva", "brex"]

    async def fetch_jobs(self, db: AsyncSession) -> List[Dict[str, Any]]:
        normalized_jobs = []
        async with httpx.AsyncClient(timeout=15.0) as client:
            for token in self.site_tokens:
                url = f"https://api.lever.co/v0/postings/{token}"
                try:
                    response = await client.get(url)
                    if response.status_code == 200:
                        jobs = response.json()
                        if not isinstance(jobs, list):
                            continue
                        company_name = token.capitalize()

                        for item in jobs:
                            title = item.get("text", "")
                            apply_url = item.get("hostedUrl", "")
                            # Combine plain description + structured lists
                            plain_desc = item.get("descriptionPlain", "")
                            lists_text = "\n".join(
                                f"{section.get('text', '')}" 
                                for section in item.get("lists", [])
                                if section.get("text")
                            )
                            description = "\n\n".join(filter(None, [plain_desc, lists_text])).strip()
                            if not description:
                                description = "Description unavailable. View the original posting for complete details."
                            location = item.get("categories", {}).get("location", "Remote") or "Remote"

                            normalized_jobs.append({
                                "title": title,
                                "company_name": company_name,
                                "company_logo_url": f"https://logo.clearbit.com/{token.lower()}.com",
                                "company_website_url": f"https://www.{token.lower()}.com",
                                "location": location,
                                "remote_status": "remote" if "remote" in location.lower() or "remote" in title.lower() else "onsite",
                                "experience_level": None,
                                "salary_range": None,
                                "description": description,
                                "apply_url": apply_url,
                                "posting_date": datetime.datetime.utcnow(),
                                "source": "Lever",
                                "employment_type": item.get("categories", {}).get("commitment", "Full-time") or "Full-time"
                            })
                except Exception as e:
                    logger.error(f"Lever site {token} fetch error: {e}")
        return normalized_jobs


class AshbyAdapter(BaseJobAdapter):
    """Fetches jobs from Ashby public board API (correct endpoint)."""
    def __init__(self, board_tokens: List[str] = None):
        super().__init__("Ashby", active=True)
        # Verified companies using Ashby job boards
        self.board_tokens = board_tokens or ["ramp", "linear", "retool", "clerk"]

    async def fetch_jobs(self, db: AsyncSession) -> List[Dict[str, Any]]:
        normalized_jobs = []
        async with httpx.AsyncClient(timeout=15.0) as client:
            for token in self.board_tokens:
                # Correct Ashby public board API endpoint
                url = f"https://api.ashbyhq.com/posting-api/job-board/{token}"
                try:
                    response = await client.get(url)
                    if response.status_code == 200:
                        data = response.json()
                        jobs = data.get("jobPostings", [])
                        company_name = token.capitalize()

                        for item in jobs:
                            title = item.get("title", "")
                            job_id = item.get("id", "")
                            apply_url = item.get("jobUrl", "") or f"https://jobs.ashbyhq.com/{token}/{job_id}"
                            description_html = item.get("descriptionHtml", "")
                            if description_html:
                                soup = BeautifulSoup(description_html, "html.parser")
                                description = soup.get_text(separator="\n").strip()
                            else:
                                description = "Description unavailable. View the original posting for complete details."
                            location_obj = item.get("location", "") or ""
                            location = location_obj if isinstance(location_obj, str) else "Remote"
                            employment_type = item.get("employmentType", "Full-time") or "Full-time"

                            normalized_jobs.append({
                                "title": title,
                                "company_name": company_name,
                                "company_logo_url": f"https://logo.clearbit.com/{token.lower()}.com",
                                "company_website_url": f"https://www.{token.lower()}.com",
                                "location": location or "Remote",
                                "remote_status": "remote" if "remote" in (location or "").lower() or "remote" in title.lower() else "onsite",
                                "experience_level": None,
                                "salary_range": None,
                                "description": description,
                                "apply_url": apply_url,
                                "posting_date": datetime.datetime.utcnow(),
                                "source": "Ashby",
                                "employment_type": employment_type
                            })
                except Exception as e:
                    logger.error(f"Ashby board {token} fetch error: {e}")
        return normalized_jobs


class YCJobsAdapter(BaseJobAdapter):
    """Fetches real startup jobs from the Y Combinator public jobs feed."""
    def __init__(self):
        super().__init__("YC Startup Jobs", active=True)
        self.feed_url = "https://www.ycombinator.com/jobs/feed"

    async def fetch_jobs(self, db: AsyncSession) -> List[Dict[str, Any]]:
        normalized_jobs = []
        try:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
                response = await client.get(self.feed_url)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.content, "xml")
                    items = soup.find_all("item")

                    for item in items:
                        title_text = item.find("title").get_text() if item.find("title") else ""
                        link = item.find("link").get_text() if item.find("link") else ""
                        desc_html = item.find("description").get_text() if item.find("description") else ""

                        desc_soup = BeautifulSoup(desc_html, "html.parser")
                        description = desc_soup.get_text(separator="\n").strip()
                        if not description:
                            description = "Description unavailable. View the original posting for complete details."

                        # Parse title format: "Senior Python Developer at Stripe (San Francisco, CA)"
                        match = re.match(r"^(.*?)\s+at\s+(.*?)(?:\s+\((.*?)\))?$", title_text)
                        if match:
                            title = match.group(1).strip()
                            company_name = match.group(2).strip()
                            location = match.group(3).strip() if match.group(3) else "Remote"
                        else:
                            title = title_text
                            company_name = "YC Startup"
                            location = "Remote"

                        if not location:
                            location = "Remote"

                        # Build logo URL from company domain
                        domain_slug = company_name.lower().replace(" ", "").replace(".", "")
                        normalized_jobs.append({
                            "title": title,
                            "company_name": company_name,
                            "company_logo_url": f"https://logo.clearbit.com/{domain_slug}.com",
                            "company_website_url": f"https://www.{domain_slug}.com",
                            "location": location,
                            "remote_status": "remote" if "remote" in location.lower() or "remote" in title.lower() else "onsite",
                            "experience_level": None,
                            "salary_range": None,
                            "description": description,
                            "apply_url": link,
                            "posting_date": datetime.datetime.utcnow(),
                            "source": "YC Startup Jobs",
                            "employment_type": "Full-time"
                        })
        except Exception as e:
            logger.error(f"YC Startup Jobs feed fetch error: {e}")
        return normalized_jobs


class RemoteOKAdapter(BaseJobAdapter):
    """
    Fetches remote tech jobs from RemoteOK public JSON API.
    No authentication required. Respectful rate-limiting with delay.
    Source: https://remoteok.com/api (documented public API)
    """
    def __init__(self):
        super().__init__("RemoteOK", active=True)
        self.api_url = "https://remoteok.com/api"

    async def fetch_jobs(self, db: AsyncSession) -> List[Dict[str, Any]]:
        normalized_jobs = []
        try:
            headers = {
                "User-Agent": "AIJobFinder/1.0 (job aggregator; contact: noreply@aijobfinder.com)"
            }
            async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
                response = await client.get(self.api_url)
                if response.status_code == 200:
                    data = response.json()
                    # First element is a legal notice object, skip it
                    jobs = [j for j in data if isinstance(j, dict) and j.get("id")]

                    for item in jobs[:40]:  # Limit to 40 to avoid flooding
                        title = item.get("position", "")
                        company_name = item.get("company", "Unknown Company")
                        apply_url = item.get("apply_url") or item.get("url", "")
                        if not apply_url or not title:
                            continue

                        # Description: combine description field
                        raw_desc = item.get("description", "")
                        if raw_desc:
                            desc_soup = BeautifulSoup(raw_desc, "html.parser")
                            description = desc_soup.get_text(separator="\n").strip()
                        else:
                            description = "Description unavailable. View the original posting for complete details."

                        # Location
                        location = item.get("location", "Remote") or "Remote"

                        # Salary
                        salary_min = item.get("salary_min")
                        salary_max = item.get("salary_max")
                        salary_range = None
                        if salary_min and salary_max:
                            salary_range = f"${int(salary_min):,} - ${int(salary_max):,}"
                        elif salary_min:
                            salary_range = f"${int(salary_min):,}+"

                        # Tags → skills
                        tags = item.get("tags", []) or []

                        # Company logo
                        company_logo = item.get("company_logo", "") or f"https://logo.clearbit.com/{company_name.lower().replace(' ', '')}.com"

                        # Date
                        epoch = item.get("epoch")
                        if epoch:
                            try:
                                posting_date = datetime.datetime.utcfromtimestamp(int(epoch))
                            except Exception:
                                posting_date = datetime.datetime.utcnow()
                        else:
                            posting_date = datetime.datetime.utcnow()

                        normalized_jobs.append({
                            "title": title,
                            "company_name": company_name,
                            "company_logo_url": company_logo,
                            "company_website_url": f"https://www.{company_name.lower().replace(' ', '')}.com",
                            "location": location,
                            "remote_status": "remote",  # RemoteOK is all-remote by definition
                            "experience_level": None,
                            "salary_range": salary_range,
                            "description": description,
                            "apply_url": apply_url,
                            "posting_date": posting_date,
                            "source": "RemoteOK",
                            "employment_type": "Full-time",
                            "_tags": tags  # Passed through for skill extraction
                        })
        except Exception as e:
            logger.error(f"RemoteOK fetch error: {e}")
        return normalized_jobs


class StubJobAdapter(BaseJobAdapter):
    """Stub adapter for sources that require setup/auth or are unavailable."""
    def __init__(self, name: str, reason: str = "API Key not configured"):
        super().__init__(name, active=False, requires_auth=True)
        self.reason = reason

    async def fetch_jobs(self, db: AsyncSession) -> List[Dict[str, Any]]:
        # Returns empty list as it is stubbed / disabled
        return []
