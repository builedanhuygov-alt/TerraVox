"""Authoritative Satellite Imagery Service.

Integrates real satellite imagery services without synthetic fabrication:
- NASA Global Imagery Browse Services (GIBS) Web Map Tile Service (WMTS)
- True-Color Optical Composites (Suomi-NPP VIIRS 375m, Terra MODIS 250m)
- Multi-Spectral False-Color Burn Scar Product (MODIS Bands 7-2-1)
- Deep links to NASA Worldview and NASA FIRMS Fire Map

Strict Classification Standards:
Category A: Thermal Anomaly Point Data (NASA FIRMS VIIRS/MODIS)
Category B: True-Color Satellite Imagery (NASA GIBS VIIRS/MODIS optical)
Category C: Multi-Spectral False-Color / Burn-Scar Composites (NASA GIBS Bands 7-2-1)
Category D: Illustrative Graphics / Status Notices (when imagery is unavailable)
"""
import datetime
import logging
from typing import Dict, List, Optional
import httpx

logger = logging.getLogger(__name__)

# In-memory tile cache to minimize redundant NASA GIBS requests
TILE_CACHE: Dict[str, bytes] = {}
MAX_TILE_CACHE_SIZE = 1000

# Authoritative layer catalog with proven NASA GIBS layers
SATELLITE_LAYERS: Dict[str, dict] = {
    "VIIRS_NOAA20_CorrectedReflectance_TrueColor": {
        "id": "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
        "name": "NASA VIIRS True-Color Optical (375m)",
        "short_name": "VIIRS Optical 375m",
        "category": "B",
        "category_label": "True-Color Satellite Imagery",
        "sensor": "VIIRS on NOAA-20 (JPSS-1)",
        "spatial_resolution": "375 m at nadir",
        "product_type": "Surface Corrected Reflectance RGB Optical Composite",
        "cadence": "Daily afternoon orbital pass (~13:30 local solar time)",
        "matrix_set": "GoogleMapsCompatible_Level9",
        "max_zoom": 9,
        "format": "image/jpeg",
        "source": "NASA GIBS / EOSDIS",
        "status": "ACCESSIBLE",
        "description": "Natural color imagery representing land surface, smoke plumes, and cloud cover as seen by the human eye.",
        "scientific_disclosures": "Optical composite acquired during daytime orbital overpasses. Subject to cloud obscuration and smoke attenuation.",
    },
    "MODIS_Terra_CorrectedReflectance_TrueColor": {
        "id": "MODIS_Terra_CorrectedReflectance_TrueColor",
        "name": "NASA Terra MODIS True-Color Optical (250m)",
        "short_name": "MODIS Optical 250m",
        "category": "B",
        "category_label": "True-Color Satellite Imagery",
        "sensor": "MODIS on Terra",
        "spatial_resolution": "250 m at nadir",
        "product_type": "Surface Corrected Reflectance RGB Optical Composite (Bands 1, 4, 3)",
        "cadence": "Daily morning orbital pass (~10:30 local solar time)",
        "matrix_set": "GoogleMapsCompatible_Level9",
        "max_zoom": 9,
        "format": "image/jpeg",
        "source": "NASA GIBS / EOSDIS",
        "status": "ACCESSIBLE",
        "description": "High-temporal optical reflectance composite capturing morning atmospheric conditions and large smoke plumes.",
        "scientific_disclosures": "Optical composite acquired during morning orbital overpasses. Cloud decks and marine fog will obscure surface observations.",
    },
    "MODIS_Terra_CorrectedReflectance_Bands721": {
        "id": "MODIS_Terra_CorrectedReflectance_Bands721",
        "name": "NASA MODIS False-Color 7-2-1 (Burn Scars & Thermal Fronts)",
        "short_name": "Burn Scar False-Color",
        "category": "C",
        "category_label": "Burn-Scar & Multi-Spectral Product",
        "sensor": "MODIS on Terra",
        "spatial_resolution": "250 m at nadir",
        "product_type": "Shortwave Infrared (SWIR) / Near Infrared (NIR) / Red Composite",
        "cadence": "Daily morning orbital pass",
        "matrix_set": "GoogleMapsCompatible_Level9",
        "max_zoom": 9,
        "format": "image/jpeg",
        "source": "NASA GIBS / EOSDIS",
        "status": "ACCESSIBLE",
        "description": "Specialized multi-spectral band combination: Burn scars appear charcoal/brick-red; actively flaming fire fronts glow vivid red/pink; healthy unburned canopy appears vibrant green.",
        "scientific_disclosures": "Bands 7 (2.1 μm SWIR), 2 (0.86 μm NIR), and 1 (0.65 μm Red). Penetrates light haze and thin smoke, but cannot penetrate dense clouds or marine stratus.",
    },
}


