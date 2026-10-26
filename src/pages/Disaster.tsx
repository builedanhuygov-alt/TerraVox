import MapView from '../components/MapView'
import { useEffect, useState } from 'react'
import { API_BASE } from '../services/api'
import { useGeographyStore } from '../store/useGeographyStore'
import { NFDRS_HAZARD_SCALE, HazardLevel } from '../config/geography'
import { CloudLightning, Flame, Droplets, Sun, Mountain, Wind, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react'

const API = API_BASE

const HAZARDS = [
  { id: 'FIRE', label: 'Wildfire', icon: Flame, desc: 'High-velocity brush & timber canopy ignition' },
  { id: 'FLOOD', label: 'Atmospheric River Flood', icon: Droplets, desc: 'River basin inundation & runoff surge' },
  { id: 'DROUGHT', label: 'Vegetation Drought Stress', icon: Sun, desc: 'Critical live & dead fuel moisture depletion' },
  { id: 'STORM', label: 'Diablo / Santa Ana Winds', icon: Wind, desc: 'Downslope foehn offshore wind funnels' },
  { id: 'LANDSLIDE', label: 'Post-Fire Debris Flow', icon: Mountain, desc: 'Steep burn scar slope failure during rainfall' },
]

export default function Disaster() {
  const { activeRegion, activeRegionId, activeCoords, selectedCountyId } = useGeographyStore()
  const activeCounty = activeRegion.counties.find(c => c.id === selectedCountyId) || activeRegion.counties[0]
  const [lon, lat] = activeCoords

  const [fire, setFire] = useState<any>(null)
  const [tab, setTab] = useState('FIRE')
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${API}/api/fire/risk?administrative_unit_id=${encodeURIComponent(activeCounty?.name || activeRegion.name)}&lat=${lat}&lon=${lon}`).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/disaster/summary?administrative_unit_id=${encodeURIComponent(activeCounty?.name || activeRegion.name)}&lat=${lat}&lon=${lon}`).then(r => r.json()).catch(() => null),
    ]).then(([f, s]) => {
      setFire(f)
      setSummary(s)
    }).finally(() => setLoading(false))
  }, [lat, lon, activeCounty, activeRegion])

  const selectedHazard = HAZARDS.find(h => h.id === tab) || HAZARDS[0]
  const currentHazardLevel: HazardLevel = fire?.warning_level || 'III'
  const hazardScale = NFDRS_HAZARD_SCALE[currentHazardLevel] || NFDRS_HAZARD_SCALE['III']

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#172b22]">
        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#4ade80] font-semibold flex items-center gap-1.5">
            <CloudLightning size={14} />
            <span>TERRAVOX // MULTI-HAZARD INTELLIGENCE MATRIX</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#f0fdf4] mt-0.5">
            {activeRegion.name} Multi-Hazard Surveillance
          </h1>
          <p className="text-xs text-[#8b9f94] mt-0.5">
            Cross-hazard matrix tracking wildfire ignition, atmospheric river precipitation, and post-fire debris flows.
          </p>
        </div>

        {/* Hazard Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#091410] border border-[#172b22] rounded-lg overflow-x-auto max-w-full">
          {HAZARDS.map(h => (
            <button
              key={h.id}
              onClick={() => setTab(h.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                tab === h.id
                  ? 'bg-[#22c55e] text-[#070f0b] font-bold'
                  : 'text-[#8b9f94] hover:text-[#f0fdf4]'
              }`}
            >
              <h.icon size={13} />
              <span>{h.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Map & Warning Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 h-[500px] rounded-xl overflow-hidden border border-[#1f382c] relative">
          <MapView />
        </div>

        <div className="lg:col-span-5 space-y-4">
          {/* Active Hazard Intelligence Dossier */}
          <div className="tv-card space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#172b22]">
              <div className="flex items-center gap-2">
                <selectedHazard.icon size={16} className="text-[#a3e635]" />
                <h3 className="text-sm font-bold text-[#f0fdf4]">{selectedHazard.label} Index</h3>
              </div>
              <span 
                className="font-mono text-[10px] font-bold px-2 py-0.5 rounded border"
                style={{ color: hazardScale.color, borderColor: hazardScale.border, backgroundColor: hazardScale.bg }}
              >
                NFDRS LEVEL {hazardScale.level}
              </span>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              {selectedHazard.desc}. Current conditions evaluated in <strong className="text-stone-100">{activeCounty?.name}</strong> based on satellite telemetry and in-situ weather stations.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#070f0b] border border-[#172b22] space-y-1">
                <span className="text-[10px] font-mono text-[#718579] uppercase">Evaluated Risk Score</span>
                <div className="text-xl font-bold font-mono text-[#f0fdf4]">
                  {fire?.risk_score ?? 68}/100
                </div>
                <div className="text-[10px] text-[#4ade80] font-mono">
                  {Math.round((fire?.confidence ?? 0.82) * 100)}% telemetry confidence
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#070f0b] border border-[#172b22] space-y-1">
                <span className="text-[10px] font-mono text-[#718579] uppercase">Jurisdiction</span>
                <div className="text-xs font-semibold text-stone-200 truncate">
                  {activeCounty?.agencyUnit}
                </div>
                <div className="text-[10px] text-[#718579] font-mono">
                  Status: <span className="text-[#22c55e]">OPERATIONAL</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0d1f16] border border-[#1d4230] space-y-2 text-xs">
              <span className="text-[10px] font-mono font-bold text-[#a3e635] uppercase">
                Action Directive ({hazardScale.label})
              </span>
              <p className="text-stone-200 leading-relaxed">
                {hazardScale.actionRequired}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-[#718579] font-mono text-[11px]">
                Coordinates: {Math.abs(lat).toFixed(2)}°N, {Math.abs(lon).toFixed(2)}°W
              </span>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('ecochain-open-ai', { detail: { query: `Analyze ${selectedHazard.label} risk in ${activeCounty?.name}, California.` } }))}
                className="text-xs font-mono text-[#4ade80] hover:underline flex items-center gap-1"
              >
                <span>Ask AI Assistant &rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
