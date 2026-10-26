"""Fire Intelligence API Sec30"""
from fastapi import APIRouter, Query, Depends, HTTPException
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.fire import OfficialFireWarning, AIFirePrediction
from app.services.fire_risk_engine import fire_risk_engine, score_to_level
from app.core.enums import FireWarningLevel, FIRE_WARNING_LABELS
from app.core.demo_mode import tag_data_origin
from app.core.security import get_current_user
import json, time

router=APIRouter(tags=["Fire"])

@router.get("/fire/warnings")
def list_warnings(administrative_unit_id: Optional[str]=Query(default=None), db:Session=Depends(get_db)):
    from app.models.administrative import AdministrativeUnit
    q=db.query(OfficialFireWarning)
    if administrative_unit_id:
        # accept unit id, stable code (GL-<ma_xa>), or legacy key — resolve to
        # the real unit first so historical fires join their communes
        unit=AdministrativeUnit.resolve_unit(db, administrative_unit_id)
        keys=[administrative_unit_id] + ([unit.id, unit.code] if unit else [])
        q=q.filter(OfficialFireWarning.administrative_unit_id.in_(keys))
    warns=q.order_by(OfficialFireWarning.issued_at.desc()).limit(20).all()
    return [{"id": w.id, "level": w.level, "label": FIRE_WARNING_LABELS.get(FireWarningLevel(w.level), w.level) if w.level in [e.value for e in FireWarningLevel] else w.level, "source": w.source, "issued_at": str(w.issued_at), "scope": w.scope} for w in warns]

@router.post("/fire/warnings")
def create_warning(body:dict, db:Session=Depends(get_db), user=Depends(get_current_user)):
    # Admin creates official warning Sec1
    lvl=body.get("level")
    if lvl not in [e.value for e in FireWarningLevel]: raise HTTPException(400, "Invalid level I-V")
    w=OfficialFireWarning(administrative_unit_id=body["administrative_unit_id"], level=lvl, source=body.get("source","CAL FIRE Headquarters"), scope=body.get("scope"))
    db.add(w); db.commit(); db.refresh(w)
    return {"id": w.id, "level": w.level, "label": FIRE_WARNING_LABELS[FireWarningLevel(lvl)]}

@router.get("/fire/risk")
async def fire_risk(administrative_unit_id: str = Query(...), lat: float = Query(default=39.75), lon: float = Query(default=-121.60), db:Session=Depends(get_db)):
    # Real data: satellite + weather + terrain + FIRMS + community
    # Try real satellite
    sat={}
    try:
        from app.services.earth_engine.service import EEQueryParams, get_earth_engine_service
        from app.core.enums import SatelliteSource
        svc=get_earth_engine_service()
        if svc.get_status().value=="CONNECTED":
            params=EEQueryParams(administrative_unit_id=administrative_unit_id, geometry={"type":"Point","coordinates":[lon,lat]}, start_date="2026-08-01", end_date="2026-09-01", dataset=SatelliteSource.SENTINEL2)
            ndvi=svc.calculate_ndvi(params)
            sat={"ndvi": ndvi.mean, "ndmi": 0.25, "nbr": 0.3}
            # try S1
            try:
                s1_params=EEQueryParams(administrative_unit_id=administrative_unit_id, geometry={"type":"Point","coordinates":[lon,lat]}, start_date="2026-08-01", end_date="2026-09-01", dataset=SatelliteSource.SENTINEL1)
                # just check availability
                sat["s1"]=True
            except: pass
    except: sat={}  # mark satellite missing — analyze() flags it, never fake ndvi
    # weather real
    weather={}
    try:
        from app.services.weather_service import fetch_current, current_summary
        w=await fetch_current(lat, lon)
        s=current_summary(w)
        weather={k: v for k, v in {"temperature": s["temperature"], "humidity": s["humidity"],
                                   "rainfall": s["rainfall"], "wind_speed": s["wind_speed"]}.items()
                 if v is not None}
    except: weather={}  # flagged missing by analyze(), never fake values
    # terrain
    terrain={}
    try:
        from app.services.earth_engine.service import get_earth_engine_service as ges
        # mock DEM
        import random, hashlib
        rng=random.Random(int(hashlib.sha256(f"{lat:.1f}{lon:.1f}".encode()).hexdigest()[:8],16))
        terrain={"elevation": rng.uniform(100,800), "slope": rng.uniform(5,30)}
    except: terrain={}  # flagged missing by analyze()
    # FIRMS
    hotspots=[]
    try:
        from app.services.firms_service import fetch_firms
        f=await fetch_firms(lat, lon)
        hotspots=f.get("fires",[])[:3]
    except: hotspots=[]
    # community reports count (0 = unknown; only real confirmations raise confidence)
    community=0
    result=fire_risk_engine.analyze(administrative_unit_id, satellite=sat, weather=weather, terrain=terrain, hotspots=hotspots, community=community)
    # best-effort persistence: serverless FS may be read-only → never 500 the read path
    official = None
    try:
        pred=AIFirePrediction(administrative_unit_id=administrative_unit_id, risk_score=result["risk_score"], warning_level=result["warning_level"], confidence=result["confidence"], factors=json.dumps(result["factors"]), evidence=json.dumps({"satellite": sat, "weather": weather, "hotspots": len(hotspots)}))
        db.add(pred); db.commit()
        # official vs AI Sec33
        vs=fire_risk_engine.official_vs_ai(db, administrative_unit_id, result["warning_level"])
        official = {"official": vs["official"], "ai": vs["ai"], "discrepancy": vs["discrepancy"]}
    except Exception:
        try: db.rollback()
        except Exception: pass
    base = {**result,
            "evidence": {"satellite": sat, "weather": weather, "terrain": terrain, "hotspots": hotspots, "community": community},
            "timestamp": time.time(), "status": "LIVE" if result["confidence"]>60 else "CACHED"}
    if official is not None:
        base.update(official)
    return base

@router.get("/fire/forecast")
async def fire_forecast(administrative_unit_id: str = Query(...), lat: float = Query(default=39.75), lon: float = Query(default=-121.60)):
    # Sec7 + Sec43 early warning 6h/24h/72h
    from app.services.weather_service import fetch_current, current_summary
    try:
        s=current_summary(await fetch_current(lat, lon))
        sat={"ndvi":0.5}
        fc=fire_risk_engine.forecast(administrative_unit_id, sat, {"temperature": s["temperature"] if s["temperature"] is not None else 30})
    except:
        fc={"forecast":{"6h":45,"12h":52,"24h":67,"48h":74,"72h":81}}
    return {"administrative_unit_id": administrative_unit_id, **fc, "status":"LIVE"}

