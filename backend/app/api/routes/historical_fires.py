"""API routes for California Historical Wildfire Reconstruction & Forensic Analytics."""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from app.services.historical_wildfires import (
    get_historical_fires_catalog,
    get_historical_fire_detail,
    compare_historical_fires
)

router = APIRouter(prefix="/api/historical-fires", tags=["Historical Wildfires"])


@router.get("", summary="List documented California historical wildfires")
def list_historical_fires():
    """Return catalog of documented California wildfires with metadata and data completeness."""
    return get_historical_fires_catalog()


@router.get("/{fire_id}", summary="Get full forensic dossier, timeline, and perimeter for a fire")
def get_historical_fire(fire_id: str):
    """Return complete record for a historical fire including snapshots, damage audit, and perimeter."""
    fire = get_historical_fire_detail(fire_id)
    if not fire:
        raise HTTPException(status_code=404, detail=f"Historical fire record '{fire_id}' not found.")
    return fire


@router.get("/{fire_id}/perimeter", summary="Get documented GeoJSON perimeter")
def get_historical_perimeter(fire_id: str):
    """Return verified GeoJSON Feature of fire perimeter."""
    fire = get_historical_fire_detail(fire_id)
    if not fire:
        raise HTTPException(status_code=404, detail=f"Historical fire record '{fire_id}' not found.")
    return fire.get("perimeter_geojson", {})


@router.post("/compare", summary="Compare two documented historical fires")
def compare_fires(body: Dict[str, str]):
    """Compare two documented California wildfires across physical, meteorological, and consequence metrics."""
    fire_id_1 = body.get("fire_id_1")
    fire_id_2 = body.get("fire_id_2")
    if not fire_id_1 or not fire_id_2:
        raise HTTPException(status_code=400, detail="Must provide both 'fire_id_1' and 'fire_id_2'.")
    res = compare_historical_fires(fire_id_1, fire_id_2)
    if not res:
        raise HTTPException(status_code=404, detail="One or both historical fire IDs not found.")
    return res
