"""Global search — real DB lookup, no hard-coded results."""
import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["DEMO_MODE"] = "true"

from fastapi.testclient import TestClient

from app.database import init_db
from app.main import create_app


def setup():
    app = create_app()
    init_db()
    try:
        from app.seed import seed_demo
        seed_demo()
    except Exception:
        pass
    return TestClient(app)


def test_search_finds_seeded_units():
    c = setup()
    r = c.get("/api/search/global?q=California")
    assert r.status_code == 200, r.text
    names = [x["name"] for x in r.json()["results"]]
    assert any("California" in n for n in names)
    r = c.get("/api/search/global?q=County")
    assert any(x["level"] == "COMMUNE" for x in r.json()["results"])


def test_search_empty_for_gibberish():
    c = setup()
    r = c.get("/api/search/global?q=xyznotexist123")
    assert r.status_code == 200
    assert r.json()["results"] == []
