"""Comprehensive test suite for TERRAVOX 3.4 Satellite Evidence Pipeline & Validation Engine."""
import pytest
from app.services.firms_service import (
    haversine_distance_km,
    is_inside_california,
    flag_artificial_heat,
    _parse_iso_utc,
    _parse_firms_csv,
    fetch_firms_california,
)
from app.services.satellite_correlation import (
    calculate_matching_heuristic,
    classify_correlation,
    parse_timestamp_iso,
    get_auditable_validation_cases,
    correlate_incident,
)
from app.services.satellite_imagery_service import (
    get_layer_catalog,
    generate_worldview_url,
    generate_firms_map_url,
)


def test_haversine_distance_known_benchmarks():
    """Verify WGS-84 Haversine geodesic distance calculation."""
    # Sacramento (38.5816, -121.4944) to San Francisco (37.7749, -122.4194) ~121 km
    d = haversine_distance_km(-121.4944, 38.5816, -122.4194, 37.7749)
    assert 118.0 <= d <= 125.0, f"Expected ~121 km, got {d}"

    # Same point distance must be 0.0
    d0 = haversine_distance_km(-120.0, 38.0, -120.0, 38.0)
    assert d0 == 0.0


def test_is_inside_california_bounds():
    """Verify California geographic boundary validation."""
    assert is_inside_california(-121.5, 38.5) is True  # Sacramento
    assert is_inside_california(-122.2, 40.5) is True  # Redding
    assert is_inside_california(-118.2, 34.0) is True  # Los Angeles
    assert is_inside_california(108.0, 14.0) is False   # Vietnam rejected
    assert is_inside_california(-74.0, 40.7) is False   # New York rejected


def test_flag_artificial_heat_sources():
    """Verify artificial heat emitters (Sacramento Airport, Travis AFB) are flagged."""
    hotspots = [
        {"latitude": 38.6954, "longitude": -121.5908, "brightness": 340.0},  # Exactly at SMF runway
        {"latitude": 39.8140, "longitude": -121.4390, "brightness": 350.0},  # Pulga / Feather River Canyon
    ]
    flagged = flag_artificial_heat(hotspots)
    assert flagged[0]["suspect_artificial"] is True
    assert "Sacramento International Airport" in flagged[0]["artificial_source"]["name"]
    assert flagged[1]["suspect_artificial"] is False


def test_parse_iso_utc():
    """Verify conversion of NASA FIRMS YYYY-MM-DD and HHMM to UTC datetime."""
    dt = _parse_iso_utc("2026-10-24", "1013")
    assert dt is not None
    assert dt.year == 2026 and dt.month == 10 and dt.day == 24
    assert dt.hour == 10 and dt.minute == 13
    assert dt.tzname() == "UTC"

    # Edge cases
    assert _parse_iso_utc("", "1200") is None
    assert _parse_iso_utc("2026-10-24", "730") is not None  # 3 digits zfill to 0730


def test_parse_firms_csv_preserves_attributes():
    """Verify CSV parser preserves all original remote-sensing fields without synthetic data."""
    sample_csv = (
        "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_ti5,frp,daynight\n"
        "39.758,-121.786,345.6,0.4,0.38,2026-10-24,1013,N,nominal,2.0NRT,290.5,12.4,N\n"
        "38.5,-121.5,310.0,0.5,0.45,2026-10-24,2130,N20,high,2.0NRT,285.0,4.5,D\n"
    )
    fires = _parse_firms_csv(sample_csv)
    assert len(fires) == 2

    f0 = fires[0]
    assert f0["latitude"] == 39.758
    assert f0["longitude"] == -121.786
    assert f0["brightness"] == 345.6
    assert f0["bright_ti5"] == 290.5
    assert f0["frp"] == 12.4
    assert f0["scan"] == 0.4
    assert f0["track"] == 0.38
    assert f0["satellite"] == "Suomi-NPP"
    assert f0["instrument"] == "VIIRS 375m"
    assert f0["confidence"] == "nominal"
    assert f0["daynight"] == "N"
    assert f0["acq_datetime_utc"] == "2026-10-24T10:13:00+00:00"

    f1 = fires[1]
    assert f1["satellite"] == "NOAA-20 (JPSS-1)"
    assert f1["confidence"] == "high"


def test_matching_heuristic_score():
    """Verify matching heuristic formula calculation and documentation."""
    res_close = calculate_matching_heuristic(
        distance_km=1.0,
        time_diff_hours=2.0,
        radius_km=10.0,
        time_window_hours=48.0,
        confidence="high",
        instrument="VIIRS 375m",
    )
    # dist factor = 1 - 1/10 = 0.9; time factor = 1 - 2/48 = 0.958; weights = 1.0 * 1.0
    # score ~ 86.2
    assert 80.0 <= res_close["score"] <= 90.0
    assert "Heuristic Proximity Score" in res_close["formula_description"]
    assert "does not calculate the probability" in res_close["scientific_disclaimer"]

    # Distant point must have score 0
    res_far = calculate_matching_heuristic(
        distance_km=15.0,
        time_diff_hours=2.0,
        radius_km=10.0,
        time_window_hours=48.0,
        confidence="high",
        instrument="VIIRS 375m",
    )
    assert res_far["score"] == 0.0


