"""Alembic env — autogenerate from app.models metadata.

Offline + online modes. DB URL from DATABASE_URL env (same as app).
Usage from backend/:  alembic revision --autogenerate -m "msg"
                      alembic upgrade head
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from alembic import context
from sqlalchemy import create_engine

import app.models  # noqa: F401 — register metadata
from app.database import Base

config = context.config


def get_url() -> str:
    return os.getenv("DATABASE_URL", "sqlite:///./ecogl.db")


target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(url=get_url(), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(get_url())
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
