"""Regression test suite to ensure strict California geography and zero legacy Gia Lai data."""
import pytest
from app.database import SessionLocal
from app.models.administrative import AdministrativeUnit
from app.models.fire import OfficialFireWarning
from app.models.water import WaterAsset
from app.services.village_fire import VILLAGES


def is_in_california(lon: float, lat: float) -> bool:
    return 32.5 <= lat <= 42.0 and -124.5 <= lon <= -114.1


def test_database_contains_zero_legacy_gia_lai():
    """Verify that ecogl.db contains zero Gia Lai, Kon Ka Kinh, or Vietnamese entities."""
    with SessionLocal() as db:
        # Check administrative units
        aus = db.query(AdministrativeUnit).all()
        assert len(aus) > 0, "Administrative units should be seeded"
        for au in aus:
            assert "Gia Lai" not in au.name, f"Found legacy unit: {au.name}"
            assert "Kon Ka Kinh" not in au.name, f"Found legacy unit: {au.name}"
            if au.centroid_lat is not None and au.centroid_lng is not None:
                assert is_in_california(au.centroid_lng, au.centroid_lat), (
                    f"Unit {au.name} ({au.centroid_lng}, {au.centroid_lat}) is outside California"
                )

        # Check fire warnings
        warnings = db.query(OfficialFireWarning).all()
        assert len(warnings) > 0, "Fire warnings should be seeded"
        for w in warnings:
            assert "Gia Lai" not in (w.source or ""), f"Found legacy warning source: {w.source}"
            assert "Kon Ka Kinh" not in (w.source or ""), f"Found legacy warning source: {w.source}"
            assert "Gia Lai" not in (w.scope or ""), f"Found legacy warning scope: {w.scope}"

        # Check water assets
        waters = db.query(WaterAsset).all()
        assert len(waters) > 0, "Water assets should be seeded"
        for wa in waters:
            assert wa.province == "California", f"Water asset {wa.name} province is not California"
            assert is_in_california(wa.longitude, wa.latitude), (
                f"Water asset {wa.name} ({wa.longitude}, {wa.latitude}) is outside California"
            )


def test_villages_service_strictly_california():
    """Verify that all community/village reference points are in California."""
    assert len(VILLAGES) >= 15, "Should have monitored California WUI communities"
    for v in VILLAGES:
        coords = v["coords"]
        lon, lat = coords[0], coords[1]
        assert is_in_california(lon, lat), (
            f"Community {v['village']} ({lon}, {lat}) is outside California bounds"
        )
        assert v["code"].startswith("CA-"), f"Code {v['code']} must start with CA-"
        assert "Gia Lai" not in v["commune"]
        assert "Kon Ka Kinh" not in v["village"]


def test_california_counties_geojson_present():
    """Verify that the official California counties GeoJSON exists and is valid."""
    import os, json
    geojson_path = os.path.join(os.path.dirname(__file__), "..", "app", "data", "california_counties.geojson")
    assert os.path.exists(geojson_path), "california_counties.geojson must exist in backend/app/data"
    with open(geojson_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) == 58, "California has exactly 58 official counties"
