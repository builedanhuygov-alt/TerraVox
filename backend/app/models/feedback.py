"""User feedback / bug reports — public submit, admin triage."""
from datetime import datetime
from app.core.time import utcnow

from sqlalchemy import DateTime, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(32), default="bug")
    message: Mapped[str] = mapped_column(Text)
    page_url: Mapped[str | None] = mapped_column(String(256), nullable=True, default=None)
    location_name: Mapped[str | None] = mapped_column(String(128), nullable=True, default=None)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    contact: Mapped[str | None] = mapped_column(String(128), nullable=True, default=None)
    status: Mapped[str] = mapped_column(String(24), default="OPEN")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

