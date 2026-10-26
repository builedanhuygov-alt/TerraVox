# Deployment
- Vercel frontend/backend
- Env: GEE_PROJECT_ID, GEE_SERVICE_ACCOUNT, GEE_PRIVATE_KEY, FIRMS_MAP_KEY, CDSE_CLIENT_ID, CDSE_CLIENT_SECRET, DEMO_MODE

## Postgres + PostGIS production
1. Create a Postgres DB (Neon/Supabase free tier works).
2. Run `backend/postgis_init.sql` once (enables PostGIS + indexes).
3. Set backend env: `DATABASE_URL=postgresql+psycopg2://USER:PASS@HOST:5432/ecogl`
   (`psycopg2-binary` + `geoalchemy2` are already in `requirements.txt`).
4. Schema: `alembic upgrade head` from `backend/` (falls back to
   `create_all()` on first boot via lifespan init).
5. Geometry is stored as GeoJSON text today, so the app boots on plain
   Postgres as well — PostGIS unlocks spatial indexes/queries when needed.

## Redis rate limiting (optional)
- Set `REDIS_URL=redis://...` (+ optional `RATE_LIMIT_PER_MINUTE`, default 60).
- Without it the app uses an in-memory limiter (correct per instance only).
- With it limits are enforced across all instances (Vercel-safe).
