"""WhatIfEngine Sec4 + ScenarioBuilder Sec5-7 + ScenarioAgent Sec11."""
import json, hashlib, random
from datetime import datetime
from typing import Dict, List
from sqlalchemy.orm import Session
from app.models.twin import Scenario, ScenarioScore

SCENARIO_TYPES=["CLIMATE","DISASTER","FOREST","AGRICULTURE","CARBON","LOGISTICS","EUDR","INFRASTRUCTURE","ECONOMIC","COMPOUND"]

def parse_nl(nl:str)->Dict:
    p={}
    nl_lower = nl.lower()
    if "rain" in nl_lower or "mưa" in nl_lower: p["rainfall"]="+30%"
    if "road" in nl_lower or "highway" in nl_lower or "quốc lộ" in nl_lower: p["road_closure"]="48h"
    if "crop" in nl_lower or "agriculture" in nl_lower or "yield" in nl_lower: p["crop_yield"]="-10%"
    if "forest" in nl_lower or "wildfire" in nl_lower or "ha" in nl_lower: p["forest_loss"]="500ha"
    if "heat" in nl_lower or "temperature" in nl_lower: p["heat_c"]=3.0
    if "wind" in nl_lower or "gust" in nl_lower: p["wind_mph"]=15.0
    return p

class WhatIfEngine:
    def build(self, db:Session, params:Dict, name:str="Scenario", type:str="COMPOUND", baseline_id:str|None=None)->Scenario:
        if type not in SCENARIO_TYPES: type="COMPOUND"
        sc=Scenario(name=name, type=type, params=json.dumps(params), baseline_id=baseline_id)
        db.add(sc); db.flush()
        # Calculate deterministic danger score based on scenario parameters
        from app.services.simulation_engine import calculate_vpd, calculate_m100, calculate_danger_index
        heat = float(params.get("heat", params.get("heat_c", 0.0)))
        wind = float(params.get("wind", params.get("wind_mph", params.get("wind_delta_mph", 0.0))))
        rain_deficit = float(params.get("rain", params.get("rainfall_pct", 0.0)))
        road_h = float(params.get("roadHours", params.get("road_closure_h", 0.0)))

        temp_c = 28.0 + heat
        rh_pct = max(5.0, 22.0 - heat * 2.5)
        wind_mph = 14.0 + wind
        rain_7d = max(0.0, 5.0 * (1.0 - rain_deficit / 100.0))

        vpd = calculate_vpd(temp_c, rh_pct)
        m100 = calculate_m100(temp_c, rh_pct, rain_7d)
        danger = calculate_danger_index(temp_c, rh_pct, wind_mph, rain_7d, m100, vpd, road_closure_h=road_h)

        risk_score = danger["danger_score"]
        forest_vulnerability = min(99, max(10, int(round(risk_score * 0.95 + 5))))
        co2_emission_risk = min(99, max(10, int(round(risk_score * 0.85 + 10))))
        logistics_friction = min(99, max(10, int(round(risk_score * 0.75 + 15))))
        resilience = max(5, 100 - risk_score)

        score = ScenarioScore(
            scenario_id=sc.id,
            risk=risk_score,
            cost=int(round(risk_score * 0.7)),
            co2=co2_emission_risk,
            forest=forest_vulnerability,
            agriculture=min(95, max(15, int(round(risk_score * 0.8)))),
            logistics=logistics_friction,
            resilience=resilience,
            eudr=max(30, 95 - int(round(risk_score * 0.4))),
            community=max(25, 90 - int(round(risk_score * 0.5)))
        )
        db.add(score); db.commit(); db.refresh(sc)
        return sc
    def compare(self, db:Session, ids:List[str])->Dict:
        scores=db.query(ScenarioScore).filter(ScenarioScore.scenario_id.in_(ids)).all()
        return {"scenarios": [{"id": s.scenario_id, "risk": s.risk, "co2": s.co2, "forest": s.forest} for s in scores], "baseline": ids[0] if ids else None}
    def cascade(self, scenario:str)->Dict:
        # Sec13-16
        return {"cascade": ["EXTREME RAIN","FLOOD","ROAD CLOSURE","LOGISTICS DELAY","HARVEST DELAY","CROP LOSS","CO2 INCREASE"], "temporal": {"T+0":"Event","T+6h":"First impact","T+24h":"Road disruption","T+48h":"Agriculture","T+72h":"Supply chain"}, "spatial": {"starts":"Mountain","affected":"3 communes","spreads":"Downstream","next_risk":"Flood"}}
    def data_gap(self, db:Session)->List[Dict]:
        from app.models.twin import DataGap
        gaps=db.query(DataGap).limit(5).all()
        if not gaps:
            db.add(DataGap(gap_type="missing", description="Need more satellite data", priority="HIGH")); db.commit()
            gaps=db.query(DataGap).limit(5).all()
        return [{"gap": g.gap_type, "desc": g.description} for g in gaps]

class ScenarioAgent:
    def generate(self, goal:str)->List[str]: return ["BASELINE","MODERATE","SEVERE","EXTREME"]
    def simulate(self, db:Session, scenario_id:str)->Dict:
        # call multi-agent Sec12
        return {"forest": "ForestAgent simulated", "disaster": "DisasterAgent simulated", "logistics": "LogisticsAgent simulated"}

what_if=WhatIfEngine()
scenario_agent=ScenarioAgent()
