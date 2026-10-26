"""Unit and integration tests for the TERRAVOX California Wildland Environmental Sensitivity & Response Simulator."""
import json
import pytest
from app.services.simulation_engine import (
    calculate_vpd,
    calculate_m100,
    calculate_danger_index,
    get_county_profile,
    evaluate_intervention,
    run_what_if_simulation,
    compare_scenarios
)
from app.database import Base, engine, SessionLocal
from app.models.predictive import Simulation


def test_tetens_vpd_calculation():
    """Verify Tetens formulation calculates physical vapor pressure deficit (kPa)."""
    # At 30°C and 20% RH, air is hot and dry -> high VPD
    vpd_dry = calculate_vpd(temp_c=30.0, rh_pct=20.0)
    assert vpd_dry > 3.0, f"Expected VPD > 3.0 kPa for 30C/20%RH, got {vpd_dry}"

    # At 20°C and 80% RH, air is moist -> low VPD
    vpd_moist = calculate_vpd(temp_c=20.0, rh_pct=80.0)
    assert vpd_moist < 0.8, f"Expected VPD < 0.8 kPa for 20C/80%RH, got {vpd_moist}"

    # VPD must never be negative
    assert calculate_vpd(temp_c=10.0, rh_pct=100.0) == 0.0


def test_simard_m100_fuel_moisture():
    """Verify dead fuel moisture response across dry, moderate, and wet conditions."""
    m_arid = calculate_m100(temp_c=38.0, rh_pct=8.0, rain_7d_mm=0.0)
    m_moderate = calculate_m100(temp_c=24.0, rh_pct=35.0, rain_7d_mm=0.0)
    m_wet = calculate_m100(temp_c=15.0, rh_pct=75.0, rain_7d_mm=25.0)

    assert m_arid < m_moderate < m_wet
    assert m_arid >= 3.0  # Physical minimum clamp
    assert m_wet > 15.0   # Substantial rain bonus


def test_danger_index_determinism_and_monotonicity():
    """Verify deterministic calculations and monotonic response to worsening conditions."""
    # Run twice with identical inputs
    r1 = calculate_danger_index(temp_c=32.0, rh_pct=15.0, wind_mph=25.0, rain_7d_mm=0.0, m100=5.0, vpd=3.8)
    r2 = calculate_danger_index(temp_c=32.0, rh_pct=15.0, wind_mph=25.0, rain_7d_mm=0.0, m100=5.0, vpd=3.8)

    assert r1["danger_score"] == r2["danger_score"]
    assert r1["risk_band"] == r2["risk_band"]
    assert r1["components"] == r2["components"]

    # Mild baseline vs Severe scenario
    mild = calculate_danger_index(temp_c=20.0, rh_pct=50.0, wind_mph=8.0, rain_7d_mm=10.0, m100=14.0, vpd=1.1)
    severe = calculate_danger_index(temp_c=38.0, rh_pct=12.0, wind_mph=35.0, rain_7d_mm=0.0, m100=4.5, vpd=4.5)

    assert severe["danger_score"] > mild["danger_score"] + 30
    assert severe["risk_band"] in ["VERY_HIGH", "EXTREME"]
    assert mild["risk_band"] in ["LOW", "MODERATE"]


def test_california_county_profiles_and_sectors():
    """Verify county profiles exist with realistic terrain and fuel classifications."""
    for cid in ["butte", "sonoma", "los-angeles-ventura", "plumas"]:
        prof = get_county_profile(cid)
        assert prof["id"] == cid
        assert len(prof["sectors"]) >= 2
        for sector in prof["sectors"]:
            assert "elevation_m" in sector
            assert "vulnerability_multiplier" in sector
            assert sector["vulnerability_multiplier"] >= 1.0


def test_intervention_mitigation_evaluation():
    """Verify intervention catalog evaluates quantitative and qualitative consequences."""
    baseline = evaluate_intervention("No intervention", raw_score=75)
    assert baseline["danger_score_delta"] == 0
    assert baseline["mitigated_score"] == 75

    staged = evaluate_intervention("Pre-position team", raw_score=75)
    assert staged["danger_score_delta"] < 0
    assert staged["mitigated_score"] < 75
    assert staged["estimated_response_time_delta_minutes"] < 0

    aerial = evaluate_intervention("Aerial reconnaissance standby", raw_score=80)
    assert aerial["mitigated_score"] <= 65
    assert "fixed-wing drops" in aerial["assumptions"].lower()


def test_full_simulation_pipeline_end_to_end():
    """Verify end-to-end simulation returns all required structured fields."""
    db = SessionLocal()
    try:
        request = {
            "scenario": "Diablo Wind Surge",
            "county": "Butte County",
            "baseline_temp_c": 26.0,
            "baseline_rh_pct": 28.0,
            "baseline_wind_mph": 12.0,
            "baseline_rain_7d_mm": 0.0,
            "params": {
                "heat_c": 8.0,
                "wind_delta_mph": 18.0,
                "rh_drop_pct": 16.0,
                "road_closure_h": 24.0,
                "intervention": "Pre-position team"
            }
        }
        res = run_what_if_simulation(db, request)

        assert "simulation_id" in res
        assert res["status"] == "COMPLETED"
        assert res["geographic_area"]["county_id"] == "butte"
        assert res["baseline_output"]["danger_score"] < res["scenario_output"]["danger_score"]

        # Differences
        diffs = res["output_differences"]
        assert diffs["danger_index_delta"] > 0
        assert len(diffs["primary_drivers"]) >= 1

        # Sector sensitivities
        sectors = res["sectors_warranting_investigation"]
        assert len(sectors) == 4
        assert sectors[0]["scenario_score"] >= sectors[-1]["scenario_score"]

        # Limitations & model provenance
        meta = res["model_metadata"]
        assert "v2.2-california-pilot" in meta["model_version"]
        assert "NOT AN OPERATIONAL WEATHER FORECAST" in meta["limitations_and_warnings"][0]
        assert len(res["recommended_verification_steps"]) >= 2
    finally:
        db.close()


def test_scenario_comparison_batch():
    """Verify batch comparison evaluates multiple scenario configurations."""
    scenarios = [
        {"name": "Scenario 1 (Mild)", "temp_c": 22.0, "rh_pct": 45.0, "wind_mph": 10.0},
        {"name": "Scenario 2 (Severe)", "temp_c": 36.0, "rh_pct": 14.0, "wind_mph": 28.0}
    ]
    comp = compare_scenarios(scenarios)
    assert comp["scenarios_count"] == 2
    assert comp["comparison"][0]["danger_score"] < comp["comparison"][1]["danger_score"]
