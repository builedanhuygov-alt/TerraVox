"""Batch commune fire levels — one call renders every commune point on the map."""
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


def test_commune_levels_batch():
    c = setup()
    units = [
        {"id": "u1", "name": "Xã A", "lat": 13.7, "lon": 108.2},
        {"id": "u2", "name": "Xã B", "lat": 14.1, "lon": 108.6},
    ]
    r = c.post("/api/fire/commune-levels", json={"units": units})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["count"] == 2 and d["status"] == "LIVE"
    for lv in d["levels"]:
        assert lv["level"] in ("I", "II", "III", "IV", "V")
        assert 0 <= lv["score"] <= 100


def test_commune_levels_rejects_abuse():
    c = setup()
    assert c.post("/api/fire/commune-levels", json={"units": "nope"}).status_code == 400
    assert c.post("/api/fire/commune-levels", json={"units": [{"name": "x"}] * 201}).status_code == 400
    r = c.post("/api/fire/commune-levels", json={"units": []})
    assert r.status_code == 200 and r.json()["levels"] == []