def test_classify_correlation_states():
    """Verify 5-tier classification logic for correlation outcomes."""
    # 1. Correlated state
    st_corr, exp_corr = classify_correlation(
        matches_in_window=[{
            "satellite": "Suomi-NPP", "instrument": "VIIRS 375m",
            "distance_km": 1.2, "time_difference_hours": 3.0, "confidence": "high",
        }],
        closest_distance_km=1.2,
        radius_km=10.0,
        time_window_hours=48.0,
        is_final=False,
    )
    assert st_corr == "CORRELATED"
    assert "correlated" in exp_corr.lower()

    # 2. Possible match state (further away)
    st_poss, _ = classify_correlation(
        matches_in_window=[{
            "satellite": "Suomi-NPP", "instrument": "VIIRS 375m",
            "distance_km": 8.5, "time_difference_hours": 35.0, "confidence": "low",
        }],
        closest_distance_km=8.5,
        radius_km=10.0,
        time_window_hours=48.0,
        is_final=False,
    )
    assert st_poss == "POSSIBLE_MATCH"

    # 3. Pending corroboration state (active fire, 0 matches)
    st_pend, exp_pend = classify_correlation(
        matches_in_window=[],
        closest_distance_km=None,
        radius_km=10.0,
        time_window_hours=48.0,
        is_final=False,
    )
    assert st_pend == "PENDING_CORROBORATION"
    assert "overpasses occur 2–4 times" in exp_pend

    # 4. Unmatched state (final fire, 0 matches)
    st_unm, exp_unm = classify_correlation(
        matches_in_window=[],
        closest_distance_km=None,
        radius_km=10.0,
        time_window_hours=48.0,
        is_final=True,
    )
    assert st_unm == "UNMATCHED"

    # 5. Data unavailable state
    st_unav, _ = classify_correlation(
        matches_in_window=[],
        closest_distance_km=None,
        radius_km=10.0,
        time_window_hours=48.0,
        feed_status="UNAVAILABLE",
    )
    assert st_unav == "DATA_UNAVAILABLE"


def test_auditable_validation_cases():
    """Verify validation suite contains positive, pending, and negative control cases."""
    cases = get_auditable_validation_cases()
    assert len(cases) >= 5

    types = {c["type"] for c in cases}
    assert "CURRENT_LIVE_INCIDENT" in types
    assert "HISTORICAL_BENCHMARK" in types
    assert "NEGATIVE_CONTROL" in types

    neg = [c for c in cases if c["type"] == "NEGATIVE_CONTROL"][0]
    assert neg["expected_outcome"] == "UNMATCHED"


def test_satellite_layers_catalog():
    """Verify layer catalog provides Category B and C optical products."""
    layers = get_layer_catalog()
    assert len(layers) >= 3

    ids = {l["id"] for l in layers}
    assert "VIIRS_NOAA20_CorrectedReflectance_TrueColor" in ids
    assert "MODIS_Terra_CorrectedReflectance_TrueColor" in ids
    assert "MODIS_Terra_CorrectedReflectance_Bands721" in ids

    for l in layers:
        assert l["status"] == "ACCESSIBLE"
        assert "spatial_resolution" in l
        assert l["category"] in ("B", "C")


def test_worldview_and_firms_urls():
    """Verify NASA Worldview and FIRMS map viewer deep link generators."""
    wv = generate_worldview_url(-121.5, 39.8, "2026-10-24")
    assert "https://worldview.earthdata.nasa.gov/" in wv
    assert "-121.5" in wv or "-122" in wv
    assert "2026-10-24" in wv

    fm = generate_firms_map_url(-121.5, 39.8, "2026-10-24")
    assert "https://firms.modaps.eosdis.nasa.gov/map/" in fm
    assert "2026-10-24" in fm


def test_haversine_input_bounds_validation():
    """Verify haversine_distance_km validates geographic domain [-90, 90] for latitudes."""
    with pytest.raises(ValueError, match="Latitude out of bounds"):
        haversine_distance_km(0.0, 95.0, 0.0, 0.0)
    with pytest.raises(ValueError, match="Latitude out of bounds"):
        haversine_distance_km(0.0, 0.0, 0.0, -91.0)


def test_parse_firms_csv_preserves_null_fields():
    """Verify CSV parser preserves None when confidence or daynight are omitted."""
    csv_missing_fields = (
        "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,daynight\n"
        "39.5,-121.5,330.0,0.4,0.4,2026-10-24,1200,N,,\n"
    )
    fires = _parse_firms_csv(csv_missing_fields)
    assert len(fires) == 1
    assert fires[0]["confidence"] is None, "Missing confidence must be None, not fabricated"
    assert fires[0]["daynight"] is None, "Missing daynight must be None, not fabricated"


@pytest.mark.asyncio
async def test_historical_incident_nrt_separation():
    """Verify historical incidents older than 7 days return DATA_UNAVAILABLE rather than querying live NRT."""
    # Park Fire ignition: July 24, 2024
    res = await correlate_incident(
        incident_coords=[-121.786, 39.758],
        incident_name="Park Fire",
        incident_started_at="2024-07-24T15:15:00Z",
        radius_km=10.0,
        time_window_hours=48.0,
    )
    assert res["correlation_status"] == "DATA_UNAVAILABLE"
    assert res["feed_metadata"]["status"] == "HISTORICAL_ARCHIVE_REQUIRED"
    assert "outside the rolling NASA FIRMS NRT feed window" in res["correlation_explanation"]
    assert res["matched_detections_count"] == 0


def test_tile_endpoint_zoom_bounds():
    """Verify tile proxy rejects zoom levels exceeding layer max_zoom (9) with HTTP 400."""
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    resp = client.get("/api/satellite/gibs-tile/viirs_noaa20_truecolor/2026-10-24/10/500/500.jpg")
    assert resp.status_code == 400
    assert "out of bounds for layer" in resp.json()["detail"]

