from sqlmodel import create_engine, Session, SQLModel
from sqlalchemy import text
from app.core.config import settings
from app.logger import get_logger
from typing import Generator

logger = get_logger(__name__)

# Create engine with appropriate settings for environment
engine = create_engine(
    settings.database_url,
    echo=settings.is_development(),  # Log SQL in development
    connect_args={
        "check_same_thread": False  # Allow SQLite access from multiple threads
    } if "sqlite" in settings.database_url else {},
    pool_pre_ping=True,  # Verify connections before using them
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_timeout=settings.db_pool_timeout,
    pool_recycle=settings.db_pool_recycle,
)


def get_session() -> Generator[Session, None, None]:
    """Dependency injection for database session.
    
    Usage in FastAPI routes:
        @app.get("/endpoint")
        def my_endpoint(session: Session = Depends(get_session)):
            ...
    """
    with Session(engine) as session:
        try:
            yield session
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {str(e)}")
            raise
        finally:
            session.close()


def init_db() -> None:
    """Initialize database tables.
    
    In migration-managed environments, this validates connectivity.
    In local/dev/test mode, it can still auto-create tables for convenience.
    """
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        if settings.db_auto_create_tables:
            logger.info("Auto-creating database tables (DB_AUTO_CREATE_TABLES=true)...")
            SQLModel.metadata.create_all(engine)
            logger.info("Database tables initialized")
        else:
            logger.info("Database connectivity verified (DB_AUTO_CREATE_TABLES=false)")
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}", exc_info=True)
        raise
