"""Feedback flow — public submit, admin list/resolve."""
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


def test_feedback_submit_and_triage():
    c = setup()
    # too short → 422
    assert c.post("/api/feedback", json={"message": "abc"}).status_code == 422
    # valid submit, unknown category normalized to bug
    r = c.post("/api/feedback", json={"category": "zzz", "message": "Nút THEO DÕI bấm không hiện gì",
                                      "page_url": "/map", "contact": "a@b.c"})
    assert r.status_code == 201, r.text
    fid = r.json()["id"]
    assert r.json()["status"] == "OPEN"
    # list requires admin
    assert c.get("/api/feedback").status_code in (401, 403)
    h = auth_headers(c)
    rows = c.get("/api/feedback", headers=h).json()
    assert any(x["id"] == fid and x["category"] == "bug" for x in rows)
    # resolve
    r = c.post(f"/api/feedback/{fid}/resolve", headers=h)
    assert r.status_code == 200 and r.json()["status"] == "RESOLVED"
    # resolve missing → 404
    assert c.post("/api/feedback/999999/resolve", headers=h).status_code == 404


def test_community_public_reporting():
    c = setup()
    # 1. Validation failure: description too short
    assert c.post("/api/community/public-report", json={"description": "hi"}).status_code == 422

    # 2. Public submission without any authentication
    payload = {
        "category": "smoke",
        "description": "Dense gray plume rising behind ridge east of Paradise",
        "location_name": "Butte County Ridge",
        "latitude": 39.7596,
        "longitude": -121.6219,
        "contact": "volunteer-watcher@example.com"
    }
    res = c.post("/api/community/public-report", json=payload)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["status"] == "PENDING_REVIEW"
    assert "Unverified" in data["verification_label"]
    rep_id = data["id"]

    # 3. Public listing works without login and omits contact information
    pub_res = c.get("/api/community/public-reports")
    assert pub_res.status_code == 200
    reports = pub_res.json()
    assert len(reports) >= 1
    found = next((r for r in reports if r["id"] == rep_id), None)
    assert found is not None
    assert found["category"] == "smoke"
    assert found["latitude"] == 39.7596
    assert found["longitude"] == -121.6219
    # Privacy check: reporter contact MUST NOT be in public payload
    assert "contact" not in found

    # 4. Moderation requires admin
    assert c.post(f"/api/community/public-reports/{rep_id}/moderate?action=VERIFY").status_code in (401, 403)

    # 5. Admin moderation succeeds
    h = auth_headers(c)
    mod_res = c.post(f"/api/community/public-reports/{rep_id}/moderate?action=COMMUNITY_VERIFIED", headers=h)
    assert mod_res.status_code == 200
    assert mod_res.json()["status"] == "COMMUNITY_VERIFIED"

    # 6. Public list reflects verified status
    pub_res_updated = c.get("/api/community/public-reports")
    found_updated = next((r for r in pub_res_updated.json() if r["id"] == rep_id), None)
    assert found_updated["is_verified"] is True
    assert "Community Corroborated" in found_updated["verification_label"]

