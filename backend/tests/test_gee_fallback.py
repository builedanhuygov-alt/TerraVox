"""GEE fallback chain — no creds → NOT_CONFIGURED + deterministic mock.

Covers audit item 5: the LIVE path needs real credentials (see
docs/DATA_SOURCES.md checklist), but everything below that must hold
without them: no crash, mock factory, cross-restart stable mock values.
"""
import hashlib
import os
import random

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["DEMO_MODE"] = "true"

from app.core.enums import GEEStatus, SatelliteSource
from app.services.earth_engine.auth import gee_auth
from app.services.earth_engine.service import (
    EEQueryParams,
    MockEarthEngineService,
    get_earth_engine_service,
)


def _params():
    return EEQueryParams(
        administrative_unit_id="commune_a",
        geometry={"type": "Point", "coordinates": [108.3, 13.9]},
        start_date="2026-08-01",
        end_date="2026-09-01",
        dataset=SatelliteSource.SENTINEL2,
    )


def test_no_creds_no_crash():
    assert gee_auth.authenticate() == GEEStatus.NOT_CONFIGURED
    info = gee_auth.check_configuration()
    for k in ("status", "configured", "project_id_set", "service_account_set",
              "has_key", "last_error", "ee_import_error"):
        assert k in info
    assert info["configured"] is False


def test_factory_returns_mock_without_creds():
    svc = get_earth_engine_service()
    assert isinstance(svc, MockEarthEngineService)
    assert get_earth_engine_service(use_mock=True).__class__ is MockEarthEngineService


def test_mock_ndvi_deterministic_same_process():
    svc = MockEarthEngineService()
    a = svc.calculate_ndvi(_params())
    b = svc.calculate_ndvi(_params())
    assert a.mean == b.mean and a.mean != 0
    assert 0.0 <= a.mean <= 1.0


def test_mock_ndvi_seed_stable_across_restarts():
    # sha256 seed (not hash()) → same value in any process
    key = "commune_a|2026-08-01|2026-09-01|SENTINEL2"
    seed = int(hashlib.sha256(key.encode()).hexdigest()[:8], 16)
    expected = round(random.Random(seed).uniform(0.25, 0.85), 4)
    assert MockEarthEngineService().calculate_ndvi(_params()).mean == expected


def test_mock_statistics_flagged():
    stats = MockEarthEngineService().calculate_statistics(_params())
    assert stats["mock"] is True
