"""California Wildland-Urban Interface (WUI) community reference points & 20km proximity notification engine."""
import math
from typing import List, Dict

# California Operational BBox: [-124.48, 32.53] to [-114.13, 42.01]
CALIFORNIA_BBOX = "-124.48,32.53,-114.13,42.01"

COMMUNITIES = [
    {"id": "c1", "county": "Butte County", "code": "CA-BTU-01", "name": "Paradise WUI Corridor", "coords": [-121.60, 39.76], "population": 26000, "origin": "california-wui-directory"},
    {"id": "c2", "county": "Butte County", "code": "CA-BTU-02", "name": "Concow Basin & Pulga", "coords": [-121.53, 39.78], "population": 1200, "origin": "california-wui-directory"},
    {"id": "c3", "county": "Butte County", "code": "CA-BTU-03", "name": "Magalia Upper Ridge", "coords": [-121.60, 39.81], "population": 11500, "origin": "california-wui-directory"},
    {"id": "c4", "county": "Butte County", "code": "CA-BTU-04", "name": "Cohasset Ridge Interface", "coords": [-121.73, 39.92], "population": 950, "origin": "california-wui-directory"},
    {"id": "c5", "county": "Butte County", "code": "CA-BTU-05", "name": "Stirling City Forest Interface", "coords": [-121.53, 39.91], "population": 400, "origin": "california-wui-directory"},
    {"id": "c6", "county": "Butte County", "code": "CA-BTU-06", "name": "Berry Creek Foothills", "coords": [-121.39, 39.64], "population": 1400, "origin": "california-wui-directory"},
    {"id": "c7", "county": "Butte County", "code": "CA-BTU-07", "name": "Oroville Canyon Foothills", "coords": [-121.55, 39.51], "population": 20000, "origin": "california-wui-directory"},
    {"id": "c8", "county": "Butte County", "code": "CA-BTU-08", "name": "Chico Wildland Buffer", "coords": [-121.84, 39.73], "population": 105000, "origin": "california-wui-directory"},
    {"id": "c9", "county": "Plumas County", "code": "CA-PLU-01", "name": "Quincy Valley Basin", "coords": [-120.94, 39.93], "population": 5200, "origin": "california-wui-directory"},
    {"id": "c10", "county": "Plumas County", "code": "CA-PLU-02", "name": "Greenville Canyon Corridor", "coords": [-120.91, 40.14], "population": 1100, "origin": "california-wui-directory"},
    {"id": "c11", "county": "Plumas County", "code": "CA-PLU-03", "name": "Chester Lake Almanac WUI", "coords": [-121.23, 40.31], "population": 2200, "origin": "california-wui-directory"},
    {"id": "c12", "county": "Sonoma County", "code": "CA-LNU-01", "name": "Mark West Springs Corridor", "coords": [-122.72, 38.53], "population": 14000, "origin": "california-wui-directory"},
    {"id": "c13", "county": "Sonoma County", "code": "CA-LNU-02", "name": "The Geysers / Mayacamas Ridge", "coords": [-122.75, 38.80], "population": 850, "origin": "california-wui-directory"},
    {"id": "c14", "county": "Sonoma County", "code": "CA-LNU-03", "name": "Santa Rosa Fountaingrove WUI", "coords": [-122.71, 38.44], "population": 65000, "origin": "california-wui-directory"},
    {"id": "c15", "county": "Sonoma County", "code": "CA-LNU-04", "name": "Healdsburg Ridge Interface", "coords": [-122.87, 38.61], "population": 12000, "origin": "california-wui-directory"},
    {"id": "c16", "county": "Ventura County", "code": "CA-VNC-01", "name": "Ojai Valley Foothills", "coords": [-119.24, 34.45], "population": 8200, "origin": "california-wui-directory"},
    {"id": "c17", "county": "Los Angeles County", "code": "CA-LAC-01", "name": "Malibu Coastal Canyon Corridor", "coords": [-118.69, 34.04], "population": 12500, "origin": "california-wui-directory"},
    {"id": "c18", "county": "Los Angeles County", "code": "CA-LAC-02", "name": "Topanga Canyon WUI", "coords": [-118.60, 34.09], "population": 8500, "origin": "california-wui-directory"},
    {"id": "c19", "county": "Los Angeles County", "code": "CA-LAC-03", "name": "Calabasas Highlands", "coords": [-118.64, 34.15], "population": 24000, "origin": "california-wui-directory"},
    {"id": "c20", "county": "Shasta County", "code": "CA-SHU-01", "name": "Whiskeytown & West Redding WUI", "coords": [-122.56, 40.63], "population": 18000, "origin": "california-wui-directory"},
]

# Backward compatibility alias
VILLAGES = [
    {
        "id": c["id"],
        "commune": c["county"],
        "code": c["code"],
        "village": c["name"],
        "coords": c["coords"],
        "population": c["population"],
        "origin": c["origin"]
    }
    for c in COMMUNITIES
]

def get_villages() -> List[Dict]:
    return VILLAGES

def get_communities() -> List[Dict]:
    return COMMUNITIES

def haversine(lon1, lat1, lon2, lat2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def check_villages_within_20km(fires: List[Dict]) -> List[Dict]:
    """Calculate proximity alerts between verified/satellite thermal sources and California communities."""
    alerts = []
    for c in COMMUNITIES:
        vlon, vlat = c["coords"]
        for f in fires:
            if f.get("suspect_artificial"):
                continue
            flon = float(f.get("longitude") or f.get("lon") or -121.60)
            flat = float(f.get("latitude") or f.get("lat") or 39.75)
            dist = haversine(vlon, vlat, flon, flat)
            if dist <= 20:
                alerts.append({
                    "village": c["name"],
                    "commune": c["county"],
                    "community_name": c["name"],
                    "county": c["county"],
                    "code": c["code"],
                    "village_coords": c["coords"],
                    "fire_coords": [flon, flat],
                    "distance_km": round(dist, 1),
                    "acq_date": f.get("acq_date") or f.get("date") or "",
                    "confidence": f.get("confidence", "n"),
                    "level": "ACTIVE" if dist <= 5 else "WARNING" if dist <= 12 else "WATCH"
                })
    alerts.sort(key=lambda x: x["distance_km"])
    return alerts
