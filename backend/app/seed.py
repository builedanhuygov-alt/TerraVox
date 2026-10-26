"""California Pilot seed — 58 California counties, WUI sectors, water assets, and historical fire warnings."""
import json
import os
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.administrative import AdministrativeUnit
from app.models.query_log import AutomationStatus
from app.core.enums import AdministrativeLevel


def _data_path(name: str) -> str:
    return os.path.join(os.path.dirname(__file__), "data", name)


_CALIFORNIA_COUNTIES_CACHE: dict | None = None


def _load_california_counties() -> dict:
    global _CALIFORNIA_COUNTIES_CACHE
    if _CALIFORNIA_COUNTIES_CACHE is None:
        p = _data_path("california_counties.geojson")
        if not os.path.exists(p):
            # fallback to public/data if not yet copied
            p = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "public", "data", "california_counties.geojson"))
        with open(p, encoding="utf-8") as f:
            _CALIFORNIA_COUNTIES_CACHE = json.load(f)
    return _CALIFORNIA_COUNTIES_CACHE


def _point_in_ring(lon: float, lat: float, ring) -> bool:
    inside = False
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i][0], ring[i][1]
        x2, y2 = ring[(i + 1) % n][0], ring[(i + 1) % n][1]
        if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1 + 1e-12) + x1:
            inside = not inside
    return inside


def _geom_contains(geom: dict, lon: float, lat: float) -> bool:
    polys = [geom["coordinates"]] if geom.get("type") == "Polygon" else geom.get("coordinates", [])
    for poly in polys:
        if poly and _point_in_ring(lon, lat, poly[0]):
            return True
    return False


CALIFORNIA_WATER_ASSETS = [
    ("Lake Oroville", "hydro", -121.4600, 39.5400, "Butte County", 4363500000, 6400.0, "California Department of Water Resources", True, True, "verified"),
    ("Shasta Lake", "hydro", -122.3700, 40.7200, "Shasta County", 5615000000, 12000.0, "US Bureau of Reclamation", True, True, "verified"),
    ("Folsom Lake", "hydro", -121.1500, 38.7000, "Sacramento County", 1205000000, 4630.0, "US Bureau of Reclamation", True, True, "verified"),
    ("New Melones Lake", "hydro", -120.5200, 37.9500, "Calaveras County", 2985000000, 5060.0, "US Bureau of Reclamation", True, False, "verified"),
    ("San Luis Reservoir", "reservoir", -121.0700, 37.0600, "Merced County", 2518000000, 5140.0, "California DWR / USBR", True, True, "verified"),
    ("Lake Berryessa", "reservoir", -122.2400, 38.5900, "Napa County", 1976000000, 8400.0, "Solano County Water Agency", True, True, "verified"),
    ("Don Pedro Reservoir", "reservoir", -120.4000, 37.7100, "Tuolumne County", 2504000000, 5240.0, "Turlock & Modesto Irrigation Districts", True, False, "verified"),
    ("Lake Tahoe (CA Basin)", "lake", -120.0400, 39.0900, "Placer County", 185000000000, 49500.0, "USFS / Tahoe Regional Planning Agency", True, True, "verified"),
    ("Clear Lake", "lake", -122.7700, 39.0200, "Lake County", 1425000000, 17700.0, "Lake County Water Resources Dept", True, True, "verified"),
    ("Trinity Lake", "reservoir", -122.7900, 40.8000, "Trinity County", 3019000000, 6690.0, "US Bureau of Reclamation", True, False, "verified"),
    ("Castaic Lake", "reservoir", -118.6100, 34.5200, "Los Angeles County", 400000000, 910.0, "California Department of Water Resources", True, True, "verified"),
    ("Diamond Valley Lake", "reservoir", -117.0200, 33.6900, "Riverside County", 990000000, 1820.0, "Metropolitan Water District of Southern California", True, True, "verified"),
    ("Thermalito Forebay", "reservoir", -121.6100, 39.5200, "Butte County", 14400000, 250.0, "California Department of Water Resources", True, False, "verified"),
    ("Paradise Lake", "reservoir", -121.5700, 39.8100, "Butte County", 14200000, 100.0, "Paradise Irrigation District", True, False, "verified"),
    ("Magalia Reservoir", "reservoir", -121.5800, 39.8200, "Butte County", 3400000, 40.0, "Paradise Irrigation District", True, False, "verified"),
    ("Lake Almanor", "reservoir", -121.1700, 40.2300, "Plumas County", 1409000000, 11400.0, "Pacific Gas and Electric Company", True, True, "verified"),
]


