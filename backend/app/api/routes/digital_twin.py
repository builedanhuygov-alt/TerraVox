"""API routes for 3D Wildfire Digital Twin & Multi-Scenario Simulation Platform."""
from fastapi import APIRouter, HTTPException, Query, Depends, Body
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.digital_twin_geospatial import (
    search_california_locations,
    get_location_context,
    validate_and_import_geojson,
    get_active_california_incidents,
    execute_multi_scenario_simulation
)

router = APIRouter(prefix="/api/twin", tags=["Digital Twin & Multi-Scenario"])


@router.get("/location/search", summary="Search California locations, counties, or coordinates")
def search_locations(q: str = Query(default="", description="Location name, county, or lat,lon coordinates")):
    """Search California places, counties, landmarks, or parse coordinates."""
    results = search_california_locations(q)
    return {
        "query": q,
        "count": len(results),
        "results": results
    }


@router.get("/location/context", summary="Get multi-dataset geospatial context & readiness audit")
async def location_context(
    lat: float = Query(..., ge=-90, le=90, description="Latitude in decimal degrees"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude in decimal degrees"),
    radius_km: float = Query(default=10.0, ge=1.0, le=100.0, description="Analysis buffer radius in km")
):
    """Compile weather, terrain elevation, nearby historical fires, and data readiness status."""
    try:
        return await get_location_context(lat, lon, radius_km)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to compile location context: {str(exc)}")


@router.post("/location/import-geojson", summary="Validate and import GeoJSON perimeter or analysis area")
def import_geojson(payload: Dict[str, Any] = Body(...)):
    """Validate GeoJSON Feature, Polygon, or MultiPolygon with coordinate and bounding box calculation."""
    try:
        return validate_and_import_geojson(payload)
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"GeoJSON processing error: {str(exc)}")


@router.get("/incidents/active", summary="Get verified active incidents & satellite thermal detections")
async def active_incidents():
    """Retrieve active California incidents and verified NASA FIRMS satellite hotspots."""
    return await get_active_california_incidents()


@router.post("/simulate/multi-scenario", summary="Execute multi-scenario simulation and comparison")
def simulate_multi_scenario(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """Simulate up to 4 simultaneous scenarios (Baseline, A, B, C) with transparent physical models."""
    try:
        return execute_multi_scenario_simulation(payload, db)
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(exc)}")