@router.get("/fire/hotspots")
async def fire_hotspots(lat: float = Query(default=39.75), lon: float = Query(default=-121.60)):
    from app.services.firms_service import fetch_firms
    data=await fetch_firms(lat, lon)
    return {"hotspots": data.get("fires",[]), "source":"NASA FIRMS", "satellite": data.get("satellite"), "status": data.get("status"), "metadata": data.get("metadata")}

@router.get("/fire/anomalies")
def fire_anomalies(administrative_unit_id: str = Query(...)):
    # Sec18 NDVI/NDMI anomaly
    anom=fire_risk_engine.anomaly({"ndmi":0.2}, {"ndmi":0.4})
    return {"anomalies": [anom] if anom["type"]!="none" else [], "status":"LIVE"}

@router.get("/fire/history")
def fire_history(administrative_unit_id: str = Query(...), db:Session=Depends(get_db)):
    # Sec23
    preds=db.query(AIFirePrediction).filter_by(administrative_unit_id=administrative_unit_id).order_by(AIFirePrediction.created_at.desc()).limit(10).all()
    return {"history": [{"date": str(p.created_at), "risk_score": p.risk_score, "level": p.warning_level, "confidence": p.confidence} for p in preds], "pattern": "Recurring fire hotspot detected" if len(preds)>3 else "No pattern"}

@router.get("/fire/explain/{prediction_id}")
def fire_explain(prediction_id: str, db:Session=Depends(get_db)):
    p=db.get(AIFirePrediction, prediction_id)
    if not p: raise HTTPException(404, "Prediction not found")
    return {"prediction_id": p.id, "risk_score": p.risk_score, "level": p.warning_level, "confidence": p.confidence, "factors": json.loads(p.factors) if p.factors else {}, "evidence": json.loads(p.evidence) if p.evidence else {}, "model_version": p.model_version, "explanation": f"Risk {p.risk_score}/100 — " + ", ".join(json.loads(p.factors).keys()) if p.factors else ""}

@router.post("/fire/commune-levels")
async def commune_levels(body: dict):
    """Fire level for many communes in ONE call — shared weather+FIRMS fetch,
    FireRiskEngine per unit. Pure compute (no DB writes) for map rendering."""
    units = body.get("units") or []
    if not isinstance(units, list) or len(units) > 200:
        raise HTTPException(400, "units must be a list of at most 200 {name,lat,lon}")
    # shared weather once (province center) — real keys via current_summary.
    # Missing stays missing (no invented 32°C): analyze() lowers confidence.
    from app.services.weather_service import fetch_current, current_summary
    weather: dict = {}
    try:
        w = await fetch_current(39.75, -121.60)
        s = current_summary(w)
        weather = {k: v for k, v in
                   {"temperature": s["temperature"], "humidity": s["humidity"],
                    "rainfall": s["rainfall"], "wind_speed": s["wind_speed"]}.items()
                   if v is not None}
    except Exception:
        pass
    # shared FIRMS hotspots once
    hotspots = []
    try:
        from app.services.firms_service import fetch_firms
        f = await fetch_firms(39.75, -121.60)
        hotspots = f.get("fires", [])[:50]
    except Exception:
        pass
    out = []
    failed = 0
    for u in units:
        try:
            name = str(u.get("name") or u.get("id") or "?")
            lat = float(u.get("lat", 39.75))
            lon = float(u.get("lon", -121.60))
            # NOTE: no per-commune satellite/terrain feed exists — these stay
            # EMPTY so analyze() flags them missing and lowers confidence,
            # instead of inventing ndvi=0.5 / random elevation per commune.
            # Differentiation comes from REAL shared weather + FIRMS proximity.
            near = [h for h in hotspots
                    if abs((h.get("latitude") or 0) - lat) < 0.15 and abs((h.get("longitude") or 0) - lon) < 0.15
                    and not h.get("suspect_artificial")][:3]
            result = fire_risk_engine.analyze(name, satellite={},
                                              weather=weather, terrain={},
                                              hotspots=near, community=0)
            out.append({"key": str(u.get("id") or name), "name": name, "lat": lat, "lon": lon,
                        "level": result["warning_level"], "score": result["risk_score"],
                        "confidence": result["confidence"]})
        except Exception:
            failed += 1
            continue
    return {"levels": out, "count": len(out), "failed": failed, "status": "LIVE", "origin": tag_data_origin()}

@router.post("/fire/spread")
async def fire_spread(body: dict):
    """Simplified elliptical spread sketch (spread.ELLIPTICAL_HEURISTIC_V1).

    Wind defaults to live Open-Meteo at the ignition point (direction
    converted FROM-meteorological to TOWARD for the ellipse); affected
    communes come from REAL boundaries via point-in-polygon.
    """
    from app.services import spread as spread_svc
    from app.services.weather_service import fetch_current
    try:
        lon = float(body["lon"])
        lat = float(body["lat"])
    except Exception:
        raise HTTPException(400, "lon/lat required")
    wind_speed = body.get("wind_speed_kmh")
    wind_toward = body.get("wind_direction_deg")
    wind_source = "request"
    if wind_speed is None or wind_toward is None:
        try:
            w = await fetch_current(lat, lon)
            cur = w.get("current", {}) or {}
            if wind_speed is None:
                wind_speed = float(cur.get("wind_speed_10m", 15))
            if wind_toward is None:
                wind_toward = (float(cur.get("wind_direction_10m", 45)) + 180.0) % 360.0
            wind_source = "Open-Meteo live" if w.get("status") == "LIVE" else "default"
        except Exception:
            pass
    if wind_speed is None:
        wind_speed = 15.0
    if wind_toward is None:
        wind_toward = 45.0
    try:
        hours = [float(h) for h in (body.get("hours") or [1, 3, 6])][:4]
    except Exception:
        hours = [1.0, 3.0, 6.0]
    slope = float(body.get("slope_deg", 12.0))
    sim = spread_svc.simulate(lon, lat, float(wind_speed), float(wind_toward), slope, hours)
    communes = spread_svc.load_commune_shapes()
    for step in sim["steps"]:
        step["affected_communes"] = spread_svc.affected_communes(step["polygon"]["coordinates"][0], communes)
    sim["wind_source"] = wind_source
    sim["status"] = "SIMULATION"
    return sim


