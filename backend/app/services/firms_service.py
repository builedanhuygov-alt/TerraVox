"""NASA FIRMS Multi-Sensor Satellite Thermal Radar Pipeline.

Authoritative NASA EOSDIS LANCE Active Fire Detections for California:
- Suomi-NPP VIIRS 375 m NRT
- NOAA-20 (JPSS-1) VIIRS 375 m NRT
- NOAA-21 (JPSS-2) VIIRS 375 m NRT
- MODIS C6.1 Terra & Aqua 1 km NRT

Preserves all original remote-sensing attributes without synthetic data:
- Geodetic coordinates (lat, lon)
- Satellite platform and sensor instrument
- Acquisition date, time in UTC, and ISO UTC timestamp
- Brightness temperature (bright_ti4/brightness and bright_ti5/bright_t31 in Kelvin)
- Fire Radiative Power (FRP in MW)
- Categorical/numerical confidence and Day/Night flag
- Ground scan and track pixel footprint (km)
- Observation age vs fetch time (honest freshness tracking)
"""
import asyncio
import csv
import datetime
import hashlib
import io
import logging
import math
import random
import time
from typing import Dict, List, Optional

import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)

CACHE: Dict[str, dict] = {}
TTL = 600  # 10 minutes cache

# California Bounding Box: [-124.48, 32.53] to [-114.13, 42.01]
CALIFORNIA_BBOX = "-124.48,32.53,-114.13,42.01"
CA_BOUNDS = {"min_lat": 32.5, "max_lat": 42.0, "min_lon": -124.5, "max_lon": -114.1}

# Known artificial heat infrastructure in California. Thermal sensors
# flag sun-baked airport concrete, solar thermal fields, and industrial plants.
ARTIFICIAL_HEAT_SOURCES = [
    {"name": "Sacramento International Airport Runway", "lon": -121.5908, "lat": 38.6954, "radius_km": 3.5},
    {"name": "Travis Air Force Base Tarmac", "lon": -121.9272, "lat": 38.2627, "radius_km": 3.5},
    {"name": "Ivanpah Solar Thermal Facility", "lon": -115.4700, "lat": 35.5567, "radius_km": 4.0},
    {"name": "Mojave Air and Space Port", "lon": -118.1517, "lat": 35.0594, "radius_km": 3.0},
    {"name": "Sân bay Phù Cát", "lon": 109.0442, "lat": 13.9550, "radius_km": 3.5},
]

# Official NASA FIRMS Open NRT 24-hr USA CSV Feeds
OPEN_NRT_FEEDS = {
    "VIIRS_SNPP": {
        "url": "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_USA_contiguous_and_Hawaii_24h.csv",
        "sensor": "VIIRS 375m",
        "satellite": "Suomi-NPP",
        "product": "NASA FIRMS Suomi-NPP VIIRS C2 375m NRT",
    },
    "VIIRS_NOAA20": {
        "url": "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_USA_contiguous_and_Hawaii_24h.csv",
        "sensor": "VIIRS 375m",
        "satellite": "NOAA-20 (JPSS-1)",
        "product": "NASA FIRMS NOAA-20 VIIRS C2 375m NRT",
    },
    "VIIRS_NOAA21": {
        "url": "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-21-viirs-c2/csv/J2_VIIRS_C2_USA_contiguous_and_Hawaii_24h.csv",
        "sensor": "VIIRS 375m",
        "satellite": "NOAA-21 (JPSS-2)",
        "product": "NASA FIRMS NOAA-21 VIIRS C2 375m NRT",
    },
    "MODIS_C61": {
        "url": "https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_USA_contiguous_and_Hawaii_24h.csv",
        "sensor": "MODIS 1km",
        "satellite": "Terra/Aqua",
        "product": "NASA FIRMS MODIS C6.1 1km NRT",
    },
}

SATELLITE_CODE_MAP = {
    "N": "Suomi-NPP",
    "N20": "NOAA-20 (JPSS-1)",
    "N21": "NOAA-21 (JPSS-2)",
    "T": "Terra",
    "A": "Aqua",
    "VIIRS": "Suomi-NPP",
    "MODIS": "Terra/Aqua",
}


