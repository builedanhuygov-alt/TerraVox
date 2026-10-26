"""Disaster summary — pure-compute multi-hazard snapshot for map popups."""
import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["DEMO_MODE"] = "true"

from fastapi.testclient import TestClient

from app.database import init_db
from app.main import create_app


def setup():
    app = create_app()
    init_db()
    return TestClient(app)


def test_disaster_summary_all_hazards():
    c = setup()
    r = c.get("/api/disaster/summary?administrative_unit_id=hoi-son&lat=13.92&lon=108.68")
    assert r.status_code == 200, r.text
    d = r.json()
    types = {s["risk_type"] for s in d["signals"]}
    assert {"FIRE", "FLOOD", "LANDSLIDE", "DROUGHT", "HEAT"} <= types
    for s in d["signals"]:
        assert 0 <= s["score"] <= 100 and s["level"]
    assert d["fused"]["max_score"] == max(s["score"] for s in d["signals"])
    assert d["status"] == "LIVE"