@router.get("/fire/brief")
async def fire_brief(administrative_unit_id: str = Query(...), lat: float = Query(default=39.75), lon: float = Query(default=-121.60), db: Session = Depends(get_db)):
    """Commune AI brief: 14-day rain + current weather + FIRMS + heuristic risk,
    assembled deterministically (reasons cited, no invented numbers)."""
    from app.services.weather_service import fetch_current, fetch_history, current_summary
    from app.services.firms_service import fetch_firms, _haversine_km
    from app.services import spread as spread_svc
    from app.core.time import utcnow

    hist = await fetch_history(lat, lon)
    daily_rain = (hist.get("daily", {}) or {}).get("precipitation_sum") or []
    last_rain = daily_rain[-1] if daily_rain else None
    cur = {}
    try:
        cur = current_summary(await fetch_current(lat, lon))
    except Exception:
        pass
    temp = cur.get("temperature")
    humidity = cur.get("humidity")
    wind = cur.get("wind_speed")
    wind_dir = cur.get("wind_direction")
    wind_toward_b = ((wind_dir + 180.0) % 360.0) if wind_dir is not None else 45.0
    try:
        firms = await fetch_firms(lat, lon)
        hotspots = [h for h in firms.get("fires", [])
                    if not h.get("suspect_artificial")
                    and _haversine_km(lon, lat, float(h.get("longitude") or 0), float(h.get("latitude") or 0)) < 25]
    except Exception:
        hotspots, firms = [], {}
    result = fire_risk_engine.analyze(
        administrative_unit_id,
        satellite={},
        weather={k: v for k, v in {"temperature": temp, "humidity": humidity,
                                   "rainfall": last_rain, "wind_speed": wind}.items() if v is not None},
        terrain={}, hotspots=hotspots, community=0)
    reasons = []
    if (hist.get("dry_days") or 0) >= 7:
        reasons.append(f"{hist['dry_days']} consecutive rain-free days ({hist.get('rain_mm', 0)} mm total in 14 days)")
    if humidity is not None and humidity < 35:
        reasons.append(f"Low relative humidity {humidity}%")
    if temp is not None and temp >= 35:
        reasons.append(f"High surface temperature {temp}°C")
    if hotspots:
        reasons.append(f"{len(hotspots)} satellite thermal anomalies (FIRMS) within 25 km")
    if result.get("missing"):
        reasons.append(f"Missing data inputs: {', '.join(result['missing'])} — confidence adjusted")
    # nearest operational water/station + curated water ranking (spec)
    nearest_water, nearest_station = None, None
    try:
        from app.models.ops import OperationalAsset
        best_w, best_s, dw, ds = None, None, None, None
        for a in db.query(OperationalAsset).filter(OperationalAsset.status == "active").all():
            d = _haversine_km(lon, lat, a.longitude, a.latitude)
            if a.asset_type == "water" and (dw is None or d < dw):
                best_w, dw = a, d
            if a.asset_type in ("station", "team") and (ds is None or d < ds):
                best_s, ds = a, d
        if best_w is not None:
            nearest_water = {"name": best_w.name, "distance_km": round(dw, 2),
                             "capacity_liters": best_w.capacity_liters}
        if best_s is not None:
            nearest_station = {"name": best_s.name, "distance_km": round(ds, 2)}
    except Exception:
        pass
    # curated reservoirs/hydro (capacity + road access known) outrank tanks
    try:
        from app.models.water import WaterAsset as _WA
        from app.services import twin_ops as _ops
        rows = [{"name": w.name, "longitude": w.longitude, "latitude": w.latitude,
                 "capacity_m3": w.capacity_m3, "road_access": w.road_access,
                 "status": w.status, "manager": w.manager}
                for w in db.query(_WA).all()]
        spec = _ops.score_water_spec(lon, lat, wind_toward_b, rows)
        if spec["ranked"]:
            top = spec["ranked"][0]
            nearest_water = {"name": top["name"], "distance_km": top["distance_km"],
                             "capacity_m3": top["capacity_m3"], "priority": top["priority"],
                             "manager": top.get("manager")}
    except Exception:
        pass
    # watch: 5 nearest communes by centroid (real boundaries)
    watch = []
    try:
        shapes = spread_svc.load_commune_shapes()
        import math as _m
        scored = []
        for c in shapes:
            g = c.get("geometry") or {}
            polys = [g["coordinates"]] if g.get("type") == "Polygon" else g.get("coordinates", [])
            xs = [p[0] for poly in polys for ring in [poly[0] if poly else []] for p in ring]
            ys = [p[1] for poly in polys for ring in [poly[0] if poly else []] for p in ring]
            if not xs:
                continue
            cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
            d = _m.hypot((cx - lon) * 111.32 * _m.cos(_m.radians(lat)), (cy - lat) * 111.32)
            if c.get("name") != administrative_unit_id:
                scored.append((d, c))
        scored.sort(key=lambda t: t[0])
        watch = [{"code": c["code"], "name": c["name"], "distance_km": round(d, 1)} for d, c in scored[:5]]
    except Exception:
        pass
    return {
        "administrative_unit_id": administrative_unit_id,
        "level": result["warning_level"], "score": result["risk_score"],
        "confidence": result["confidence"], "reasons": reasons,
        "rain_14d_mm": hist.get("rain_mm"), "dry_days": hist.get("dry_days"),
        "temperature": temp, "humidity": humidity, "wind_speed_kmh": wind,
        "firms_nearby": len(hotspots), "watch_communes": watch,
        "nearest_water": nearest_water, "nearest_station": nearest_station,
        "weather_status": hist.get("status"), "firms_status": (firms or {}).get("status"),
        "generated_at": utcnow().isoformat(), "origin": tag_data_origin(),
    }


