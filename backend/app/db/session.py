from sqlmodel import create_engine, Session, SQLModel
from app.core.config import settings


engine = create_engine(settings.database_url, echo=False, connect_args={"check_same_thread": False})


def get_session():
    with Session(engine) as session:
        yield session


def init_db():
    SQLModel.metadata.create_all(engine)


# Ensure tables exist even if startup events haven't run (helps tests/imports)
SQLModel.metadata.create_all(engine)
