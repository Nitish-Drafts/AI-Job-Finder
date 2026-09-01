import os
import re
import json
import logging
from typing import Dict, List, Any, Optional
import httpx
import numpy as np
from pypdf import PdfReader
from docx import Document
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.models import Resume, Job, ResumeEmbedding, JobEmbedding

logger = logging.getLogger("ai_service")

# A dictionary of 384 common software engineering keywords for local TF-IDF vectorization fallback
TECH_KEYWORDS = [
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "golang", "rust", "ruby", "php", "swift", "kotlin", "scala",
    "html", "css", "sql", "nosql", "react", "angular", "vue", "next.js", "svelte", "django", "fastapi", "flask", "spring", "express",
    "docker", "kubernetes", "aws", "gcp", "azure", "terraform", "ansible", "jenkins", "git", "ci/cd", "github actions", "gitlab",
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "cassandra", "dynamodb", "sqlite", "oracle", "mariadb",
    "machine learning", "deep learning", "ai", "artificial intelligence", "nlp", "computer vision", "tensorflow", "pytorch",
    "scikit-learn", "numpy", "pandas", "spark", "hadoop", "graphql", "rest", "restful", "grpc", "microservices", "serverless",
    "linux", "bash", "shell", "nginx", "apache", "prometheus", "grafana", "elk", "datadog", "sentry", "jira", "confluence",
    "agile", "scrum", "kanban", "test driven development", "tdd", "bdd", "unit testing", "pytest", "jest", "vitest", "mocha",
    "cypress", "selenium", "playwright", "beautifulsoup", "scrapy", "pandas", "matplotlib", "seaborn", "tableau", "powerbi",
    "snowflake", "databricks", "redshift", "bigquery", "kafka", "rabbitmq", "celery", "airflow", "dbt", "graphql", "apollo",
    "redux", "tailwind", "bootstrap", "sass", "webpack", "vite", "npm", "yarn", "pnpm", "pip", "poetry", "maven", "gradle",
    "security", "cryptography", "oauth", "jwt", "saml", "okta", "auth0", "firebase", "supabase", "prisma", "sequelize",
    "rest api", "graphql api", "web sockets", "http", "https", "dns", "tcp/ip", "ssh", "ssl", "tls", "cloudflare", "fastly",
    "system design", "data structures", "algorithms", "object oriented programming", "oop", "functional programming",
    "haskell", "clojure", "erlang", "elixir", "dart", "flutter", "react native", "electron", "unity", "unreal", "webassembly",
    "devops", "sre", "sysadmin", "cloud native", "istio", "helm", "argocd", "flux", "circleci", "travisci", "aws lambda",
    "google cloud functions", "azure functions", "ecs", "eks", "gke", "fargate", "rds", "s3", "iam", "vpc", "route53", "cloudfront",
    "lambda", "sqs", "sns", "kinesis", "glue", "emr", "athena", "sagemaker", "mlops", "langchain", "llama", "huggingface",
    "openai", "anthropic", "cohere", "vector database", "pinecone", "milvus", "weaviate", "qdrant", "chromadb", "faiss",
    "semantic search", "rag", "retrieval augmented generation", "prompt engineering", "agentic", "autogen", "crewai",
    "clean code", "refactoring", "design patterns", "solid principles", "dry", "kiss", "yagni", "micro frontends",
    "monorepo", "turborepo", "lerna", "nx", "yarn workspaces", "pnpm workspaces", "npm workspaces", "git flow",
    "trunk based development", "code review", "debugging", "profiling", "performance tuning", "caching", "cdn",
    "horizontal scaling", "vertical scaling", "load balancing", "failover", "disaster recovery", "backup", "restore",
    "monitoring", "alerting", "logging", "tracing", "distributed tracing", "opentelemetry", "jaeger", "zipkin",
    "apigateway", "service mesh", "consul", "linkerd", "event driven architecture", "pub/sub", "cqrs", "event sourcing",
    "domain driven design", "ddd", "clean architecture", "onion architecture", "hexagonal architecture", "mvc", "mvvm",
    "single page application", "spa", "server side rendering", "ssr", "static site generation", "ssg", "incremental static regeneration",
    "isr", "progressive web app", "pwa", "responsive design", "mobile first", "accessibility", "a11y", "seo", "web vitals",
    "performance optimization", "lazy loading", "code splitting", "tree shaking", "minification", "compression", "gzip", "brotli"
]