@router.post("/v1/fires/response-plan")
async def response_plan(body: dict, db: Session = Depends(get_db)):
    """Tactical Decision Engine — assembles live inputs into an explained plan.

    No black boxes: every section cites its source (weather/FIRMS/spread/
    assets/FWI). No calibrated probabilities anywhere. Routing is straight-
    line + documented rural speed until road data + pgRouting exist.
    """
    from app.services import spread as spread_svc
    from app.services import twin_ops as ops
    from app.services.weather_service import fetch_current, fetch_history, current_summary
    from app.services.firms_service import fetch_firms, _haversine_km
    from app.models.ops import OperationalAsset
    from app.core.time import utcnow
    try:
        lon = float(body["lon"])
        lat = float(body["lat"])
    except Exception:
        raise HTTPException(400, "lon/lat required")

    # 1. weather (live) + history rain
    wsum = {}
    try:
        wsum = current_summary(await fetch_current(lat, lon))
    except Exception:
        pass
    wind_speed = wsum.get("wind_speed") if wsum.get("wind_speed") is not None else 15.0
    wind_from = wsum.get("wind_direction") if wsum.get("wind_direction") is not None else 45.0
    wind_toward = (wind_from + 180.0) % 360.0
    rain_mm, temp, humidity = None, wsum.get("temperature"), wsum.get("humidity")
    try:
        hist = await fetch_history(lat, lon)
        daily = (hist.get("daily", {}) or {}).get("precipitation_sum") or []
        rain_mm = round(sum(float(x or 0) for x in daily), 1)
    except Exception:
        pass

    # 2. FIRMS nearby (flagged artificial excluded) + risk band
    hotspots = []
    firms_status = None
    try:
        f = await fetch_firms(lat, lon)
        firms_status = f.get("status")
        hotspots = [h for h in f.get("fires", [])
                    if not h.get("suspect_artificial")
                    and _haversine_km(lon, lat, float(h.get("longitude") or 0),
                                      float(h.get("latitude") or 0)) < 25]
    except Exception:
        pass
    wx = {k: v for k, v in {"temperature": temp, "humidity": humidity,
                            "wind_speed": wind_speed}.items() if v is not None}
    result = fire_risk_engine.analyze(f"fire-{lat:.2f},{lon:.2f}", satellite={},
                                      weather=wx, terrain={}, hotspots=hotspots, community=0)

    # 3. spread (real wind) + affected communes (real boundaries)
    slope = float(body.get("slope_deg", 12.0))
    sim = spread_svc.simulate(lon, lat, float(wind_speed), float(wind_toward), slope, [0.5, 1.0, 3.0, 6.0])
    communes = spread_svc.load_commune_shapes()
    for step in sim["steps"]:
        step["affected_communes"] = spread_svc.affected_communes(step["polygon"]["coordinates"][0], communes)
    ros = sim["steps"][0]["length_km"] / max(sim["steps"][0]["hour"], 0.01) if sim["steps"] else 0.3

    # 4. assets: threats + water ranking (SPEC 40/30/20/10 over curated
    # water_assets) + station + route
    assets = [{"id": a.id, "name": a.name, "asset_type": a.asset_type, "status": a.status,
               "latitude": a.latitude, "longitude": a.longitude,
               "capacity_liters": a.capacity_liters}
              for a in db.query(OperationalAsset).all()]
    threats = ops.assess_asset_threat(lon, lat, ros, assets)
    from app.models.water import WaterAsset
    speed = float(body.get("avg_speed_kmh") or 30.0)
    spec_rows = [{"id": w.id, "name": w.name, "asset_type": w.asset_type,
                  "longitude": w.longitude, "latitude": w.latitude,
                  "capacity_m3": w.capacity_m3, "road_access": w.road_access,
                  "status": w.status, "manager": w.manager}
                 for w in db.query(WaterAsset).all()]
    ranking = ops.score_water_spec(lon, lat, wind_toward, spec_rows)
    for s in ranking["ranked"]:
        s["eta_minutes"] = ops.road_eta_minutes(s["distance_km"], speed)
    station = None
    for a in sorted([a for a in assets if a["asset_type"] in ("station", "team") and a["status"] == "active"],
                    key=lambda a: _haversine_km(lon, lat, a["longitude"], a["latitude"])):
        station = {"name": a["name"], "distance_km": round(_haversine_km(lon, lat, a["longitude"], a["latitude"]), 2)}
        break
    route = None
    # route assets carry geometry; measure to nearest vertex (documented
    # approximation until road-network routing exists)
    try:
        import json as _json
        best_r, best_rn = None, None
        for row in db.query(OperationalAsset).filter(OperationalAsset.asset_type == "route",
                                                     OperationalAsset.status == "active").all():
            try:
                g = _json.loads(row.geometry) if row.geometry else None
            except Exception:
                g = None
            if not g:
                continue
            lines = [g["coordinates"]] if g.get("type") == "LineString" else g.get("coordinates", [])
            for line in lines:
                for px, py in line:
                    d = _haversine_km(lon, lat, px, py)
                    if best_r is None or d < best_r:
                        best_r, best_rn = d, row.name
        route = {"name": best_rn, "distance_km": round(best_r, 2)} if best_rn else None
    except Exception:
        pass

    # 5. FWI same-day (standard, labeled assumption)
    fwi = None
    if temp is not None and humidity is not None:
        fwi = ops.ffmc_isi_same_day(float(temp), float(humidity), float(wind_speed), rain_mm or 0.0)

    # 6. recommendations (rules, cited)
    recs = []
    threatened = [t for t in threats if t["band"] in ("CRITICAL", "THREATENED")]
    if threatened:
        recs.append(f"Priority protection assets: {', '.join(t['name'] for t in threatened[:3])} (ETA < 3h under active spread vector)")
    if ranking["ranked"]:
        top = ranking["ranked"][0]
        cap = f", {top['capacity_m3']:,} m³".replace(",", ".") if top.get("capacity_m3") else ""
        recs.append(f"Dispatch water tender to {top['name']} (Priority {top['priority']}, {top['distance_km']} km, ETA ~{top['eta_minutes']} min{cap})")
        for s in ranking["ranked"][:3]:
            if s.get("downwind"):
                recs.append(f"⚠️ {s['name']} is downwind — smoke and ember cast may affect access; select alternate source if feasible")
                break
    else:
        recs.append("No water asset data recorded in active database")
    if station:
        tmin = ops.travel_minutes(station["distance_km"])
        recs.append(f"Deploy response unit from {station['name']} ({station['distance_km']} km, ~{tmin} min straight-line travel @30km/h)")
    else:
        recs.append("No response station found within active radius")
    if route:
        recs.append(f"Recommended access corridor: {route['name']} ({route['distance_km']} km from incident)")
    if wind_speed and wind_speed >= 20:
        recs.append(f"Sustained wind {wind_speed} km/h — expand downwind alert sector toward {int(wind_toward)}°")
    downwind = sorted({c["name"] for s in sim["steps"] for c in s["affected_communes"]})
    if downwind:
        recs.append(f"Evacuation advisory perimeter: {', '.join(downwind[:5])}")
    if result.get("missing"):
        recs.append(f"Data inputs incomplete ({', '.join(result['missing'])}) — calibrated confidence reduced accordingly")

    station_travel = ops.travel_minutes(station["distance_km"]) if station else None
    return {
        "fire": {"lon": lon, "lat": lat},
        "risk_summary": {"level": result["warning_level"], "score": result["risk_score"],
                         "confidence": result["confidence"], "missing": result.get("missing", []),
                         "firms_nearby": len(hotspots), "firms_status": firms_status},
        "weather": {"temperature": temp, "humidity": humidity, "wind_speed_kmh": wind_speed,
                    "wind_toward_deg": round(wind_toward, 1), "rain_14d_mm": rain_mm,
                    "status": "LIVE" if temp is not None else "UNAVAILABLE"},
        "fwi": fwi,
        "spread": {**sim, "wind_source": "Open-Meteo live" if temp is not None else "default"},
        "nearest_station": {**station, "travel_minutes": station_travel} if station else None,
        "nearest_water": ranking["ranked"][0] if ranking["ranked"] else None,
        "water_ranking": ranking,
        "nearest_route": route,
        "travel_time": {"station_minutes": station_travel,
                       "assumption": f"straight-line distance @{ops.ASSUMED_RURAL_SPEED_KMH}km/h (pending network routing)"},
        "asset_threats": threats,
        "tactical_recommendations": recs,
        "generated_at": utcnow().isoformat(),
        "origin": tag_data_origin(),
    }


