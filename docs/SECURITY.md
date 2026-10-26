# Security — current status (honest)

Implemented:
- CORS allowlist explicit origins, no wildcard with credentials (`backend/app/main.py`)
- JWT auth: `POST /api/auth/register` (first user → `admin`, rest `viewer`),
  `POST /api/auth/login` (OAuth2 password flow) → access + refresh pair,
  `GET /api/auth/me`, `POST /api/auth/refresh` (rotation with reuse detection),
  `POST /api/auth/logout` (chain revoke),
  `Depends(get_current_user)` / `require_role()` in `backend/app/core/security.py`
  (bcrypt passwords, HS256 via `python-jose`; `SECRET_KEY`/`ALGORITHM`/
  `ACCESS_TOKEN_EXPIRE_MINUTES`/`REFRESH_TOKEN_EXPIRE_DAYS` from env).
- Enforcement: official/admin writes require login — approvals approve/reject,
  forest + forest-guard verify/approve/reject, `POST /fire/warnings`,
  `POST /decision/record` (any user); kill-switch, model switch/rollback,
  `/mode`, `/admin/*` (admin only). Community reports, simulations, reads
  stay public by design. Covered by `test_auth.py` (401/403 cases).
- In-memory per-IP rate limiting 60/min (single instance only; resets on restart;
  not correct across multiple/serverless instances — roadmap: Redis-backed limiter)
- No secrets in frontend; all provider keys stay backend-side
- Community confirm rules enforced server-side (cross-commune 403, duplicate 400)
- Alembic scaffold (`backend/alembic/`, `alembic.ini`) — new schema changes go
  through revisions; `create_all()` remains as dev fallback.

NOT yet implemented (roadmap, do not claim otherwise):
- Enforcing auth on all write routes, refresh-token rotation, audit-log shipping.
- Redis-backed rate limiting, PostGIS switch beyond `DATABASE_URL`.
