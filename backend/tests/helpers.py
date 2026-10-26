"""Shared test helpers — auth headers with idempotent user bootstrap.

Each test module gets a fresh logical state via init_db(), but the
in-memory DB is shared per process, so users are created idempotently
(direct insert, explicit role) instead of relying on /register order.
"""
from app.core.security import hash_password
from app.database import SessionLocal
from app.models.user import User


def auth_headers(client, username="tadmin", password="testpass123", role="admin"):
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.username == username).first():
            db.add(
                User(
                    username=username,
                    hashed_password=hash_password(password),
                    role=role,
                )
            )
            db.commit()
    finally:
        db.close()
    r = client.post("/api/auth/login", data={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
