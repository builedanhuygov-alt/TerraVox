"""CAL FIRE Data Connector — Official State of California Wildfire Incidents.

Fetches authoritative active wildfire records from CAL FIRE's public GeoJSON/JSON service:
https://incidents.fire.ca.gov/umbraco/api/IncidentApi/GeoJsonList

Provides request timeouts, in-memory caching, bounding-box filtering, normalization,
provenance metadata, and source health tracking.
"""
import time
import datetime
import logging
from typing import Dict, List, Optional
import httpx

logger = logging.getLogger(__name__)

CACHE: Dict[str, dict] = {}
TTL = 600  # 10 minutes cache

# California Bounding Box: [-124.48, 32.53] to [-114.13, 42.01]
CA_BBOX = {"min_lon": -124.5, "max_lon": -114.1, "min_lat": 32.5, "max_lat": 42.0}

CALFIRE_ACTIVE_URL = "https://incidents.fire.ca.gov/umbraco/api/IncidentApi/GeoJsonList?inactive=false"
CALFIRE_ALL_URL = "https://incidents.fire.ca.gov/umbraco/api/IncidentApi/GeoJsonList?inactive=true"


def is_inside_california(lon: float, lat: float) -> bool:
    return (
        CA_BBOX["min_lat"] <= lat <= CA_BBOX["max_lat"]
        and CA_BBOX["min_lon"] <= lon <= CA_BBOX["max_lon"]
    )


def _normalize_calfire_feature(feat: dict) -> Optional[dict]:
    """Normalize a CAL FIRE GeoJSON feature into a unified incident record."""
    try:
        geom = feat.get("geometry") or {}
        coords = geom.get("coordinates")
        if not coords or len(coords) < 2:
            return None
        lon, lat = float(coords[0]), float(coords[1])
        if not is_inside_california(lon, lat):
            return None

        props = feat.get("properties") or {}
        name = props.get("Name") or "Unnamed Incident"
        county = props.get("County") or "California"
        admin_unit = props.get("AdminUnit") or "CAL FIRE"
        acres = props.get("AcresBurned")
        acres_num = float(acres) if acres is not None else 0.0
        contained = props.get("PercentContained")
        contained_pct = float(contained) if contained is not None else None
        is_final = bool(props.get("Final", False))
        started = props.get("Started") or ""
        updated = props.get("Updated") or ""
        location = props.get("Location") or ""
        url = props.get("Url") or props.get("AdminUnitUrl") or f"https://www.fire.ca.gov/incidents"

        inc_id = f"calfire-{abs(hash(name + started)) % 1000000}"

        return {
            "id": inc_id,
            "source": "CAL FIRE",
            "source_type": "OFFICIAL_AGENCY",
            "name": name,
            "county": county,
            "admin_unit": admin_unit,
            "coordinates": [round(lon, 5), round(lat, 5)],
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "acres_burned": acres_num,
            "percent_contained": contained_pct,
            "is_final": is_final,
            "started_at": started,
            "updated_at": updated,
            "location_description": location,
            "official_url": url,
            "verification_status": "OFFICIAL_VERIFIED",
            "confidence": "high",
            "severity": "CRITICAL" if acres_num > 50000 else "HIGH" if acres_num > 5000 or (contained_pct is not None and contained_pct < 50) else "MODERATE",
            "retrieved_at": time.time(),
        }
    except Exception as e:
        logger.debug("Failed to normalize CAL FIRE feature: %s", e)
        return None


async def fetch_calfire_incidents(include_inactive: bool = False, inactive: Optional[bool] = None) -> dict:
    """Fetch live CAL FIRE incident points with caching and graceful fallbacks."""
    if inactive is not None:
        include_inactive = inactive
    now = time.time()
    cache_key = f"calfire:{include_inactive}"

    if cache_key in CACHE:
        age = now - CACHE[cache_key]["ts"]
        if age < TTL:
            d = CACHE[cache_key]["data"].copy()
            d["status"] = "CACHED"
            d["cache_age_seconds"] = int(age)
            return d

    url = CALFIRE_ALL_URL if include_inactive else CALFIRE_ACTIVE_URL
    try:
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "TERRAVOX-Environmental-Intelligence/3.0"})
            if resp.status_code == 200:
                data = resp.json()
                raw_features = data.get("features", [])
                normalized = []
                for f in raw_features:
                    rec = _normalize_calfire_feature(f)
                    if rec:
                        normalized.append(rec)

                # Sort: largest / least contained first
                normalized.sort(
                    key=lambda x: (
                        not x.get("is_final", False),
                        x.get("acres_burned", 0),
                    ),
                    reverse=True,
                )

                result = {
                    "source": "CAL FIRE",
                    "provider": "California Department of Forestry and Fire Protection",
                    "status": "LIVE",
                    "source_url": url,
                    "retrieved_at": now,
                    "observation_time": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "total_features": len(raw_features),
                    "california_incidents_count": len(normalized),
                    "count": len(normalized),
                    "incidents": normalized,
                }
                CACHE[cache_key] = {"ts": now, "data": result}
                return result
            else:
                logger.warning("CAL FIRE returned HTTP %s", resp.status_code)
                return {
                    "source": "CAL FIRE",
                    "status": "UNAVAILABLE",
                    "reason": f"CAL FIRE service returned HTTP {resp.status_code}",
                    "retrieved_at": now,
                    "incidents": [],
                    "california_incidents_count": 0,
                }
    except Exception as exc:
        logger.warning("CAL FIRE fetch failed: %s", exc)
        if cache_key in CACHE:
            d = CACHE[cache_key]["data"].copy()
            d["status"] = "STALE"
            d["stale_reason"] = str(exc)[:200]
            return d
        return {
            "source": "CAL FIRE",
            "status": "UNAVAILABLE",
            "reason": f"Connection error: {str(exc)[:150]}",
            "retrieved_at": now,
            "incidents": [],
            "california_incidents_count": 0,
        }
