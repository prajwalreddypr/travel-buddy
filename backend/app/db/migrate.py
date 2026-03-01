"""Database migration bootstrap for Alembic-managed schema."""

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from app.core.config import settings
from app.logger import get_logger

logger = get_logger(__name__)


def run_migrations() -> None:
    """Apply or bootstrap Alembic migrations for current database."""
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", settings.database_url)

    engine = create_engine(settings.database_url)
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    app_tables = {"user", "savedtrip", "citystats"}
    has_alembic_version = "alembic_version" in existing_tables
    has_existing_app_schema = bool(existing_tables.intersection(app_tables))

    if has_existing_app_schema and not has_alembic_version:
        logger.info("Existing schema detected without Alembic version table; stamping head.")
        command.stamp(alembic_cfg, "head")
        return

    logger.info("Running Alembic upgrade to head.")
    command.upgrade(alembic_cfg, "head")


if __name__ == "__main__":
    run_migrations()
