"""Tests for TERRAVOX 3D Wildfire Digital Twin & Multi-Scenario Simulation Platform."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.digital_twin_geospatial import (
    search_california_locations,
    get_location_context,
    validate_and_import_geojson,
    execute_multi_scenario_simulation
)
from app.database import SessionLocal

client = TestClient(app)


def test_search_california_locations():
    """Verify location search by place name, county, and explicit coordinates."""
    # 1. Place name search
    res = search_california_locations("Paradise")
    assert len(res) >= 1
    assert "Paradise" in res[0]["name"]
    assert res[0]["county"] == "Butte County"

    # 2. County search
    res_sonoma = search_california_locations("Sonoma")
    assert len(res_sonoma) >= 1
    assert "Sonoma" in res_sonoma[0]["county"]

    # 3. Coordinate parsing search
    res_coord = search_california_locations("39.7596, -121.6219")
    assert len(res_coord) == 1
    assert "Coordinate Target" in res_coord[0]["name"]
    assert abs(res_coord[0]["coordinates"][0] - (-121.6219)) < 0.001
    assert abs(res_coord[0]["coordinates"][1] - 39.7596) < 0.001


@pytest.mark.asyncio
async def test_location_context_readiness():
    """Verify multi-source context compilation and readiness health audit."""
    ctx = await get_location_context(39.7596, -121.6219, radius_km=15.0)
    assert "weather_observations" in ctx
    assert "data_readiness" in ctx
    assert "terrain_profile" in ctx

    # Verify data readiness audit checklist
    readiness = ctx["data_readiness"]
    assert "weather" in readiness
    assert "elevation_terrain" in readiness
    assert "fire_perimeters" in readiness
    assert "satellite_hotspots" in readiness
    assert readiness["elevation_terrain"]["status"] == "LIVE"

    # Verify nearby historical fires detection
    assert len(ctx["nearby_historical_fires"]) >= 1
    fire_names = [f["name"] for f in ctx["nearby_historical_fires"]]
    assert "Camp Fire" in fire_names


def test_validate_and_import_geojson_success():
    """Verify successful validation of user-uploaded GeoJSON polygon and area calculation."""
    polygon_payload = {
        "type": "Feature",
        "properties": {"name": "Paradise High Risk Buffer"},
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [-121.65, 39.72],
                    [-121.58, 39.72],
                    [-121.58, 39.80],
                    [-121.65, 39.80],
                    [-121.65, 39.72]
                ]
            ]
        }
    }
    validated = validate_and_import_geojson(polygon_payload)
    assert validated["status"] == "VALIDATED"
    assert validated["geometry_type"] == "Polygon"
    assert validated["vertex_count"] == 5
    assert validated["is_california_pilot_region"] is True
    assert validated["estimated_extent"]["bbox_area_acres"] > 5000.0


def test_validate_and_import_geojson_rejection():
    """Verify actionable rejection for malformed or non-closed GeoJSON geometries."""
    # 1. Non-closed ring (fewer than 4 coordinates)
    invalid_ring = {
        "type": "Polygon",
        "coordinates": [[[-121.65, 39.72], [-121.58, 39.72]]]
    }
    with pytest.raises(ValueError) as exc1:
        validate_and_import_geojson(invalid_ring)
    assert "at least 4 coordinates" in str(exc1.value)

    # 2. Coordinates outside WGS84 range
    out_of_bounds = {
        "type": "Polygon",
        "coordinates": [
            [
                [-250.0, 150.0],
                [-240.0, 150.0],
                [-240.0, 160.0],
                [-250.0, 160.0],
                [-250.0, 150.0]
            ]
        ]
    }
    with pytest.raises(ValueError) as exc2:
        validate_and_import_geojson(out_of_bounds)
    assert "outside WGS84 range" in str(exc2.value)


def test_multi_scenario_simulation_execution():
    """Verify multi-scenario execution, independent isolation, and delta comparison."""
    db = SessionLocal()
    try:
        sim_payload = {
            "county": "Butte County",
            "scenarios": [
                {
                    "id": "baseline",
                    "name": "Observed Baseline",
                    "temp_c": 28.0,
                    "rh_pct": 22.0,
                    "wind_mph": 14.0,
                    "wind_dir_deg": 45,
                    "rain_7d_mm": 0.0,
                    "slope_deg": 18.0
                },
                {
                    "id": "scenario_a",
                    "name": "Offshore Canyon Windstorm",
                    "temp_c": 33.0,
                    "rh_pct": 9.0,
                    "wind_mph": 35.0,
                    "wind_dir_deg": 45,
                    "rain_7d_mm": 0.0,
                    "slope_deg": 18.0,
                    "intervention": "Pre-position team"
                }
            ]
        }
        res = execute_multi_scenario_simulation(sim_payload, db)
        assert res["status"] == "COMPLETED"
        assert res["scenarios_count"] == 2
        assert len(res["scenarios"]) == 2

        base = res["scenarios"][0]
        scen_a = res["scenarios"][1]

        # Verify scenario isolation
        assert base["inputs"]["temp_c"] == 28.0
        assert scen_a["inputs"]["temp_c"] == 33.0

        # Verify physical parameters generated
        assert base["physical_parameters"]["vapor_pressure_deficit_kpa"] > 0
        assert scen_a["physical_parameters"]["vapor_pressure_deficit_kpa"] > base["physical_parameters"]["vapor_pressure_deficit_kpa"]

        # Verify comparative delta
        cmp = scen_a["comparison_to_baseline"]
        assert cmp["score_delta"] > 0
        assert cmp["temp_delta_c"] == 5.0
        assert cmp["wind_delta_mph"] == 21.0

        # Verify mandatory legal disclaimer
        assert "ILLUSTRATIVE SCENARIO — NOT A VALIDATED FIRE-SPREAD FORECAST" in res["mandatory_legal_disclaimer"]
    finally:
        db.close()


def test_api_twin_endpoints():
    """Verify HTTP API endpoints for search, context, GeoJSON, active incidents, and simulation."""
    # 1. Location search endpoint
    r = client.get("/api/twin/location/search?q=Chico")
    assert r.status_code == 200
    j = r.json()
    assert j["count"] >= 1
    assert "Chico" in j["results"][0]["name"]

    # 2. Location context endpoint
    r = client.get("/api/twin/location/context?lat=39.7596&lon=-121.6219&radius_km=10")
    assert r.status_code == 200
    ctx = r.json()
    assert "data_readiness" in ctx
    assert "nearby_historical_fires" in ctx

    # 3. Active incidents endpoint
    r = client.get("/api/twin/incidents/active")
    assert r.status_code == 200
    inc = r.json()
    assert "active_incidents" in inc
    assert "satellite_hotspots_count" in inc

    # 4. Multi-scenario endpoint
    r = client.post("/api/twin/simulate/multi-scenario", json={
        "county": "Butte County",
        "scenarios": [
            {"id": "baseline", "name": "Base", "temp_c": 28.0, "rh_pct": 22.0, "wind_mph": 14.0},
            {"id": "scenario_a", "name": "Wind", "temp_c": 30.0, "rh_pct": 12.0, "wind_mph": 28.0}
        ]
    })
    assert r.status_code == 200
    sim = r.json()
    assert sim["scenarios_count"] == 2
    assert "mandatory_legal_disclaimer" in sim