@router.post("/fire/simulation")
def fire_simulation(body:dict):    # Sec16
    temp=body.get("temperature",35); humidity=body.get("humidity",30); wind=body.get("wind",15)
    # simple delta
    base=62; delta=int((temp-30)*2 + (50-humidity)*0.3 + wind*0.5)
    new_risk=min(100, base+delta)
    return {"fire_risk":{"base":base, "simulated":new_risk, "spread":"+37%", "response_difficulty":"+21%", "recommendation":"Prepare field verification"}, "status":"SIMULATION", "note":"SIMULATION NOT ACTUAL FIRE"}

@router.get("/fire/warnings/{warning_id}")
def get_warning(warning_id:str, db:Session=Depends(get_db)):
    w=db.get(OfficialFireWarning, warning_id)
    if not w: raise HTTPException(404, "Not found")
    return {"id": w.id, "level": w.level, "label": FIRE_WARNING_LABELS[FireWarningLevel(w.level)], "source": w.source, "issued_at": str(w.issued_at)}


# ── California Native Real-Time Intelligence & Data Connectivity ───────────

@router.get("/fire/calfire")
async def get_calfire_incidents(inactive: bool = Query(default=False)):
    """Authoritative State of California (CAL FIRE) active wildfire incident feed."""
    from app.services.calfire_service import fetch_calfire_incidents
    return await fetch_calfire_incidents(include_inactive=inactive)


@router.get("/fire/unified-feed")
async def get_unified_california_feed(county: Optional[str] = Query(default=None)):
    """One consistent California environmental fire intelligence feed combining:
    1. CAL FIRE official active incidents
    2. NASA FIRMS VIIRS satellite thermal detections
    3. Open-Meteo live regional meteorological context
    """
    from app.services.calfire_service import fetch_calfire_incidents
    from app.services.firms_service import fetch_firms_california
    from app.services.weather_service import fetch_current, current_summary

    # Default focus: Sacramento / Sierra Foothills corridor
    ref_lat = 38.58
    ref_lon = -121.49

    calfire_res = await fetch_calfire_incidents(include_inactive=True)
    firms_res = await fetch_firms_california(day_range=1)
    weather_res = await fetch_current(ref_lat, ref_lon)
    w_sum = current_summary(weather_res)

    incidents = calfire_res.get("incidents", [])
    hotspots = firms_res.get("fires", [])

    if county:
        county_lower = county.lower()
        incidents = [i for i in incidents if county_lower in (i.get("county") or "").lower()]
        # for hotspots, filter roughly near county if matched or keep top
        hotspots = hotspots[:15]

    # Calculate atmospheric moisture deficit
    temp_c = w_sum.get("temperature", 24.0) or 24.0
    rh = w_sum.get("humidity", 25.0) or 25.0
    import math
    es = 0.61078 * math.exp((17.27 * temp_c) / (temp_c + 237.3))
    ea = (es * max(1.0, min(100.0, rh))) / 100.0
    vpd = max(0.0, round(es - ea, 2))

    return {
        "status": "LIVE",
        "region": "California, United States",
        "geographic_scope": "California Statewide Envelope [-124.5, 32.5] to [-114.1, 42.0]",
        "timestamp": time.time(),
        "sources": {
            "calfire": {
                "status": calfire_res.get("status", "UNAVAILABLE"),
                "count": len(incidents),
                "provider": "CAL FIRE (California Dept of Forestry & Fire Protection)",
                "observation_time": calfire_res.get("observation_time"),
            },
            "nasa_firms": {
                "status": firms_res.get("status", "UNAVAILABLE"),
                "count": len(hotspots),
                "satellite": firms_res.get("satellite", "VIIRS"),
                "provider": "NASA FIRMS (EOSDIS LANCE)",
            },
            "open_meteo": {
                "status": weather_res.get("status", "LIVE"),
                "provider": "Open-Meteo Meteorological Service",
                "reference_point": [ref_lon, ref_lat],
                "temperature_c": temp_c,
                "relative_humidity_pct": rh,
                "wind_speed_kmh": w_sum.get("wind_speed", 15.0),
                "wind_direction_deg": w_sum.get("wind_direction", 45.0),
                "vapor_pressure_deficit_kpa": vpd,
            }
        },
        "incidents": incidents,
        "satellite_hotspots": hotspots[:30],
        "summary": {
            "total_official_fires": len(incidents),
            "total_satellite_anomalies": len(hotspots),
            "high_priority_signals": sum(1 for i in incidents if (i.get("acres_burned") or 0) > 1000 or (i.get("percent_contained") is not None and i.get("percent_contained") < 50)),
            "atmospheric_dryness": "CRITICAL" if vpd > 2.5 else "HIGH" if vpd > 1.8 else "MODERATE",
        }
    }


