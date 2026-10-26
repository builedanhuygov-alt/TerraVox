# Data Sources
- Sentinel-2/1, Landsat, Dynamic World, WorldCover, SRTM via GEE
- FIRMS via NASA
- Weather via Open-Meteo, NASA POWER

## Mock vs LIVE
- Without GEE credentials the API serves deterministic DEMO mocks (sha256-seeded,
  stable across restarts) and labels responses `DEMO / SIMULATED` — it never crashes.
- `GET /api/earth-engine/status` reports the real state; `configured:false` means mock.

## Going LIVE with GEE (verify end-to-end after setting keys)
1. Set `GEE_PROJECT_ID`, `GEE_SERVICE_ACCOUNT`, `GEE_PRIVATE_KEY` (or `GEE_KEY_FILE`),
   `APP_ENV=production`, `DEMO_MODE=false`, then restart.
2. `GET /api/earth-engine/status` → `{"connected":true}` (not `NOT_CONFIGURED`).
3. `GET /api/health/geospatial` → `gee LIVE`.
4. `GET /api/v1/satellite/ndvi?...` → response has no `"mock":true` and values
   change between different bboxes/dates (mock would repeat per seed).
5. Compare one NDVI result against https://code.earthengine.google.com for the same
   geometry/date — they must be in the same range; investigate if far off.