def haversine_distance_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Documented geodesic distance using the great-circle Haversine formula (WGS-84 radius: 6371.0088 km)."""
    # Domain validation for latitudes
    if not (-90.0 <= lat1 <= 90.0 and -90.0 <= lat2 <= 90.0):
        raise ValueError(f"Latitude out of bounds [-90, 90]: lat1={lat1}, lat2={lat2}")
    # Normalize longitudes to [-180, 180]
    lon1 = (lon1 + 180.0) % 360.0 - 180.0
    lon2 = (lon2 + 180.0) % 360.0 - 180.0

    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2.0 * r * math.asin(math.sqrt(max(0.0, min(1.0, a))))


_haversine_km = haversine_distance_km


def is_inside_california(lon: float, lat: float) -> bool:
    """Bounding box verification for California."""
    return (
        CA_BOUNDS["min_lat"] <= lat <= CA_BOUNDS["max_lat"]
        and CA_BOUNDS["min_lon"] <= lon <= CA_BOUNDS["max_lon"]
    )


def flag_artificial_heat(fires: List[Dict]) -> List[Dict]:
    """Mark thermal hotspots matching known non-wildfire artificial heat sources (airports, solar plants)."""
    out = []
    for f in fires:
        f = dict(f)
        f["suspect_artificial"] = False
        try:
            flat = float(f.get("latitude") or 0)
            flon = float(f.get("longitude") or 0)
            for s in ARTIFICIAL_HEAT_SOURCES:
                d = haversine_distance_km(flon, flat, s["lon"], s["lat"])
                if d <= s["radius_km"]:
                    f["suspect_artificial"] = True
                    f["artificial_source"] = {"name": s["name"], "distance_km": round(d, 2)}
                    break
        except Exception:
            pass
        out.append(f)
    return out


def _parse_iso_utc(acq_date: str, acq_time: str) -> Optional[datetime.datetime]:
    """Parse FIRMS acq_date (YYYY-MM-DD) and acq_time (HHMM or HMM) to datetime in UTC."""
    try:
        if not acq_date:
            return None
        t_clean = str(acq_time).strip().zfill(4)
        hour = int(t_clean[:2])
        minute = int(t_clean[2:4])
        dt = datetime.datetime.strptime(acq_date, "%Y-%m-%d")
        return dt.replace(hour=hour, minute=minute, second=0, tzinfo=datetime.timezone.utc)
    except Exception:
        return None


def _parse_firms_csv(
    text: str,
    default_sensor: str = "VIIRS 375m",
    default_satellite: str = "Suomi-NPP",
    default_product: str = "NASA FIRMS NRT",
) -> List[Dict]:
    """Parse FIRMS CSV format from NASA, preserving all original attributes without synthetic fabrication."""
    fires = []
    now_utc = datetime.datetime.now(datetime.timezone.utc)

    try:
        reader = csv.DictReader(io.StringIO(text))
        for row in reader:
            try:
                lat_raw = row.get("latitude") or row.get("lat")
                lon_raw = row.get("longitude") or row.get("lon")
                if lat_raw is None or lon_raw is None:
                    continue

                lat = float(lat_raw)
                lon = float(lon_raw)

                # Brightness temperature (I-4 channel for VIIRS, Ch 21/22 for MODIS)
                b_raw = row.get("bright_ti4") or row.get("brightness")
                brightness = float(b_raw) if b_raw is not None and str(b_raw).strip() != "" else None

                # Secondary brightness channels when provided
                bt5_raw = row.get("bright_ti5")
                bright_ti5 = float(bt5_raw) if bt5_raw is not None and str(bt5_raw).strip() != "" else None

                bt31_raw = row.get("bright_t31")
                bright_t31 = float(bt31_raw) if bt31_raw is not None and str(bt31_raw).strip() != "" else None

                # Fire Radiative Power (MW)
                frp_raw = row.get("frp")
                frp = float(frp_raw) if frp_raw is not None and str(frp_raw).strip() != "" else None

                # Pixel footprint scan / track (km)
                scan_raw = row.get("scan")
                scan = float(scan_raw) if scan_raw is not None and str(scan_raw).strip() != "" else None

                track_raw = row.get("track")
                track = float(track_raw) if track_raw is not None and str(track_raw).strip() != "" else None

                # Platform / Satellite decoding
                sat_code = (row.get("satellite") or "").strip()
                sat_name = SATELLITE_CODE_MAP.get(sat_code, default_satellite)

                inst_raw = (row.get("instrument") or "").strip()
                instrument = default_sensor if not inst_raw else ("MODIS 1km" if "MODIS" in inst_raw.upper() else "VIIRS 375m")

                conf_raw = row.get("confidence")
                confidence = str(conf_raw).strip() if conf_raw is not None and str(conf_raw).strip() != "" else None

                dn_raw = row.get("daynight")
                daynight = str(dn_raw).strip().upper() if dn_raw is not None and str(dn_raw).strip() != "" else None
                version = str(row.get("version") or "").strip()

                acq_date = str(row.get("acq_date") or "").strip()
                acq_time = str(row.get("acq_time") or "").strip()

                # Parsed UTC timestamp
                dt_utc = _parse_iso_utc(acq_date, acq_time)
                acq_datetime_utc = dt_utc.isoformat() if dt_utc else None
                observation_age_hours = round((now_utc - dt_utc).total_seconds() / 3600.0, 2) if dt_utc else None

                item = {
                    "latitude": lat,
                    "longitude": lon,
                    "coordinates": [round(lon, 5), round(lat, 5)],
                    "acq_date": acq_date,
                    "acq_time": acq_time,
                    "acq_datetime_utc": acq_datetime_utc,
                    "observation_age_hours": observation_age_hours,
                    "brightness": brightness,
                    "confidence": confidence,
                    "satellite": sat_name,
                    "satellite_code": sat_code,
                    "instrument": instrument,
                    "frp": frp,
                    "daynight": daynight,
                    "scan": scan,
                    "track": track,
                    "version": version,
                    "source_product": default_product,
                }
                if bright_ti5 is not None:
                    item["bright_ti5"] = bright_ti5
                if bright_t31 is not None:
                    item["bright_t31"] = bright_t31

                fires.append(item)
            except Exception:
                continue
    except Exception as exc:
        logger.debug("FIRMS CSV parse error: %s", exc)

    return flag_artificial_heat(fires)


def _mock_fires(lat: float, lon: float, days: int = 2) -> List[Dict]:
    """Transparent Category D demo prior generator for offline/test fallback."""
    rng = random.Random(int(hashlib.sha256(f"{lat:.1f},{lon:.1f}".encode()).hexdigest()[:8], 16))
    n = rng.randint(0, 2)
    fires = []
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    for _ in range(n):
        plat = round(lat + rng.uniform(-0.4, 0.4), 5)
        plon = round(lon + rng.uniform(-0.4, 0.4), 5)
        dt = now_utc - datetime.timedelta(hours=rng.uniform(1.5, 18.0))
        fires.append({
            "latitude": plat,
            "longitude": plon,
            "coordinates": [plon, plat],
            "acq_date": dt.strftime("%Y-%m-%d"),
            "acq_time": dt.strftime("%H%M"),
            "acq_datetime_utc": dt.isoformat(),
            "observation_age_hours": round((now_utc - dt).total_seconds() / 3600.0, 2),
            "brightness": round(rng.uniform(310.0, 375.0), 1),
            "confidence": rng.choice(["nominal", "high", "nominal"]),
            "satellite": rng.choice(["Suomi-NPP", "NOAA-20 (JPSS-1)", "NOAA-21 (JPSS-2)"]),
            "instrument": "VIIRS 375m",
            "frp": round(rng.uniform(1.5, 18.5), 2),
            "daynight": rng.choice(["D", "N"]),
            "scan": 0.4,
            "track": 0.38,
            "version": "2.0NRT-DEMO",
            "source_product": "NASA FIRMS VIIRS 375m (Category D Demo Prior)",
            "is_demo": True,
        })
    return flag_artificial_heat(fires)


def _get_key() -> str:
    s = get_settings()
    return s.effective_firms_key or ""


async def fetch_firms_california(day_range: int = 1, source: str = "ALL_VIIRS_MODIS") -> Dict:
    """Multi-sensor California Bounding Box query.

    Integrates:
    - Suomi-NPP VIIRS 375m
    - NOAA-20 (JPSS-1) VIIRS 375m
    - NOAA-21 (JPSS-2) VIIRS 375m
    - MODIS C6.1 Terra & Aqua 1km

    Falls back to cached/stale data on network failure without claiming LIVE.
    """
    s = get_settings()
    key = _get_key()
    cache_key = f"ca_multi_sensor:{day_range}:{source}"
    now = time.time()
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    date_str = now_utc.strftime("%Y-%m-%d")

    if cache_key in CACHE:
        age = now - CACHE[cache_key]["ts"]
        if age < TTL:
            d = CACHE[cache_key]["data"].copy()
            d["status"] = "CACHED"
            d["cache_status"] = "CACHED"
            d["cache_age_seconds"] = int(age)
            return d
        elif age < TTL * 2:
            d = CACHE[cache_key]["data"].copy()
            d["status"] = "STALE"
            d["cache_status"] = "STALE"
            d["cache_age_seconds"] = int(age)
            return d

    # 1. Keyed API if valid MAP_KEY configured
    if key:
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/VIIRS_SNPP_NRT/{CALIFORNIA_BBOX}/{day_range}"
        try:
            async with httpx.AsyncClient(timeout=14.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200 and "latitude" in resp.text.lower():
                    fires = _parse_firms_csv(
                        resp.text,
                        default_sensor="VIIRS 375m",
                        default_satellite="Suomi-NPP",
                        default_product="NASA FIRMS VIIRS 375m Area Keyed API",
                    )
                    # Filter strict CA bounds & deduplicate
                    ca_fires = [f for f in fires if is_inside_california(f["longitude"], f["latitude"])]
                    seen = set()
                    uniq = []
                    for f in ca_fires:
                        k = (round(f["latitude"], 4), round(f["longitude"], 4), f.get("acq_date"), f.get("acq_time"), f.get("satellite"))
                        if k not in seen:
                            seen.add(k)
                            uniq.append(f)

                    uniq.sort(key=lambda x: (x.get("acq_datetime_utc") or "", x.get("frp") or 0.0), reverse=True)
                    latest_obs = uniq[0]["acq_datetime_utc"] if uniq else None
                    oldest_obs = uniq[-1]["acq_datetime_utc"] if uniq else None

                    data = {
                        "source": "NASA FIRMS",
                        "provider": "NASA EOSDIS LANCE / VIIRS 375m (Keyed API)",
                        "status": "LIVE",
                        "cache_status": "LIVE",
                        "satellite": "Suomi-NPP",
                        "instrument": "VIIRS 375m",
                        "bbox": CALIFORNIA_BBOX,
                        "fires": uniq,
                        "count": len(uniq),
                        "artificial_suspects": sum(1 for f in uniq if f.get("suspect_artificial")),
                        "api_url": url,
                        "retrieved_at": now,
                        "retrieved_at_utc": now_utc.isoformat(),
                        "latest_observation_utc": latest_obs,
                        "oldest_observation_utc": oldest_obs,
                        "sensors_queried": ["VIIRS_SNPP"],
                        "day_range": day_range,
                    }
                    CACHE[cache_key] = {"ts": now, "data": data}
                    return data
        except Exception as e:
            logger.warning("Keyed FIRMS fetch failed, falling back to multi-sensor open NRT feeds: %s", e)

    # 2. Multi-sensor Open NRT 24-hr USA Feeds (Suomi-NPP, NOAA-20, NOAA-21, MODIS)
    try:
        async with httpx.AsyncClient(timeout=16.0) as client:
            tasks = [client.get(info["url"]) for info in OPEN_NRT_FEEDS.values()]
            resps = await asyncio.gather(*tasks, return_exceptions=True)

            combined_ca_fires: List[Dict] = []
            successful_sensors: List[str] = []

            for (feed_key, feed_meta), resp in zip(OPEN_NRT_FEEDS.items(), resps):
                if isinstance(resp, Exception) or resp.status_code != 200 or "latitude" not in resp.text.lower():
                    logger.debug("Feed %s failed or empty", feed_key)
                    continue

                successful_sensors.append(feed_meta["sensor"])
                parsed = _parse_firms_csv(
                    resp.text,
                    default_sensor=feed_meta["sensor"],
                    default_satellite=feed_meta["satellite"],
                    default_product=feed_meta["product"],
                )
                ca_subset = [f for f in parsed if is_inside_california(f["longitude"], f["latitude"])]
                combined_ca_fires.extend(ca_subset)

                # Deduplicate by exact (lat, lon, acq_date, acq_time, satellite, instrument, scan, track)
                # to avoid merging different sensor platforms or distinct adjacent fire pixels.
                seen = set()
                uniq = []
                for f in combined_ca_fires:
                    k = (
                        round(f["latitude"], 5),
                        round(f["longitude"], 5),
                        f.get("acq_date"),
                        f.get("acq_time"),
                        f.get("satellite"),
                        f.get("instrument"),
                        f.get("scan"),
                        f.get("track"),
                    )
                    if k not in seen:
                        seen.add(k)
                        uniq.append(f)

                # Sort by newest observation time, then highest FRP
                uniq.sort(key=lambda x: (x.get("acq_datetime_utc") or "", x.get("frp") or 0.0), reverse=True)
                latest_obs = uniq[0]["acq_datetime_utc"] if uniq else None
                oldest_obs = uniq[-1]["acq_datetime_utc"] if uniq else None

                data = {
                    "source": "NASA FIRMS",
                    "provider": "NASA EOSDIS LANCE / VIIRS 375m & MODIS NRT Open Data",
                    "status": "LIVE",
                    "cache_status": "LIVE",
                    "satellite": "Multi-Sensor (Suomi-NPP, NOAA-20, NOAA-21, Terra/Aqua)",
                    "instrument": "VIIRS 375m + MODIS 1km",
                    "bbox": CALIFORNIA_BBOX,
                    "fires": uniq,
                    "count": len(uniq),
                    "artificial_suspects": sum(1 for f in uniq if f.get("suspect_artificial")),
                    "api_url": "https://firms.modaps.eosdis.nasa.gov/data/active_fire/",
                    "retrieved_at": now,
                    "retrieved_at_utc": now_utc.isoformat(),
                    "latest_observation_utc": latest_obs,
                    "oldest_observation_utc": oldest_obs,
                    "sensors_queried": list(OPEN_NRT_FEEDS.keys()),
                    "successful_sensors": successful_sensors,
                    "day_range": day_range,
                }
                CACHE[cache_key] = {"ts": now, "data": data}
                return data

    except Exception as exc:
        logger.warning("NASA FIRMS open public NRT failed: %s", exc)

    # 3. Fallback to cache if available
    if cache_key in CACHE:
        d = CACHE[cache_key]["data"].copy()
        d["status"] = "STALE"
        d["cache_status"] = "STALE"
        d["cache_age_seconds"] = int(now - CACHE[cache_key]["ts"])
        return d

    if s.is_demo:
        return {
            "source": "NASA FIRMS",
            "provider": "NASA FIRMS",
            "status": "DEMO",
            "cache_status": "DEMO",
            "bbox": CALIFORNIA_BBOX,
            "fires": _mock_fires(39.75, -121.60, day_range),
            "count": 2,
            "retrieved_at": now,
            "retrieved_at_utc": now_utc.isoformat(),
            "latest_observation_utc": now_utc.isoformat(),
        }

    return {
        "source": "NASA FIRMS",
        "provider": "NASA FIRMS",
        "status": "UNAVAILABLE",
        "cache_status": "UNAVAILABLE",
        "reason": "NASA FIRMS service unreachable",
        "bbox": CALIFORNIA_BBOX,
        "fires": [],
        "count": 0,
        "retrieved_at": now,
        "retrieved_at_utc": now_utc.isoformat(),
    }


async def fetch_firms(lat: float = 38.25, lon: float = -120.75, area: str = "world", day_range: int = 2) -> Dict:
    """Localized query around a specific latitude/longitude coordinate."""
    ca_res = await fetch_firms_california(day_range=day_range)
    if ca_res.get("status") in ("UNAVAILABLE",):
        return ca_res

    all_fires = ca_res.get("fires", [])
    # Filter within approx 1 degree (~111 km) of target
    near_fires = [
        f for f in all_fires
        if abs(f["latitude"] - lat) <= 1.0 and abs(f["longitude"] - lon) <= 1.0
    ]

    out = ca_res.copy()
    out["fires"] = near_fires
    out["count"] = len(near_fires)
    out["bbox"] = f"{lon-1:.2f},{lat-1:.2f},{lon+1:.2f},{lat+1:.2f}"
    return out


def sync_fetch(lat: float, lon: float) -> Dict:
    """Synchronous wrapper for background or CLI usage."""
    try:
        return asyncio.run(fetch_firms(lat, lon))
    except Exception:
        return {"source": "NASA FIRMS", "status": "DEMO", "cache_status": "DEMO", "fires": _mock_fires(lat, lon)}


fetch_firms_gialai = fetch_firms_california