def purge_legacy_vietnam_data(db: Session):
    """Purge legacy Gia Lai / Vietnam entities from active database tables."""
    from app.models.water import WaterAsset
    from app.models.fire import OfficialFireWarning
    from app.models.administrative import AdministrativeUnit as AU

    # Delete legacy warnings
    db.query(OfficialFireWarning).filter(
        (OfficialFireWarning.source.like("%Gia Lai%")) |
        (OfficialFireWarning.source.like("%Dân trí%")) |
        (OfficialFireWarning.source.like("%VOV%")) |
        (OfficialFireWarning.source.like("%Tiền Phong%"))
    ).delete(synchronize_session=False)

    # Delete legacy water assets
    db.query(WaterAsset).filter(
        (WaterAsset.province != "California") |
        (WaterAsset.longitude > 0)
    ).delete(synchronize_session=False)

    # Delete legacy administrative units
    db.query(AU).filter(
        (AU.code.like("GL%")) |
        (AU.name.like("%Gia Lai%")) |
        (AU.name.like("Xã %")) |
        (AU.name.like("Thôn %")) |
        (AU.centroid_lng > 0)
    ).delete(synchronize_session=False)

    db.commit()


def seed_california_counties(db: Session | None = None) -> dict:
    """Upsert California State + 58 Official California Counties + Butte County WUI Sectors."""
    from app.models.administrative import AdministrativeUnit as AU
    close = False
    if db is None:
        db = SessionLocal()
        close = True
    try:
        purge_legacy_vietnam_data(db)

        # State of California
        state = db.query(AU).filter_by(code="CA").first()
        if state is None:
            state = AU(name="California", level=AdministrativeLevel.PROVINCE.value, code="CA", is_demo=False)
            db.add(state)
            db.flush()

        existing = {u.code: u for u in db.query(AU).filter(AU.code.like("CA-%")).all()}
        geojson_data = _load_california_counties()
        added = 0

        for feat in geojson_data.get("features", []):
            props = feat.get("properties", {}) or {}
            c_id = props.get("id") or props.get("name", "").lower()
            code = f"CA-{c_id.upper()}"
            name = props.get("fullName") or f"{props.get('name')} County"
            if code in existing:
                continue

            u = AU(name=name, level=AdministrativeLevel.COMMUNE.value, parent_id=state.id, code=code, is_demo=False)
            geom = feat.get("geometry")
            if geom:
                try:
                    u.set_geometry(geom)
                except Exception:
                    pass
            db.add(u)
            existing[code] = u
            added += 1

        db.flush()

        # Seed key WUI sectors under Butte County (pilot operational zone)
        butte = existing.get("CA-BUTTE")
        if butte:
            wui_sectors = [
                ("Paradise WUI Sector 1", "CA-BUTTE-PARADISE", -121.60, 39.75),
                ("Magalia WUI Sector 2", "CA-BUTTE-MAGALIA", -121.58, 39.81),
                ("Concow / Pulga Corridor", "CA-BUTTE-CONCOW", -121.51, 39.78),
                ("Berry Creek WUI Sector", "CA-BUTTE-BERRYCREEK", -121.41, 39.65),
                ("Cohasset Ridge WUI", "CA-BUTTE-COHASSET", -121.72, 39.92),
                ("Forbestown Interface", "CA-BUTTE-FORBESTOWN", -121.26, 39.51),
            ]
            for sec_name, sec_code, slng, slat in wui_sectors:
                if sec_code not in existing:
                    sector_geom = {
                        "type": "Polygon",
                        "coordinates": [[[slng - 0.04, slat - 0.04], [slng + 0.04, slat - 0.04],
                                         [slng + 0.04, slat + 0.04], [slng - 0.04, slat + 0.04],
                                         [slng - 0.04, slat - 0.04]]]
                    }
                    sec_u = AU(name=sec_name, level=AdministrativeLevel.VILLAGE.value,
                               parent_id=butte.id, code=sec_code, is_demo=False)
                    sec_u.set_geometry(sector_geom)
                    db.add(sec_u)
                    existing[sec_code] = sec_u
                    added += 1

        db.commit()
        print(f"[seed] California administrative units: +{added} new, {len(existing)} total")
        return {code: u.id for code, u in existing.items()}
    finally:
        if close:
            db.close()