def get_layer_catalog() -> List[Dict]:
    """Return all available satellite imagery layers with honest provenance and accessibility."""
    return list(SATELLITE_LAYERS.values())


def generate_worldview_url(lon: float, lat: float, date_str: str, zoom_delta: float = 0.5) -> str:
    """Generate official NASA Worldview direct URL centered on coordinates and date."""
    min_lon = round(lon - zoom_delta, 4)
    max_lon = round(lon + zoom_delta, 4)
    min_lat = round(lat - zoom_delta * 0.75, 4)
    max_lat = round(lat + zoom_delta * 0.75, 4)
    layers = "VIIRS_NOAA20_CorrectedReflectance_TrueColor,MODIS_Terra_CorrectedReflectance_TrueColor,VIIRS_SNPP_Thermal_Anomalies_375m_All"
    return (
        f"https://worldview.earthdata.nasa.gov/?v={min_lon},{min_lat},{max_lon},{max_lat}"
        f"&l={layers}&t={date_str}"
    )


def generate_firms_map_url(lon: float, lat: float, date_str: str) -> str:
    """Generate official NASA FIRMS Fire Map viewer URL centered on coordinates and date."""
    return f"https://firms.modaps.eosdis.nasa.gov/map/#d:{date_str}..{date_str};@{lon:.4f},{lat:.4f},11.0z"


LAYER_ALIASES: Dict[str, str] = {
    "viirs_snpp_truecolor": "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
    "viirs_noaa20_truecolor": "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
    "viirs_snpp_correctedreflectance_truecolor": "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
    "viirs_noaa20_correctedreflectance_truecolor": "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
    "modis_terra_truecolor": "MODIS_Terra_CorrectedReflectance_TrueColor",
    "modis_terra_correctedreflectance_truecolor": "MODIS_Terra_CorrectedReflectance_TrueColor",
    "modis_terra_721": "MODIS_Terra_CorrectedReflectance_Bands721",
    "modis_terra_correctedreflectance_bands721": "MODIS_Terra_CorrectedReflectance_Bands721",
}


async def fetch_gibs_tile(layer_id: str, date_str: str, z: int, x: int, y: int) -> Optional[bytes]:
    """Fetch an actual satellite imagery tile from NASA GIBS WMTS.

    Note on WMTS tile coordinate convention:
    - MapLibre raster source requests tiles using standard /z/x/y format.
    - NASA GIBS WMTS endpoint expects: /TileMatrixSet/{TileMatrix}/{TileRow}/{TileCol}.jpg
      where TileMatrix = z, TileRow = y, and TileCol = x!
    """
    canonical_id = LAYER_ALIASES.get(layer_id.lower(), layer_id)
    layer_info = SATELLITE_LAYERS.get(canonical_id)
    if not layer_info:
        logger.warning("Requested unknown satellite layer: %s (canonical: %s)", layer_id, canonical_id)
        return None

    # NASA GIBS GoogleMapsCompatible_Level9 provides tiles up to zoom level 9 (375m ground resolution)
    max_z = layer_info.get("max_zoom", 9)
    if z > max_z:
        logger.debug("Tile zoom %s exceeds layer max zoom %s", z, max_z)
        return None

    req_x = x
    req_y = y
    req_z = z

    cache_key = f"{canonical_id}:{date_str}:{req_z}:{req_y}:{req_x}"
    if cache_key in TILE_CACHE:
        return TILE_CACHE[cache_key]

    matrix_set = layer_info.get("matrix_set", "GoogleMapsCompatible_Level9")
    url = (
        f"https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{canonical_id}/default/"
        f"{date_str}/{matrix_set}/{req_z}/{req_y}/{req_x}.jpg"
    )

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, headers={"User-Agent": "TERRAVOX-Satellite-Intelligence/3.4"})
            if resp.status_code == 200 and resp.content and len(resp.content) > 100:
                if len(TILE_CACHE) < MAX_TILE_CACHE_SIZE:
                    TILE_CACHE[cache_key] = resp.content
                return resp.content
            else:
                logger.debug("NASA GIBS tile returned HTTP %s for %s", resp.status_code, url)
                return None
    except Exception as exc:
        logger.debug("NASA GIBS tile fetch error: %s", exc)
        return None