class AIService:
    """
    Core AI components for parsing files, invoking LLMs, and performing vector-matching computations.
    """

    def extract_text_from_file(self, file_path: str) -> str:
        """
        Extracts raw text content from PDF, DOCX, or TXT documents.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found at: {file_path}")
            
        ext = file_path.split(".")[-1].lower()
        
        if ext == "pdf":
            try:
                reader = PdfReader(file_path)
                text = ""
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                return text
            except Exception as e:
                logger.error(f"Error reading PDF: {e}")
                raise ValueError("Failed to parse text from PDF.")
                
        elif ext == "docx":
            try:
                doc = Document(file_path)
                text = "\n".join([para.text for para in doc.paragraphs])
                return text
            except Exception as e:
                logger.error(f"Error reading DOCX: {e}")
                raise ValueError("Failed to parse text from DOCX.")
                
        else:  # Text or generic files
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    return f.read()
            except Exception as e:
                logger.error(f"Error reading text file: {e}")
                raise ValueError("Failed to read text file.")

    async def parse_resume(self, text: str) -> Dict[str, Any]:
        """
        Converts raw resume text into structured details (Skills, Projects, Experience, Education).
        Uses OpenAI if configured; falls back to an advanced regex keyword parser if not.
        """
        if settings.OPENAI_API_KEY:
            try:
                prompt = f"""
                Analyze the following resume text and parse it into a structured JSON format.
                Return ONLY a JSON object matching this structure:
                {{
                    "skills": ["Skill1", "Skill2"],
                    "experience": [
                        {{
                            "title": "Job Title",
                            "company": "Company Name",
                            "dates": "Start - End Date",
                            "description": "Short summary of achievements"
                        }}
                    ],
                    "education": [
                        {{
                            "degree": "Degree (e.g. BS in CS)",
                            "school": "University Name",
                            "dates": "Graduation date/range"
                        }}
                    ],
                    "projects": [
                        {{
                            "title": "Project Title",
                            "description": "Short description of project",
                            "skills": ["SkillUsed1", "SkillUsed2"]
                        }}
                    ],
                    "certificates": ["CertificateName1", "CertificateName2"]
                }}
                
                Resume Text:
                {text}
                """
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                        json={
                            "model": "gpt-4o-mini",
                            "messages": [{"role": "user", "content": prompt}],
                            "response_format": {"type": "json_object"},
                            "temperature": 0.2
                        }
                    )
                    if response.status_code == 200:
                        return json.loads(response.json()["choices"][0]["message"]["content"])
            except Exception as e:
                logger.error(f"OpenAI resume parsing failed: {e}. Falling back to regex parser.")

        # Local Regex Fallback Parser
        # Detect skills from predefined TECH_KEYWORDS
        found_skills = []
        text_lower = text.lower()
        for kw in TECH_KEYWORDS:
            # Use word boundaries for small keywords (e.g., 'go', 's3') to prevent false positives
            pattern = r"\b" + re.escape(kw) + r"\b" if len(kw) <= 4 else re.escape(kw)
            if re.search(pattern, text_lower):
                found_skills.append(kw.capitalize() if kw not in ["aws", "gcp", "jwt", "sql", "api", "html", "css", "nlp", "llm", "s3", "ci/cd", "sre", "schedules"] else kw.upper())
                
        # Split headings to fetch structure roughly
        sections = re.split(r"\n(?=experience|work|education|projects|skills|certificates|summary|certifications)", text_lower)
        
        education_list = []
        experience_list = []
        project_list = []
        certificates_list = []
        
        # Super simple rule extraction
        for sec in sections:
            lines = [line.strip() for line in sec.split("\n") if line.strip()]
            if not lines:
                continue
            header = lines[0]
            
            if "education" in header:
                for line in lines[1:4]:  # Grab first 3 lines
                    education_list.append({"degree": line, "school": "Unknown School", "dates": ""})
            elif "experience" in header or "work" in header:
                for line in lines[1:5]:
                    experience_list.append({"title": line, "company": "Company", "dates": "", "description": line})
            elif "projects" in header:
                for line in lines[1:4]:
                    project_list.append({"title": line, "description": line, "skills": []})
            elif "certificates" in header or "certifications" in header:
                for line in lines[1:5]:
                    certificates_list.append(line)
                    
        return {
            "skills": found_skills or ["Software Engineering"],
            "experience": experience_list or [{"title": "Software Developer", "company": "Self-Employed", "dates": "2023-Present", "description": "Independent development."}],
            "education": education_list or [{"degree": "B.S. Computer Science", "school": "University", "dates": ""}],
            "projects": project_list or [{"title": "Personal Portfolio", "description": "Developed React application.", "skills": []}],
            "certificates": certificates_list
        }

    async def get_embedding(self, text: str) -> List[float]:
        """
        Generates text embedding vector.
        Uses OpenAI (1536 dims) if API key exists.
        Falls back to local keyword frequency vector (384 dims) if not.
        """
        if settings.OPENAI_API_KEY:
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    response = await client.post(
                        "https://api.openai.com/v1/embeddings",
                        headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                        json={
                            "model": "text-embedding-3-small",
                            "input": text[:8000]  # Truncate to stay safely within context limit
                        }
                    )
                    if response.status_code == 200:
                        return response.json()["data"][0]["embedding"]
            except Exception as e:
                logger.error(f"OpenAI embedding generation failed: {e}. Falling back to keyword vector.")

        # Fallback Local Embedding (Keyword Frequency Vector)
        # Create a 384 dimensional frequency vector based on TECH_KEYWORDS
        text_lower = text.lower()
        vector = []
        for kw in TECH_KEYWORDS[:384]:
            pattern = r"\b" + re.escape(kw) + r"\b" if len(kw) <= 4 else re.escape(kw)
            matches = len(re.findall(pattern, text_lower))
            vector.append(float(matches))
            
        # Normalize the vector to have length 1
        arr = np.array(vector)
        norm = np.linalg.norm(arr)
        if norm > 0:
            arr = arr / norm
        return arr.tolist()

    @staticmethod
    def calculate_cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """
        Computes cosine similarity between two float lists using NumPy.
        """
        if len(vec_a) != len(vec_b):
            # If dimensions mismatch (e.g. OpenAI vs Local), return basic overlap
            return 0.0
            
        a = np.array(vec_a)
        b = np.array(vec_b)
        dot_product = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
            
        return float(dot_product / (norm_a * norm_b))

    async def generate_resume_embedding(self, db: AsyncSession, resume_id: int) -> None:
        """Helper to create and save a resume embedding."""
        result = await db.execute(select(Resume).where(Resume.id == resume_id))
        resume = result.scalar_one_or_none()
        if not resume:
            return
            
        # Build embedding content representation
        contents = f"{' '.join(resume.skills or [])} {resume.raw_text or ''}"
        vector = await self.get_embedding(contents)
        
        # Check duplicate
        existing = await db.execute(select(ResumeEmbedding).where(ResumeEmbedding.resume_id == resume_id))
        emb_record = existing.scalar_one_or_none()
        
        if emb_record:
            emb_record.embedding = vector
            db.add(emb_record)
        else:
            emb_record = ResumeEmbedding(resume_id=resume_id, embedding=vector)
            db.add(emb_record)
            
        await db.commit()

    async def generate_job_embedding(self, db: AsyncSession, job_id: int) -> None:
        """Helper to create and save a job embedding."""
        result = await db.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            return
            
        contents = f"{job.title} {job.location or ''} {job.description}"
        vector = await self.get_embedding(contents)
        
        existing = await db.execute(select(JobEmbedding).where(JobEmbedding.job_id == job_id))
        emb_record = existing.scalar_one_or_none()
        
        if emb_record:
            emb_record.embedding = vector
            db.add(emb_record)
        else:
            emb_record = JobEmbedding(job_id=job_id, embedding=vector)
            db.add(emb_record)
            
        await db.commit()

    async def generate_all_missing_job_embeddings(self, db: AsyncSession) -> None:
        """Computes embeddings for any jobs that lack them."""
        # Query jobs without embeddings
        query = select(Job).outerjoin(JobEmbedding).where(JobEmbedding.job_id == None)
        result = await db.execute(query)
        jobs = result.scalars().all()
        
        for job in jobs:
            try:
                await self.generate_job_embedding(db, job.id)
            except Exception as e:
                logger.error(f"Failed generating embedding for job {job.id}: {e}")

    async def match_resume_to_jobs(
        self, db: AsyncSession, resume_id: int, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Retrieves matching jobs compared to a specific resume using cosine similarity.
        """
        # Fetch resume embedding
        r_emb_res = await db.execute(select(ResumeEmbedding).where(ResumeEmbedding.resume_id == resume_id))
        resume_emb = r_emb_res.scalar_one_or_none()
        if not resume_emb:
            return []
            
        # Get all jobs with embeddings
        j_emb_res = await db.execute(select(JobEmbedding))
        job_embs = j_emb_res.scalars().all()
        
        matches = []
        for j_emb in job_embs:
            score = self.calculate_cosine_similarity(resume_emb.embedding, j_emb.embedding)
            # Map score to percentage 0-100
            match_percentage = int(max(0.0, min(1.0, score)) * 100)
            
            # Fetch job info
            job_res = await db.execute(select(Job).where(Job.id == j_emb.job_id))
            job = job_res.scalar_one_or_none()
            if not job:
                continue
                
            # Perform exact/partial missing skills analysis
            missing_skills = await self.extract_missing_skills(db, resume_id, job.id)
            
            # Form explanation details
            explanation = f"Matches {match_percentage}% of job keywords."
            if match_percentage >= 80:
                explanation = "Excellent alignment! Your profile strongly mirrors the experience and skills required for this position."
            elif match_percentage >= 60:
                explanation = "Good fit. You possess a majority of the primary qualifications. Adding the missing skills will make you a highly competitive applicant."
            else:
                explanation = "Low match score. Your experience doesn't directly target the stack listed. Review the missing skills list to align your profile."

            # Company details
            from app.models.models import Company
            comp_res = await db.execute(select(Company).where(Company.id == job.company_id))
            company = comp_res.scalar_one_or_none()
            company_name = company.name if company else "Company"

            matches.append({
                "job_id": job.id,
                "job_title": job.title,
                "company_name": company_name,
                "match_score": match_percentage,
                "missing_skills": missing_skills,
                "suggested_improvements": [
                    f"Integrate keywords like {', '.join(missing_skills[:3])} into your projects." if missing_skills else "Highlight your systems optimization accomplishments.",
                    "Include a dedicated technology grid in your resume overview.",
                    "Highlight metrics-driven achievements (e.g. 'improved performance by 15%') in similar roles."
                ],
                "explanation": explanation
            })
            
        # Sort matches by highest score
        matches.sort(key=lambda x: x["match_score"], reverse=True)
        return matches[:limit]

    async def extract_missing_skills(self, db: AsyncSession, resume_id: int, job_id: int) -> List[str]:
        """
        Compares skills declared in the resume against keywords in the job description to find gaps.
        """
        # Fetch resume
        res = await db.execute(select(Resume).where(Resume.id == resume_id))
        resume = res.scalar_one_or_none()
        if not resume:
            return []
            
        # Fetch job
        job_res = await db.execute(select(Job).where(Job.id == job_id))
        job = job_res.scalar_one_or_none()
        if not job:
            return []
            
        resume_skills_lower = [str(s).lower() for s in (resume.skills or [])]
        job_desc_lower = job.description.lower()
        
        missing = []
        for kw in TECH_KEYWORDS:
            pattern = r"\b" + re.escape(kw) + r"\b" if len(kw) <= 4 else re.escape(kw)
            if re.search(pattern, job_desc_lower) and kw.lower() not in resume_skills_lower:
                missing.append(kw.capitalize() if kw not in ["aws", "gcp", "jwt", "sql", "api", "html", "css", "nlp", "llm", "s3", "ci/cd"] else kw.upper())
                
        return missing[:10]  # Cap at 10 skills


ai_service = AIService()