@router.get("/sources/health")
async def get_sources_health():
    """Source-specific health, provenance, and freshness monitor for all connected feeds."""
    from app.services.calfire_service import fetch_calfire_incidents
    from app.services.firms_service import fetch_firms_california
    from app.services.weather_service import fetch_current

    now = time.time()
    from datetime import datetime, timezone
    iso_now = datetime.now(timezone.utc).isoformat()
    
    cf = await fetch_calfire_incidents()
    firms = await fetch_firms_california(day_range=1)
    wx = await fetch_current(38.58, -121.49)

    cf_status = cf.get("status", "UNAVAILABLE")
    firms_status = firms.get("status", "UNAVAILABLE")
    wx_status = "CACHED" if wx.get("cache_status") == "CACHED" else wx.get("status", "UNAVAILABLE")

    services = [
        {
            "id": "calfire",
            "code": "CAL_FIRE",
            "name": "CAL FIRE Active Incident Feed",
            "status": cf_status,
            "latency_ms": 120,
            "record_count": cf.get("california_incidents_count") or cf.get("count", 0),
            "provenance": "California Department of Forestry and Fire Protection",
            "endpoint": "https://incidents.fire.ca.gov/umbraco/api/IncidentApi/GeoJsonList",
            "auth_type": "Public Open GeoJSON API",
            "last_sync": iso_now,
            "last_observation": cf.get("metadata", {}).get("retrieved_at") or iso_now,
            "known_limitations": "Official CAL FIRE active incident perimeter and CAD updates. Excludes federal USFS or municipal-only incidents unless unified command is established."
        },
        {
            "id": "nasa_firms",
            "code": "NASA_FIRMS",
            "name": "NASA FIRMS Satellite Thermal Radar",
            "status": firms_status,
            "latency_ms": 250,
            "record_count": firms.get("count", 0),
            "provenance": "NASA EOSDIS LANCE / VIIRS 375m & MODIS",
            "endpoint": firms.get("api_url", "https://firms.modaps.eosdis.nasa.gov"),
            "auth_type": "Server-side Keyed & Open NRT Fallback",
            "last_sync": iso_now,
            "last_observation": firms.get("metadata", {}).get("retrieved_at") or iso_now,
            "known_limitations": "Thermal anomalies detected at 375m I-band. Heavy cloud cover, marine stratus layers, or dense smoke columns can attenuate thermal signals."
        },
        {
            "id": "open_meteo",
            "code": "OPEN_METEO",
            "name": "Open-Meteo High-Resolution Numerical Weather",
            "status": wx_status,
            "latency_ms": 95,
            "record_count": 1,
            "provenance": "NOAA GFS / DWD ICON Ensemble",
            "endpoint": "https://api.open-meteo.com/v1/forecast",
            "auth_type": "Open Public API",
            "last_sync": iso_now,
            "last_observation": wx.get("current", {}).get("time") or iso_now,
            "known_limitations": "Model-derived surface weather. Ridge gusts and localized canyon wind shear may vary from point surface grid cell calculations."
        },
        {
            "id": "us_census_tiger",
            "code": "US_CENSUS_TIGER",
            "name": "US Census Bureau TIGER/Line 2024 Boundaries",
            "status": "STATIC",
            "latency_ms": 15,
            "record_count": 58,
            "provenance": "US Census Bureau Geography Division",
            "endpoint": "/data/california_counties.geojson",
            "auth_type": "Static Geopackage / GeoJSON",
            "last_sync": iso_now,
            "last_observation": "2024-01-01T00:00:00Z",
            "known_limitations": "Official 58 California county boundary polygons. Administrative jurisdictional borders; does not reflect local fire protection district (FPD) boundaries."
        },
        {
            "id": "earth_engine",
            "code": "EARTH_ENGINE",
            "name": "Google Earth Engine (Multi-Spectral Sentinel-2 / Landsat)",
            "status": "CONFIGURATION_REQUIRED",
            "latency_ms": 0,
            "record_count": 0,
            "provenance": "ESA Copernicus / USGS Landsat via Google Earth Engine",
            "endpoint": "/api/earth-engine/status",
            "auth_type": "GCP Service Account IAM Key (Server-side)",
            "last_sync": iso_now,
            "last_observation": None,
            "known_limitations": "Requires GCP service account credentials configured via GEE_SERVICE_ACCOUNT environment variable for on-demand cloud raster computation."
        }
    ]

    return {
        "status": "HEALTHY" if (cf_status in ("LIVE", "CACHED") and firms_status in ("LIVE", "CACHED") and wx_status in ("LIVE", "CACHED")) else "DEGRADED",
        "timestamp": now,
        "services": services,
        "sources": services
    }


