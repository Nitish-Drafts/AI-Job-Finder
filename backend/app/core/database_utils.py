import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool, NullPool
from alembic.config import Config
from alembic import command
from sqlalchemy import create_engine, pool
from app.core.config import settings
from app.database import Base

logger = logging.getLogger("database_utils")
logging.basicConfig(level=logging.INFO)


def run_migrations():
    """
    Programmatically runs database migrations using Alembic upgrade 'head'.
    If it fails (e.g. missing alembic.ini or configuration mismatch),
    falls back to generating the tables directly via SQLAlchemy metadata.
    """
    sync_engine = None
    try:
        logger.info("Attempting to run Alembic database migrations programmatically...")
        
        # Locate alembic.ini relative to cwd or standard paths
        ini_path = "alembic.ini"
        if not os.path.exists(ini_path):
            possible_paths = [
                "backend/alembic.ini",
                "../alembic.ini",
                "/app/backend/alembic.ini",
                "/app/alembic.ini"
            ]
            for path in possible_paths:
                if os.path.exists(path):
                    ini_path = path
                    break
        
        if os.path.exists(ini_path):
            # Create a dedicated engine for migrations with NullPool to prevent connection pooling
            sync_engine = create_engine(
                settings.DATABASE_SYNC_URL,
                echo=False,
                poolclass=pool.NullPool
            )
            alembic_cfg = Config(ini_path)
            # Override sqlalchemy.url dynamically using settings sync URL
            alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_SYNC_URL)
            command.upgrade(alembic_cfg, "head")
            logger.info("Alembic database migrations completed successfully.")
        else:
            raise FileNotFoundError("Could not locate alembic.ini file in any standard workspace folder.")
            
    except Exception as e:
        logger.warning(f"Alembic auto-migration failed: {e}. Falling back to direct metadata table generation.")
        try:
            # Create a synchronous connection engine to initialize tables directly
            sync_engine = create_engine(
                settings.DATABASE_SYNC_URL,
                pool_pre_ping=True,
                poolclass=pool.NullPool
            )
            Base.metadata.create_all(bind=sync_engine)
            logger.info("Direct database schema initialization via SQLAlchemy metadata completed successfully.")
        except Exception as ddl_err:
            logger.critical(f"Critical error: All database initialization paths failed. Detail: {ddl_err}")
    finally:
        # Always dispose of the engine to release all connections
        if sync_engine is not None:
            sync_engine.dispose()
            logger.info("Migration engine connections disposed.")
