"""Feedback & Public Community Reporting routes.
Public visitors can submit community reports and feedback without authentication.
Moderation and administrative review remain strictly protected.
"""
import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.security import require_role
from app.database import get_db
from app.models.feedback import Feedback

router = APIRouter()

FEEDBACK_CATEGORIES = ("bug", "data", "suggestion")
COMMUNITY_CATEGORIES = (
    "smoke",
    "suspected_fire",
    "flooding",
    "environmental_damage",
    "downed_infrastructure",
    "other",
)

# In-memory IP rate limiter: 5 submissions per 10 minutes per IP
_SUBMISSION_HISTORY: dict[str, list[float]] = defaultdict(list)
_MAX_REPORTS_PER_WINDOW = 5
_WINDOW_SECONDS = 600


def _check_rate_limit(client_ip: str):
    now = time.time()
    cutoff = now - _WINDOW_SECONDS
    history = [t for t in _SUBMISSION_HISTORY[client_ip] if t > cutoff]
    if len(history) >= _MAX_REPORTS_PER_WINDOW:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait a few minutes before submitting another report."
        )
    history.append(now)
    _SUBMISSION_HISTORY[client_ip] = history


class FeedbackIn(BaseModel):
    category: str = Field(default="bug", max_length=32)
    message: str = Field(min_length=5, max_length=2000)
    page_url: str | None = Field(default=None, max_length=256)
    contact: str | None = Field(default=None, max_length=128)


class CommunityReportIn(BaseModel):
    category: str = Field(default="smoke", max_length=32)
    description: str = Field(min_length=5, max_length=2000)
    location_name: str | None = Field(default=None, max_length=128)
    latitude: float | None = Field(default=None, ge=-90.0, le=90.0)
    longitude: float | None = Field(default=None, ge=-180.0, le=180.0)
    contact: str | None = Field(default=None, max_length=128)


@router.post("/feedback", status_code=201)
def submit_feedback(body: FeedbackIn, db: Session = Depends(get_db)):
    category = body.category if body.category in FEEDBACK_CATEGORIES else "bug"
    fb = Feedback(
        category=category,
        message=body.message.strip(),
        page_url=body.page_url,
        contact=body.contact
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return {"id": fb.id, "status": fb.status}


@router.get("/feedback")
def list_feedback(status: str | None = None, db: Session = Depends(get_db),
                  admin=Depends(require_role("admin"))):
    q = db.query(Feedback).order_by(Feedback.created_at.desc()).limit(100)
    if status:
        q = q.filter(Feedback.status == status.upper())
    return [
        {
            "id": f.id,
            "category": f.category,
            "message": f.message,
            "page_url": f.page_url,
            "location_name": f.location_name,
            "latitude": f.latitude,
            "longitude": f.longitude,
            "contact": f.contact,
            "status": f.status,
            "created_at": str(f.created_at)
        }
        for f in q.all()
    ]


@router.post("/feedback/{feedback_id}/resolve")
def resolve_feedback(feedback_id: int, db: Session = Depends(get_db),
                     admin=Depends(require_role("admin"))):
    fb = db.get(Feedback, feedback_id)
    if not fb:
        raise HTTPException(404, "Feedback not found")
    fb.status = "RESOLVED"
    db.commit()
    return {"id": fb.id, "status": fb.status}


# =========================================================================
# PUBLIC COMMUNITY ENVIRONMENTAL REPORTING (OPEN ACCESS WITH ABUSE SAFEGUARDS)
# =========================================================================

@router.post("/community/public-report", status_code=201)
def submit_public_report(
    body: CommunityReportIn,
    request: Request,
    db: Session = Depends(get_db)
):
    """Public submission of community environmental hazard reports without mandatory login."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    _check_rate_limit(client_ip)

    cat = body.category.lower().strip()
    if cat not in COMMUNITY_CATEGORIES:
        cat = "other"

    report = Feedback(
        category=f"community_{cat}",
        message=body.description.strip(),
        location_name=body.location_name.strip() if body.location_name else None,
        latitude=body.latitude,
        longitude=body.longitude,
        contact=body.contact.strip() if body.contact else None,
        status="PENDING_REVIEW"
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "id": report.id,
        "status": "PENDING_REVIEW",
        "verification_label": "Unverified Community Report (Pending Moderation)",
        "category": cat,
        "location_name": report.location_name,
        "latitude": report.latitude,
        "longitude": report.longitude,
        "created_at": str(report.created_at),
        "message": "Report recorded in public environmental ledger. Awaiting sensor or agency corroboration."
    }


@router.get("/community/public-reports")
def list_public_reports(limit: int = 50, db: Session = Depends(get_db)):
    """Public listing of community observations with privacy protection (no reporter contact details)."""
    q = db.query(Feedback).filter(
        Feedback.category.startswith("community_")
    ).order_by(Feedback.created_at.desc()).limit(min(limit, 100))

    return [
        {
            "id": f.id,
            "category": f.category.replace("community_", ""),
            "description": f.message,
            "location_name": f.location_name or "California Geographic Observation",
            "latitude": f.latitude,
            "longitude": f.longitude,
            "status": f.status,
            "is_verified": f.status in ("COMMUNITY_VERIFIED", "OFFICIAL_VERIFIED", "VERIFIED"),
            "verification_label": (
                "Verified by Certified Ground Crew" if f.status == "OFFICIAL_VERIFIED"
                else "Community Corroborated" if f.status == "COMMUNITY_VERIFIED"
                else "Unverified Public Sighting (Pending Review)"
            ),
            "created_at": str(f.created_at)
        }
        for f in q.all()
    ]


@router.post("/community/public-reports/{report_id}/moderate")
def moderate_public_report(
    report_id: int,
    action: str,
    db: Session = Depends(get_db),
    admin=Depends(require_role("admin"))
):
    """Admin moderation for community reports."""
    fb = db.get(Feedback, report_id)
    if not fb or not fb.category.startswith("community_"):
        raise HTTPException(404, "Community report not found")

    act = action.upper()
    if act in ("VERIFY", "COMMUNITY_VERIFIED"):
        fb.status = "COMMUNITY_VERIFIED"
    elif act in ("OFFICIAL_VERIFIED", "APPROVE"):
        fb.status = "OFFICIAL_VERIFIED"
    elif act in ("REJECT", "REJECTED"):
        fb.status = "REJECTED"
    else:
        fb.status = "REVIEWED"

    db.commit()
    return {"id": fb.id, "status": fb.status}

