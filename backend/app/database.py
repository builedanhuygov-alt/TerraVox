import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings

settings = get_settings()

db_url = settings.database_url
if os.getenv("VERCEL") and (db_url == "sqlite:///./ecogl.db" or db_url.startswith("sqlite:///./")):
    db_url = "sqlite:////tmp/ecogl.db"

# sqlite needs check_same_thread=False for FastAPI; :memory: needs StaticPool to share across connections (tests)
connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
_pool_kwargs = {}
if db_url == "sqlite:///:memory:" or db_url.startswith("sqlite:///:memory:"):
    from sqlalchemy.pool import StaticPool

    _pool_kwargs = {"poolclass": StaticPool}

engine = create_engine(db_url, connect_args=connect_args, echo=False, future=True, **_pool_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables — import models first."""
    import app.models  # noqa: F401 ensure models registered
    Base.metadata.create_all(bind=engine)