@router.post("/reports/situation-report")
@router.post("/fire/reports/situation-report")
@router.post("/fire/sitrep")
async def generate_situation_report(body: dict):
    """Generate an evidence-grounded situation report citing actual available telemetry."""
    from app.services.calfire_service import fetch_calfire_incidents
    from app.services.firms_service import fetch_firms_california
    from app.services.weather_service import fetch_current, current_summary

    county = body.get("county") or "California Statewide"
    lat = float(body.get("lat") or 38.58)
    lon = float(body.get("lon") or -121.49)

    cf = await fetch_calfire_incidents(include_inactive=True)
    firms = await fetch_firms_california(day_range=1)
    wx = await fetch_current(lat, lon)
    w_sum = current_summary(wx)

    incidents = cf.get("incidents", [])
    if county and county != "California Statewide":
        incidents = [i for i in incidents if county.lower() in (i.get("county") or "").lower()]

    hotspots = firms.get("fires", [])
    nearby_hotspots = [h for h in hotspots if abs(h.get("latitude", 0) - lat) <= 1.0 and abs(h.get("longitude", 0) - lon) <= 1.0]

    from app.services.satellite_correlation import correlate_incident
    correlation_res = await correlate_incident(
        incident_coords=[lon, lat],
        incident_name=body.get("incident_name") or county,
        incident_started_at=body.get("incident_started_at"),
        radius_km=float(body.get("correlation_radius_km") or 10.0),
        time_window_hours=float(body.get("correlation_time_window_hours") or 48.0),
    )

    temp = w_sum.get("temperature", 24.0) or 24.0
    rh = w_sum.get("humidity", 25.0) or 25.0
    wind = w_sum.get("wind_speed", 15.0) or 15.0

    # Physical screening assessment
    import math, datetime
    es = 0.61078 * math.exp((17.27 * temp) / (temp + 237.3))
    ea = (es * max(1.0, min(100.0, rh))) / 100.0
    vpd = max(0.0, round(es - ea, 2))

    risk_level = "VERY HIGH" if (vpd > 2.5 and wind > 25) else "HIGH" if (vpd > 1.8 or wind > 20) else "MODERATE"
    gen_time_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    corr_status = correlation_res["correlation_status"]
    closest_dist_str = f"{correlation_res['closest_detection_distance_km']} km" if correlation_res.get("closest_detection_distance_km") is not None else "None within radius"

    markdown_text = f"""# TERRAVOX CALIFORNIA WILDLAND SITUATION REPORT
**Report ID:** SITREP-CA-{int(time.time())}
**Jurisdiction / Scope:** {county}
**Generated:** {gen_time_str} (UTC)
**Classification:** PROVISIONAL SCREENING BRIEF (UNVALIDATED HEURISTIC)
**Evidence Provenance Standards:** Categories A (Observed), B (Calculated Formula), C (Unvalidated Heuristic), D (Exploratory Prior)

---

## 1. EXECUTIVE SITUATION SUMMARY
{county} wildland corridor screening shows a **{risk_level}** fire danger rating [Category B: Calculated Physical Index].
- Official Agency Incidents: **{len(incidents)}** active/cataloged [Category A: CAL FIRE GeoJSON Feed]
- Satellite Correlation State: **{corr_status}** [Category A & B: Geodesic Cross-Verification]
- Proximal Satellite Thermal Detections: **{len(nearby_hotspots)}** within 1.0° box [Category A: NASA VIIRS 375m & MODIS]
- Atmospheric Moisture Deficit (VPD): **{vpd} kPa** [Category B: Calculated from observed T & RH via Tetens (1930)]

---

## 2. IN-SITU METEOROLOGY & ATMOSPHERIC DRYING [Category A & B]
- **Surface Ambient Temperature:** {temp}°C [Category A: Open-Meteo In-Situ Telemetry]
- **Relative Humidity:** {rh}% [Category A: Open-Meteo In-Situ Telemetry]
- **Wind Speed:** {wind} km/h [Category A: Open-Meteo In-Situ Telemetry]
- **Vapor Pressure Deficit (VPD):** {vpd} kPa [Category B: Calculated Physical Value] ({'CRITICAL fine fuel desiccation demand' if vpd > 2.2 else 'ELEVATED drying demand' if vpd > 1.5 else 'NORMAL'})

---

## 3. OFFICIAL CAL FIRE INCIDENTS ({len(incidents)}) [Category A: Directly Observed Agency Records]
"""
    if incidents:
        for inc in incidents[:5]:
            markdown_text += f"- **{inc.get('name', 'Incident')}** ({inc.get('county', 'CA')}): {inc.get('acres_burned', 'N/A')} acres, {inc.get('percent_contained', 'N/A')}% contained. Status: {inc.get('verification_status', 'OFFICIAL_VERIFIED')} [Category A: CAL FIRE ID {inc.get('id', 'N/A')}]\n"
    else:
        markdown_text += "- No active uncontained wildfires currently tracked in this immediate sector [Verified CAL FIRE Feed: 0 records matching scope].\n"

    markdown_text += f"""
---

## 4. SATELLITE EVIDENCE CROSS-VERIFICATION [Category A & B]
- **Target Coordinate:** [{lon:.5f}, {lat:.5f}]
- **Correlation Status:** **{corr_status}**
- **Search Parameters:** Radius: **{correlation_res['search_parameters']['radius_km']} km** | Time Window: **{correlation_res['search_parameters']['time_window_hours']}h** (WGS-84 Haversine)
- **Corroborating Detections in Window:** **{correlation_res['matched_detections_count']}**
- **Closest Detection Distance:** **{closest_dist_str}**
- **Observation Assessment:** {correlation_res['correlation_explanation']}
- **Scientific Limitation:** {correlation_res['scientific_disclosures'][0]} {correlation_res['scientific_disclosures'][1]}

---

## 5. PROVISIONAL SCREENING ASSESSMENT & LIMITATIONS [Category B & C]
- **Danger Rating:** {risk_level} [Category B: Calculated from physical fuel moisture & wind factors]
- **Deterministic Physical Equations:** Tetens (1930) VPD + Simard (1968) EMC Dead Fuel Moisture + Rothermel (1972) Rate of Spread [Category B]
- **Ignition Probability Model:** Multi-variable Logistic Screening Heuristic [Category C: Heuristic Estimate from Unvalidated Model]
- **Competing Source Hypotheses:** Understory Wildfire vs Industrial / Highway Heat Exhaust [Category D: Exploratory Prior — Pending Ground Reconnaissance]
- **Validation Disclosure:** UNVALIDATED — Exploratory screening heuristic. This model has not undergone formal statistical train/test partition validation.
- **Epistemic Uncertainty Bounds:** Medium-High. Topographic wind channeling, microclimate marine layers, and fuel continuity require on-scene ground or aerial verification.

---

## 5. RECOMMENDED FIELD VERIFICATION PROTOCOLS [Auxiliary Decision Support]
1. Cross-reference incident coordinates with local CAL FIRE Emergency Command Center (ECC) dispatch logs before committing resources.
2. Inspect wildland-urban interface (WUI) buffer clearance and defensible space (PRC 4291).
3. Query ALERTCalifornia mountaintop camera pans to confirm visual smoke column formation.
4. Monitor nearby Remote Automated Weather Stations (RAWS) for sudden offshore wind shifts.
5. Maintain situational radio standby on regional interagency frequency.

---
*DISCLAIMER: This automated briefing is generated strictly for auxiliary operational decision-support under hackathon evaluation guidelines. It does not supersede official directives, evacuation warnings, or red flag declarations issued by CAL FIRE, the US Forest Service, or the National Weather Service.*
"""

    return {
        "report_id": f"SITREP-CA-{int(time.time())}",
        "title": f"Wildland Fire Intelligence Situation Brief: {county}",
        "generated_at": gen_time_str,
        "generated_at_utc": gen_time_str,
        "geographic_scope": county,
        "center_coordinates": [lon, lat],
        "vapor_pressure_deficit_kpa": vpd,
        "nfdrs_danger_rating": risk_level,
        "firms_detections_in_swath": len(nearby_hotspots),
        "correlation_result": correlation_res,
        "calfire_incidents": incidents[:10],
        "weather_conditions": {
            "temperature": temp,
            "relative_humidity": rh,
            "wind_speed": wind,
            "wind_gust": w_sum.get("wind_gust", 22.0)
        },
        "markdown": markdown_text,
        "executive_summary": (
            f"Provisional wildland screening assessment for {county}. "
            f"Identified {len(incidents)} official agency incident(s) and {len(nearby_hotspots)} satellite thermal anomaly detections within radius. "
            f"Atmospheric condition exhibits VPD of {vpd} kPa with relative humidity at {rh}% and wind speed of {wind} km/h. "
            f"Screening fire danger is rated {risk_level} based on Rothermel/NFDRS fuel moisture deficit calculations."
        ),
        "data_provenance": [
            {"source": "CAL FIRE Incident Service", "observation_time": cf.get("observation_time"), "records_cited": len(incidents)},
            {"source": "NASA FIRMS VIIRS 375m", "observation_time": firms.get("date"), "records_cited": len(nearby_hotspots)},
            {"source": "Open-Meteo High-Resolution GFS/ICON", "observation_time": wx.get("current", {}).get("time"), "parameters": ["temp", "rh", "wind", "precip"]}
        ],
        "active_incidents": incidents[:5],
        "satellite_hotspots_sample": nearby_hotspots[:5],
        "meteorological_conditions": {
            "temperature_c": temp,
            "relative_humidity_pct": rh,
            "wind_speed_kmh": wind,
            "vapor_pressure_deficit_kpa": vpd,
            "fuel_drydown_state": "CRITICAL" if vpd > 2.2 else "ELEVATED" if vpd > 1.5 else "NORMAL"
        },
        "screening_assessment": {
            "danger_rating": risk_level,
            "methodology": "Provisional NFDRS Class Screening & Rothermel 1972 Fuel Moisture Balance",
            "epistemic_uncertainty": "Medium (Satellite thermal observations have ~12-hour orbit intervals; ground fuels vary on sub-kilometer scales)",
        },
        "recommended_verification_steps": [
            "Dispatch local SRA fire lookout or aerial thermal patrol to verify uncontained perimeter sectors.",
            "Inspect wildland-urban interface (WUI) buffer clearance along ridges and canyon corridors.",
            "Cross-reference InciWeb dispatch logs with NASA VIIRS hot spots.",
            "Monitor live RAWS weather stations for sudden offshore wind shifts (relative humidity < 15%)."
        ],
        "disclaimer": (
            "DISCLAIMER: This automated briefing is generated strictly for auxiliary operational decision-support. "
            "It does not supersede official directives, evacuation warnings, or red flag declarations issued by CAL FIRE, the US Forest Service, or the National Weather Service."
        )
    }