def seed_california_historical_fires(code_by_unit: dict | None = None):
    """Seed real California historical wildfire warnings."""
    from app.models.fire import OfficialFireWarning
    from app.models.administrative import AdministrativeUnit as AU
    db: Session = SessionLocal()
    try:
        if code_by_unit is None:
            code_by_unit = seed_california_counties(db)

        butte = db.query(AU).filter_by(code="CA-BUTTE").first()
        plumas = db.query(AU).filter_by(code="CA-PLUMAS").first()
        sonoma = db.query(AU).filter_by(code="CA-SONOMA").first()
        la = db.query(AU).filter_by(code="CA-LOS ANGELES").first()
        state = db.query(AU).filter_by(code="CA").first()

        default_unit_id = butte.id if butte else (state.id if state else "CA-BUTTE")

        items = [
            dict(
                unit_id=butte.id if butte else default_unit_id,
                level="V",
                source="CAL FIRE / Butte County Fire Dept",
                issued=datetime(2018, 11, 8, 6, 33),
                scope="November 2018 Camp Fire (153,336 acres, Paradise/Magalia/Concow WUI corridor, Butte County). Extreme rate of spread driven by NE Diablo wind event and critical fuel moisture."
            ),
            dict(
                unit_id=plumas.id if plumas else default_unit_id,
                level="V",
                source="CAL FIRE / USFS InciWeb",
                issued=datetime(2021, 7, 13, 17, 15),
                scope="July-October 2021 Dixie Fire (963,309 acres across Butte, Plumas, Lassen, Tehama, and Shasta counties). Largest single non-complex wildfire in California history."
            ),
            dict(
                unit_id=sonoma.id if sonoma else default_unit_id,
                level="IV",
                source="CAL FIRE Sonoma-Lake-Napa Unit",
                issued=datetime(2019, 10, 23, 21, 27),
                scope="October-November 2019 Kincade Fire (77,758 acres, Geyserville/Alexander Valley WUI corridor, Sonoma County). Historic offshore wind event prompted mass evacuations."
            ),
            dict(
                unit_id=la.id if la else default_unit_id,
                level="V",
                source="CAL FIRE / Los Angeles County Fire Dept",
                issued=datetime(2018, 11, 8, 14, 24),
                scope="November 2018 Woolsey Fire (96,949 acres, Santa Monica Mountains WUI interface, Los Angeles and Ventura counties). Driven by strong Santa Ana wind event."
            ),
            dict(
                unit_id=butte.id if butte else default_unit_id,
                level="IV",
                source="CAL FIRE Butte Unit",
                issued=datetime(2024, 7, 24, 15, 15),
                scope="July 2024 Park Fire (429,603 acres, Butte and Tehama counties). Rapid upslope spread through fine grass and oak woodland fuel beds."
            ),
        ]

        by_source = {w.source: w for w in db.query(OfficialFireWarning).all()}
        for it in items:
            w = by_source.get(it["source"])
            if w is None:
                db.add(OfficialFireWarning(
                    administrative_unit_id=it["unit_id"],
                    level=it["level"],
                    source=it["source"],
                    issued_at=it["issued"],
                    scope=it["scope"]
                ))
            else:
                w.administrative_unit_id = it["unit_id"]
                w.level = it["level"]
                w.issued_at = it["issued"]
                w.scope = it["scope"]

        db.commit()
        print(f"[seed] California historical wildfire warnings seeded: {len(items)}")
    finally:
        db.close()


def seed_california_water_assets(db: Session | None = None) -> int:
    """Upsert verified California reservoirs and water assets."""
    from app.models.water import WaterAsset
    from app.models.administrative import AdministrativeUnit as AU
    close = False
    if db is None:
        db = SessionLocal()
        close = True
    try:
        existing = {w.name: w for w in db.query(WaterAsset).all()}
        counties = [(u.code, u.name, u.geometry_dict()) for u in
                    db.query(AU).filter_by(level=AdministrativeLevel.COMMUNE.value).all()]

        n = 0
        for (name, atype, lon, lat, county_name, cap, area, manager, road, sv, status) in CALIFORNIA_WATER_ASSETS:
            code = None
            for c_code, c_name, geom in counties:
                try:
                    if geom and _geom_contains(geom, lon, lat):
                        code = c_code
                        break
                except Exception:
                    continue

            w = existing.get(name)
            if w is None:
                db.add(WaterAsset(
                    name=name, asset_type=atype, longitude=lon, latitude=lat,
                    commune=None, district=county_name, province="California",
                    capacity_m3=cap, water_area_ha=area, manager=manager,
                    road_access=bool(road), status=status,
                    google_maps_url=None, has_streetview=bool(sv),
                    commune_code=code
                ))
                n += 1
            else:
                w.province = "California"
                w.longitude = lon
                w.latitude = lat
                w.district = county_name
                w.commune_code = w.commune_code or code
                w.capacity_m3 = cap
                w.water_area_ha = area
                w.manager = manager
                w.road_access = bool(road)
                w.status = status

        db.commit()
        print(f"[seed] California water assets: +{n} new")
        return n
    finally:
        if close:
            db.close()


def seed_demo():
    """Seed California pilot operational dataset."""
    db: Session = SessionLocal()
    try:
        codes = seed_california_counties(db)
        seed_california_historical_fires(codes)
        seed_california_water_assets(db)

        # Automation status
        if not db.query(AutomationStatus).first():
            db.add(AutomationStatus(agent_name="ForestGuard", status="ONLINE"))
            db.add(AutomationStatus(agent_name="EarthEngine", status="ONLINE"))

        # Monitored areas (California Pilot Priority)
        from app.models.ops import MonitoredArea
        from app.models.administrative import AdministrativeUnit as AU
        butte = db.query(AU).filter_by(code="CA-BUTTE").first()
        if butte:
            existing_ma = db.query(MonitoredArea).filter_by(administrative_unit_id=butte.id).first()
            if not existing_ma:
                db.add(MonitoredArea(
                    administrative_unit_id=butte.id,
                    is_priority=True,
                    priority_reason="California Pilot Priority WUI Sector — High Wildfire Hazard Potential (CAL FIRE SRA / Butte Unit)"
                ))

        db.commit()
        print("[seed] California pilot operational environment successfully initialized.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo()
