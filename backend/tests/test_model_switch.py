"""Model switch + mode honesty — registry validation, instance scope."""
import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["DEMO_MODE"] = "true"

from fastapi.testclient import TestClient

from app.database import Base, engine, init_db
from app.main import create_app
from tests.helpers import auth_headers


def setup():
    Base.metadata.drop_all(bind=engine)
    app = create_app()
    init_db()
    return TestClient(app)


def test_switch_list_honest():
    c = setup()
    rows = c.get("/api/models/switch/list").json()
    assert rows
    for r in rows:
        assert r["active"] in r["available"]  # no fake versions advertised
    assert all(r["available"] == ["v1.0"] for r in rows)


def test_switch_requires_admin_and_validates():
    c = setup()
    h = auth_headers(c)
    # anonymous → 401
    assert c.post("/api/models/switch", json={"agent": "ForestGuard", "version": "v1.0"}).status_code == 401
    # unknown version → 400, not silent pretend
    r = c.post("/api/models/switch", json={"agent": "ForestGuard", "version": "v9.9"}, headers=h)
    assert r.status_code == 400
    # unknown agent → 400
    r = c.post("/api/models/switch", json={"agent": "Nope", "version": "v1.0"}, headers=h)
    assert r.status_code == 400
    # real switch works + audited in history
    r = c.post("/api/models/switch", json={"agent": "ForestGuard", "version": "v1.0"}, headers=h)
    assert r.status_code == 200 and r.json()["active"] == "v1.0"
    hist = c.get("/api/models/switch/history").json()
    assert any(x["agent"] == "ForestGuard" for x in hist)


def test_mode_reports_source_and_scope():
    c = setup()
    h = auth_headers(c)
    m = c.get("/api/mode").json()
    assert m["source"] == "env DEMO_MODE" and m["persistent"] is True
    # anonymous cannot flip mode
    assert c.post("/api/mode", json={"mode": "REAL"}).status_code == 401
    # admin flip is instance-scoped and says so
    m = c.post("/api/mode", json={"mode": "REAL"}, headers=h).json()
    assert m["mode"] == "REAL" and m["persistent"] is False
    assert "instance" in m["note"].lower() or "serverless" in m["note"].lower()
    assert c.get("/api/mode").json()["source"] == "instance-override"
