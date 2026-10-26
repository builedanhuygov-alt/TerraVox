from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.audit import audit_log
from app.services.model_switcher import (
    describe_mode,
    get_mode,
    list_models,
    switch,
    switch_history,
)
from app.core.config import get_settings
from app.core.security import require_role

router = APIRouter(tags=["ModelSwitch"])

_mode_override = None


@router.get("/models/switch/list")
def list_switch():
    return list_models()


@router.get("/models/switch/history")
def history(limit: int = 20):
    return switch_history(limit)


@router.post("/models/switch")
def do_switch(body: dict, db: Session = Depends(get_db), admin=Depends(require_role("admin"))):
    agent = body.get("agent")
    version = body.get("version")
    if not agent or not version:
        raise HTTPException(400, "agent and version required")
    try:
        v = switch(agent, version)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    audit_log(db, action="MODEL_SWITCH", resource_type="agent", resource_id=agent,
              actor_id=admin.username, detail=f"{agent} → {v}")
    db.commit()
    return {"agent": agent, "active": v, "status": "switched"}


@router.get("/mode")
def get_mode_api():
    global _mode_override
    return describe_mode(_mode_override)


@router.post("/mode")
def set_mode_api(body: dict, admin=Depends(require_role("admin"))):
    global _mode_override
    mode = body.get("mode", "DEMO")
    if mode not in ("DEMO", "REAL"):
        raise HTTPException(400, "mode must be DEMO or REAL")
    _mode_override = mode
    return {**describe_mode(_mode_override), "status": "switched (instance scope — reload frontend to apply)"}