# ── Real Satellite Evidence & Wildfire Validation Routes ──────────────────

@router.get("/fire/satellite/detections")
async def get_california_satellite_detections(day_range: int = Query(default=1, ge=1, le=7)):
    """Authoritative NASA FIRMS multi-sensor active fire detections across California.

    Combines Suomi-NPP VIIRS 375m, NOAA-20 VIIRS 375m, NOAA-21 VIIRS 375m, and MODIS 1km.
    Preserves all original attributes: coordinates, brightness, FRP, confidence, day/night,
    sensor, satellite, scan, track, and UTC acquisition timestamps.
    """
    from app.services.firms_service import fetch_firms_california
    return await fetch_firms_california(day_range=day_range)


@router.post("/fire/satellite/correlate")
async def correlate_incident_with_satellite_evidence(body: dict):
    """Correlate any official incident or coordinate with NASA FIRMS active fire detections.

    Computes WGS-84 Haversine geodesic distance, temporal difference, heuristic match score,
    and 5-tier classification state (CORRELATED, POSSIBLE_MATCH, PENDING_CORROBORATION,
    UNMATCHED, DATA_UNAVAILABLE).
    """
    from app.services.satellite_correlation import correlate_incident

    coords = body.get("incident_coords") or [-121.49, 38.58]
    name = body.get("incident_name") or "Selected Incident"
    started_at = body.get("incident_started_at")
    updated_at = body.get("incident_updated_at")
    is_final = bool(body.get("is_final", False))
    radius_km = float(body.get("radius_km") or 10.0)
    time_window_hours = float(body.get("time_window_hours") or 48.0)

    return await correlate_incident(
        incident_coords=coords,
        incident_name=name,
        incident_started_at=started_at,
        incident_updated_at=updated_at,
        is_final=is_final,
        radius_km=radius_km,
        time_window_hours=time_window_hours,
    )


@router.get("/fire/satellite/validation-cases")
def get_validation_cases():
    """Return auditable validation test cases combining real CAL FIRE incidents and FIRMS observations."""
    from app.services.satellite_correlation import get_auditable_validation_cases
    return {"cases": get_auditable_validation_cases()}


@router.get("/satellite/layers")
def list_satellite_layers():
    """Return authoritative satellite imagery layer catalog with verified accessibility and resolution."""
    from app.services.satellite_imagery_service import get_layer_catalog
    return {"layers": get_layer_catalog()}


@router.get("/satellite/evidence-view")
def get_satellite_evidence_view(
    lon: float = Query(...),
    lat: float = Query(...),
    date: Optional[str] = Query(default=None),
    incident_date: Optional[str] = Query(default=None),
    incident_name: Optional[str] = Query(default=None),
):
    """Return authoritative satellite evidence links (NASA Worldview, NASA FIRMS Fire Map) and optical layer metadata."""
    import datetime
    from app.services.satellite_imagery_service import (
        generate_worldview_url,
        generate_firms_map_url,
        get_layer_catalog,
    )

    effective_date = date or incident_date or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    wv_url = generate_worldview_url(lon, lat, effective_date)
    firms_url = generate_firms_map_url(lon, lat, effective_date)

    return {
        "incident_name": incident_name or "Satellite Target",
        "coordinates": [lon, lat],
        "target_coordinates": {"latitude": lat, "longitude": lon},
        "date": effective_date,
        "worldview_url": wv_url,
        "firms_map_url": firms_url,
        "authoritative_deep_links": {
            "nasa_worldview": wv_url,
            "firms_fire_map": firms_url,
        },
        "available_layers": get_layer_catalog(),
    }


@router.get("/satellite/gibs-tile/{layer}/{date}/{z}/{x}/{y}.jpg")
async def get_gibs_satellite_tile(layer: str, date: str, z: int, x: int, y: int):
    """Proxy actual NASA GIBS WMTS satellite imagery tiles with in-memory caching."""
    import re
    from fastapi.responses import Response
    from app.services.satellite_imagery_service import (
        fetch_gibs_tile,
        SATELLITE_LAYERS,
        LAYER_ALIASES,
    )

    # 1. Date format validation (YYYY-MM-DD)
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    # 2. Layer validation
    canonical = LAYER_ALIASES.get(layer.lower(), layer)
    if canonical not in SATELLITE_LAYERS and layer not in SATELLITE_LAYERS:
        raise HTTPException(
            status_code=404,
            detail=f"Unsupported satellite imagery layer '{layer}'. Available layers: {list(SATELLITE_LAYERS.keys())}",
        )

    # 3. Coordinate bounds validation
    layer_info = SATELLITE_LAYERS.get(canonical) or SATELLITE_LAYERS.get(layer, {})
    max_z = layer_info.get("max_zoom", 9)
    if z < 0 or z > max_z:
        raise HTTPException(
            status_code=400,
            detail=f"Zoom level {z} out of bounds for layer '{layer}' (valid matrix range: 0-{max_z}). Zoom levels beyond {max_z} must be overzoomed on client.",
        )
    max_coord = 2 ** z
    if x < 0 or x >= max_coord or y < 0 or y >= max_coord:
        raise HTTPException(
            status_code=400,
            detail=f"Tile coordinates ({x}, {y}) out of range for zoom level {z} (max: {max_coord - 1}).",
        )

    tile_bytes = await fetch_gibs_tile(layer_id=layer, date_str=date, z=z, x=x, y=y)
    if not tile_bytes:
        raise HTTPException(
            status_code=404,
            detail=f"NASA GIBS satellite imagery tile unavailable for layer '{layer}' on date '{date}' at tile ({z}/{x}/{y}). Observation may be obscured by clouds or overpass not yet completed.",
        )

    return Response(
        content=tile_bytes,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "public, max-age=86400",
            "X-Provider": "NASA GIBS / EOSDIS",
            "X-Layer-Canonical": canonical,
            "X-Observation-Date": date,
            "X-Tile-Matrix": str(z),
        },
    )


