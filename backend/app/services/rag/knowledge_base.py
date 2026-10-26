"""California Wildland Fire Knowledge Base — Operational categories for RAG decision support."""
from app.services.rag.vector_store import KnowledgeDocument, VectorStoreProvider
import time

DOCS = [
    (
        "california_geo",
        "California Operational Geography & WUI Corridors",
        "California spans 423,970 km2. Flagship pilot encompasses high-risk wildland-urban interface (WUI) counties: Butte (Paradise, Concow, Magalia, Cohasset), Sonoma (Mark West, Mayacamas Ridge), Plumas (Feather River Canyon, Quincy Basin), and Los Angeles/Ventura (Malibu Canyon, Ojai Valley). Bounding box [-124.48, 32.53] to [-114.13, 42.01].",
        "geography",
        "CAL FIRE FRAP / US Census TIGER",
        "2026-01-15",
        "California, US"
    ),
    (
        "california_fuels",
        "California Fuel Models & Canopy Dynamics",
        "Primary fuel models follow Anderson (1982) and Scott & Burgan (2005): Fuel Model 4 (heavy chaparral/ceanothus), Model 1 (annual cured grass), Model 8/9 (closed conifer/timber litter). Healthy canopy NDVI > 0.65; drought stress when 100-hr fuel moisture drops below 7.0% and VPD exceeds 3.0 kPa.",
        "forests",
        "USFS Wildland Fire Assessment System / CAL FIRE",
        "2026-03-10",
        "Butte & Sonoma Counties"
    ),
    (
        "california_nfdrs",
        "National Fire Danger Rating System (NFDRS)",
        "NFDRS hazard scale: Class I Low (Green), Class II Moderate (Cyan), Class III High (Yellow), Class IV Very High (Orange), Class V Extreme/Red Flag (Red). Evaluates Burning Index (BI), Spread Component (SC), Energy Release Component (ERC), and Ignition Component (IC).",
        "regulations",
        "NWCG NFDRS Standard PMS 461",
        "2026-02-20",
        "California, US"
    ),
    (
        "california_diablo_winds",
        "Diablo and Santa Ana Foehn Wind Events",
        "Offshore downslope winds (Diablo in Northern CA, Santa Ana in Southern CA) force atmospheric compression, surging temperatures and dropping relative humidity below 10%. Sustained canyon gusts 35-65 mph cause extreme spotting distances (1-2 miles ahead of flame front).",
        "meteorology",
        "National Weather Service Spot Forecast Center",
        "2026-04-05",
        "Sierra Foothills & Mayacamas"
    ),
    (
        "california_camp_fire_forensics",
        "Camp Fire Forensic Lessons & Mitigation",
        "November 2018 Camp Fire (153,336 acres): Jarbo Gap offshore winds drove catastrophic spread through Concow into Paradise WUI within 4 hours. Critical lessons: evacuation corridor pre-clearing, forward strike team staging at canyon choke-points, and real-time aerial reconnaissance.",
        "forensics",
        "NIST Special Publication 1244",
        "2024-05-01",
        "Butte County"
    ),
    (
        "california_firms_telemetry",
        "NASA FIRMS Thermal Anomaly Surveillance",
        "VIIRS (375m) and MODIS (1km) sensors detect radiative brightness and FRP (MW). Unverified satellite detections must be ground-checked or cross-referenced with ALERTCalifornia cameras before declaring confirmed wildfire perimeters.",
        "satellite",
        "NASA LANCE / FIRMS",
        "2026-06-20",
        "California, US"
    ),
    (
        "california_sentinel2_ndvi",
        "Copernicus Sentinel-2 MSI Multi-Spectral Analysis",
        "Sentinel-2 10m bands calculate NDVI = (B08 - B04) / (B08 + B04) and NDMI = (B08 - B11) / (B08 + B11). Rapid drops in NDMI indicate severe canopy water stress and volatile fuel readiness prior to ignition events.",
        "satellite",
        "ESA Copernicus / GEE",
        "2026-07-15",
        "California, US"
    ),
    (
        "california_response_interventions",
        "CAL FIRE Mutual Aid Initial Attack Framework",
        "Operational interventions: Type 3 wildland engine pre-positioning, Skyway / SR-70 evacuation lane priority, Air Tactical Group Supervisor (ATGS) lead plane standby, and precautionary utility de-energization during Red Flag conditions.",
        "operations",
        "CAL FIRE Incident Management Handbook",
        "2026-08-01",
        "California, US"
    )
]

def seed_california(store: VectorStoreProvider):
    if hasattr(store, 'docs') and len(store.docs) > 0:
        return
    for doc_id, title, content, cat, source, ts, loc in DOCS:
        doc = KnowledgeDocument(id=doc_id, title=title, content=content, category=cat, source=source, timestamp=ts, location=loc)
        store.add_document(doc)

# Backward-compatible alias
seed_gia_lai = seed_california
