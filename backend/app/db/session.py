from sqlmodel import create_engine, Session, SQLModel
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
    pool_size=5,
    max_overflow=10,
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
    
    Call this once at application startup to create all tables.
    """
    try:
        logger.info("Initializing database tables...")
        SQLModel.metadata.create_all(engine)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}", exc_info=True)
        raise


# Ensure tables exist when module is loaded (helps tests/imports)
try:
    init_db()
except Exception as e:
    logger.warning(f"Could not initialize DB on module load: {e}")
