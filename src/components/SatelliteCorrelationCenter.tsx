import React, { useEffect, useState } from 'react'
import { 
  Radio, 
  Satellite, 
  Layers, 
  MapPin, 
  Clock, 
  ExternalLink, 
  SlidersHorizontal, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  RefreshCw, 
  Flame, 
  ShieldCheck, 
  FileText,
  Eye,
  Crosshair,
  Calendar
} from 'lucide-react'
import { api } from '../services/api'

interface SatelliteCorrelationCenterProps {
  incidentCoords: [number, number]
  incidentName: string
  incidentCounty?: string
  incidentStartedAt?: string
  incidentUpdatedAt?: string
  isFinal?: boolean
  onFlyToCoords?: (coords: [number, number]) => void
  onGenerateSitRep?: (params: any) => void
}

export default function SatelliteCorrelationCenter({
  incidentCoords,
  incidentName,
  incidentCounty = 'California',
  incidentStartedAt,
  incidentUpdatedAt,
  isFinal = false,
  onFlyToCoords,
  onGenerateSitRep
}: SatelliteCorrelationCenterProps) {
  const [activeSubTab, setActiveSubTab] = useState<'correlation' | 'validation' | 'imagery'>('correlation')
  
  // Configurable correlation parameters
  const [radiusKm, setRadiusKm] = useState<number>(10)
  const [timeWindowHours, setTimeWindowHours] = useState<number>(48)
  
  const [correlationData, setCorrelationData] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  
  // Validation cases state
  const [validationCases, setValidationCases] = useState<any[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState<string>('VAL-LIVE-01')
  
  // Satellite Imagery & Evidence View
  const [imageryLayers, setImageryLayers] = useState<any[]>([])
  const [selectedLayerId, setSelectedLayerId] = useState<string>('VIIRS_NOAA20_CorrectedReflectance_TrueColor')
  const [evidenceLinks, setEvidenceLinks] = useState<any>(null)

  // Fetch correlation data when coords or parameters change
  const runCorrelation = async (coords = incidentCoords, name = incidentName, started = incidentStartedAt) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.satelliteCorrelate({
        incident_coords: coords,
        incident_name: name,
        incident_started_at: started,
        incident_updated_at: incidentUpdatedAt,
        is_final: isFinal,
        radius_km: radiusKm,
        time_window_hours: timeWindowHours
      })
      setCorrelationData(res)
    } catch (err: any) {
      setError(err?.message || 'Satellite correlation request failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runCorrelation()
  }, [incidentCoords[0], incidentCoords[1], radiusKm, timeWindowHours])

  // Load validation suite & imagery catalog on mount
  useEffect(() => {
    api.satelliteValidationCases().then((res: any) => {
      if (res?.cases) setValidationCases(res.cases)
    }).catch(() => {})

    api.satelliteLayers().then((res: any) => {
      if (res?.layers) setImageryLayers(res.layers)
    }).catch(() => {})

    const obsDate = incidentStartedAt ? incidentStartedAt.slice(0, 10) : undefined
    api.satelliteEvidenceView(incidentCoords[0], incidentCoords[1], obsDate).then((res: any) => {
      if (res) setEvidenceLinks(res)
    }).catch(() => {})
  }, [incidentCoords[0], incidentCoords[1], incidentStartedAt])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CORRELATED':
        return {
          bg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
          dot: 'bg-emerald-400',
          label: 'CORRELATED'
        }
      case 'POSSIBLE_MATCH':
        return {
          bg: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
          dot: 'bg-amber-400',
          label: 'POSSIBLE MATCH'
        }
      case 'PENDING_CORROBORATION':
        return {
          bg: 'bg-sky-950/80 border-sky-500/50 text-sky-300',
          dot: 'bg-sky-400',
          label: 'PENDING CORROBORATION'
        }
      case 'UNMATCHED':
        return {
          bg: 'bg-stone-900 border-stone-700 text-stone-400',
          dot: 'bg-stone-500',
          label: 'NO MATCH IN WINDOW'
        }
      case 'DATA_UNAVAILABLE':
      default:
        return {
          bg: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
          dot: 'bg-rose-400',
          label: 'TELEMETRY UNAVAILABLE'
        }
    }
  }

  const badge = getStatusBadge(correlationData?.correlation_status || 'PENDING_CORROBORATION')

  return (
    <div className="rounded-xl bg-[#09110d] border border-[#172b20] p-3.5 space-y-3.5 text-xs text-[#cbd5d1]">
      {/* Header with Navigation Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#14261c] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#14291d] border border-[#224430] flex items-center justify-center text-[#4ade80]">
            <Satellite size={14} />
          </div>
          <div>
            <span className="font-bold text-[#f0fdf4] text-xs block">Satellite Evidence & Cross-Verification</span>
            <span className="text-[10px] text-[#718579] font-mono">NASA FIRMS VIIRS 375m & MODIS 1km · WGS-84 Haversine</span>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 bg-[#050c08] p-0.5 rounded-lg border border-[#13231a] text-[11px] font-mono">
          <button
            onClick={() => setActiveSubTab('correlation')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeSubTab === 'correlation' ? 'bg-[#153423] text-[#4ade80] font-bold shadow-xs' : 'text-[#718579] hover:text-white'
            }`}
          >
            Live Correlation
          </button>
          <button
            onClick={() => setActiveSubTab('validation')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeSubTab === 'validation' ? 'bg-[#153423] text-[#38bdf8] font-bold shadow-xs' : 'text-[#718579] hover:text-white'
            }`}
          >
            Validation Suite
          </button>
          <button
            onClick={() => setActiveSubTab('imagery')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeSubTab === 'imagery' ? 'bg-[#153423] text-[#f59e0b] font-bold shadow-xs' : 'text-[#718579] hover:text-white'
            }`}
          >
            Optical Imagery
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: LIVE SATELLITE-TO-INCIDENT CORRELATION */}
      {activeSubTab === 'correlation' && (
        <div className="space-y-3">
          {/* Target Banner & Classification Badge */}
          <div className="p-2.5 rounded-xl bg-[#0d1813] border border-[#1b3123] flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#718579] uppercase font-mono tracking-wider">Target Incident:</span>
                <span className="font-bold text-white text-xs">{incidentName}</span>
                <span className="text-[10px] text-[#94a3b8]">({incidentCounty})</span>
              </div>
              <div className="text-[10px] font-mono text-[#8b9f94] mt-0.5">
                Coordinates: [{incidentCoords[0].toFixed(5)}, {incidentCoords[1].toFixed(5)}]
                {incidentStartedAt && ` · Discovery: ${incidentStartedAt.slice(0, 16).replace('T', ' ')} UTC`}
              </div>
            </div>

            <div className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 text-[11px] font-mono font-bold ${badge.bg}`}>
              <span className={`w-2 h-2 rounded-full ${badge.dot} animate-pulse`} />
              <span>{badge.label}</span>
            </div>
          </div>

          {/* Configurable Search Sliders */}
          <div className="p-3 rounded-xl bg-[#0b1611] border border-[#172e22] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#4ade80] flex items-center gap-1">
                <SlidersHorizontal size={11} /> Configurable Search Corridor
              </span>
              <button
                onClick={() => runCorrelation()}
                disabled={loading}
                className="text-[10px] text-[#718579] hover:text-white flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
                <span>Re-query Feeds</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Radius Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8b9f94]">Geodesic Radius Filter</span>
                  <span className="font-mono font-bold text-[#38bdf8]">{radiusKm} km</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-full accent-[#38bdf8] h-1.5 bg-[#17271e] rounded-lg cursor-pointer"
                  aria-label="Search Radius"
                />
                <div className="flex justify-between text-[9px] text-[#55695f] font-mono">
                  <span>1 km (Point tight)</span>
                  <span>50 km (Regional swath)</span>
                </div>
              </div>

              {/* Time Window Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#8b9f94]">Observation Time Window</span>
                  <span className="font-mono font-bold text-[#f59e0b]">{timeWindowHours} hours</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={168}
                  step={6}
                  value={timeWindowHours}
                  onChange={(e) => setTimeWindowHours(Number(e.target.value))}
                  className="w-full accent-[#f59e0b] h-1.5 bg-[#17271e] rounded-lg cursor-pointer"
                  aria-label="Time Window"
                />
                <div className="flex justify-between text-[9px] text-[#55695f] font-mono">
                  <span>6 hours</span>
                  <span>168h (7 days)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Finding Explanation & Disclosures */}
          <div className="p-3 rounded-xl bg-[#0d1913] border border-[#193325] space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-[#f0fdf4] font-bold">
              <Info size={13} className="text-[#38bdf8] shrink-0" />
              <span>Scientific Cross-Verification Finding</span>
            </div>
            <p className="text-[11px] text-[#cbd5d1] leading-relaxed">
              {correlationData?.correlation_explanation || 'Analyzing satellite radiance signals across sensor platforms…'}
            </p>

            <div className="p-2 rounded-lg bg-[#070e0a] border border-[#14281e] space-y-1 text-[10px] text-[#8b9f94]">
              <div className="font-bold text-[#a7f3d0] flex items-center gap-1">
                <ShieldCheck size={11} className="text-[#10b981]" />
                <span>Epistemic Disclosure (No Negative Presumption)</span>
              </div>
              <div>
                Absence of an orbital detection is <strong>never treated as proof of no fire</strong>: VIIRS/MODIS overpasses occur 2–4 times per 24h. Heavy canopy, marine fog stratus, smoke plumes, or low-intensity ground fires can attenuate thermal infrared signatures.
              </div>
            </div>
          </div>

          {/* Matched Detections List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#f0fdf4] font-mono uppercase tracking-wider">
                Corroborating Detections in Corridor ({correlationData?.matched_detections_count ?? 0})
              </span>
              {correlationData?.closest_detection_distance_km !== null && (
                <span className="text-[10px] font-mono text-[#38bdf8]">
                  Closest: {correlationData?.closest_detection_distance_km} km
                </span>
              )}
            </div>

            {correlationData?.correlation_status === 'DATA_UNAVAILABLE' ? (
              <div className="p-3.5 rounded-xl bg-[#1c1212] border border-[#3d1f1f] text-center space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 text-[#f87171] font-bold text-xs">
                  <AlertTriangle size={13} className="shrink-0" />
                  <span>Satellite Telemetry Unavailable For Selected Window</span>
                </div>
                <p className="text-[11px] text-[#fca5a5] max-w-md mx-auto leading-relaxed">
                  {correlationData?.correlation_explanation || 'Historical incident requires NASA FIRMS Archive API records; live NRT stream retains rolling 24–48 hours only.'}
                </p>
                <span className="text-[10px] text-[#fda4af] font-mono block">
                  Preserves scientific separation: historical fires are never evaluated against contemporary NRT telemetry.
                </span>
              </div>
            ) : correlationData?.matched_detections && correlationData.matched_detections.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {correlationData.matched_detections.map((m: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#0c1813] border border-[#193325] hover:border-[#22c55e]/40 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🔥</span>
                        <div>
                          <span className="font-bold text-white text-[11px] block">{m.satellite} ({m.instrument})</span>
                          <span className="text-[10px] text-[#718579] font-mono">
                            Coords: [{m.longitude.toFixed(4)}, {m.latitude.toFixed(4)}] · Footprint: {m.scan || 0.4}x{m.track || 0.38} km
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#152e20] text-[#4ade80] border border-[#22c55e]/30 block">
                          {m.distance_km} km away
                        </span>
                        {m.match_score !== undefined && (
                          <span className="text-[9px] font-mono text-[#fbbf24] mt-0.5 block" title="Heuristic spatial-temporal match score (formula documented)">
                            Match: {m.match_score}/100 [Cat C]
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-[10px] font-mono bg-[#070e0a] p-1.5 rounded border border-[#13231a]">
                      <div>
                        <span className="text-[#718579] block">Overpass UTC</span>
                        <span className="text-[#f0fdf4]">{m.acq_date} {m.acq_time}</span>
                      </div>
                      <div>
                        <span className="text-[#718579] block">Brightness</span>
                        <span className="text-[#f97316] font-bold">{m.brightness ?? '?'} K</span>
                      </div>
                      <div>
                        <span className="text-[#718579] block">Radiative Power</span>
                        <span className="text-[#ef4444] font-bold">{m.frp ? `${m.frp} MW` : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[#718579] block">Confidence</span>
                        <span className="text-[#38bdf8] font-bold uppercase">{m.confidence}</span>
                      </div>
                    </div>

                    {onFlyToCoords && (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => onFlyToCoords([m.longitude, m.latitude])}
                          className="text-[10px] font-mono text-[#4ade80] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Crosshair size={10} /> Focus Detection on Map
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#09140f] border border-[#16291e] text-center space-y-1.5">
                <span className="text-[#718579] block text-xs">No satellite detections found within {radiusKm} km search radius.</span>
                <span className="text-[10px] text-[#55695f] block">
                  {correlationData?.nearest_satellite_hotspot_overall 
                    ? `Nearest active California satellite detection is ${correlationData.nearest_satellite_hotspot_overall.distance_km} km away.` 
                    : 'All satellite passes in this corridor report zero thermal anomalies.'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: AUDITABLE VALIDATION SUITE */}
      {activeSubTab === 'validation' && (
        <div className="space-y-3">
          <div className="p-2.5 rounded-xl bg-[#0b1611] border border-[#182e22] space-y-1">
            <span className="font-bold text-[#f0fdf4] text-xs block">Official Incident & Detection Validation Suite</span>
            <p className="text-[11px] text-[#cbd5d1]">
              Auditable benchmark cases combining confirmed CAL FIRE incident CAD logs and NASA FIRMS observations. Includes both positive matches, pending corroborations, and negative controls.
            </p>
          </div>

          <div className="space-y-2">
            {validationCases.map((c) => (
              <div
                key={c.case_id}
                onClick={() => {
                  setSelectedCaseId(c.case_id)
                  runCorrelation(c.coordinates, c.incident_name, c.started_at)
                  if (onFlyToCoords) onFlyToCoords(c.coordinates)
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedCaseId === c.case_id
                    ? 'bg-[#12281c] border-[#22c55e] shadow-md'
                    : 'bg-[#0b1410] border-[#16291e] hover:border-[#224430]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-[#4ade80]">{c.case_id}</span>
                      <span className="text-xs font-bold text-white">{c.incident_name}</span>
                      <span className="text-[10px] text-[#718579]">({c.county})</span>
                    </div>
                    <div className="text-[10px] font-mono text-[#8b9f94] mt-0.5">
                      {c.official_source} · Started: {c.started_at} · {c.acres_burned} acres
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                    c.type === 'CURRENT_LIVE_INCIDENT' ? 'bg-[#102218] text-[#4ade80] border border-[#22c55e]/30' :
                    c.type === 'HISTORICAL_BENCHMARK' ? 'bg-[#1e293b] text-[#38bdf8] border border-[#0284c7]/30' :
                    'bg-[#261010] text-[#f87171] border border-[#ef4444]/30'
                  }`}>
                    {c.type.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="mt-2 text-[10px] text-[#cbd5d1] bg-[#070e0a] p-2 rounded border border-[#13231a]">
                  <strong className="text-[#a7f3d0]">Audit Objective: </strong>{c.provenance_notes}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: AUTHORITATIVE SATELLITE OPTICAL IMAGERY */}
      {activeSubTab === 'imagery' && (
        <div className="space-y-3">
          <div className="p-2.5 rounded-xl bg-[#0b1611] border border-[#182e22] space-y-1">
            <span className="font-bold text-[#f0fdf4] text-xs block">NASA GIBS Satellite Optical & False-Color Layers</span>
            <p className="text-[11px] text-[#cbd5d1]">
              Authoritative earth-observation composites rendered directly from NASA Global Imagery Browse Services (GIBS). Never synthetic.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {imageryLayers.map((layer) => (
              <div
                key={layer.id}
                className={`p-3 rounded-xl border space-y-2 ${
                  selectedLayerId === layer.id ? 'bg-[#102419] border-[#22c55e]/60' : 'bg-[#0b1410] border-[#16291e]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                        layer.category === 'B' ? 'bg-sky-950 text-sky-400 border border-sky-600/40' : 'bg-amber-950 text-amber-400 border border-amber-600/40'
                      }`}>
                        Category {layer.category}
                      </span>
                      <span className="font-bold text-white text-xs">{layer.name}</span>
                    </div>
                    <div className="text-[10px] font-mono text-[#718579] mt-0.5">
                      Sensor: {layer.sensor} · Spatial Resolution: {layer.spatial_resolution}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#4ade80] px-1.5 py-0.5 rounded bg-[#07130c] border border-[#1b3d2b]">
                    {layer.status}
                  </span>
                </div>

                <p className="text-[11px] text-[#cbd5d1] leading-relaxed">
                  {layer.description}
                </p>

                <div className="text-[10px] text-[#8b9f94] bg-[#070e0a] p-2 rounded border border-[#13231a]">
                  <strong>Cadence & Disclosures: </strong>{layer.cadence}. {layer.scientific_disclosures}
                </div>
              </div>
            ))}
          </div>

          {/* Deep Links to NASA Worldview & FIRMS Fire Map */}
          {evidenceLinks && (
            <div className="p-3 rounded-xl bg-[#0e1814] border border-[#1a3325] space-y-2">
              <span className="font-bold text-white text-xs block">External Authoritative Audit Portals</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-xs">
                <a
                  href={evidenceLinks.worldview_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-lg bg-[#070e0a] border border-[#1a3627] hover:border-[#4ade80] text-[#38bdf8] flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <ExternalLink size={12} /> NASA Worldview Live Swath
                  </span>
                  <span className="text-[10px] text-[#718579]">Interactive Optical</span>
                </a>

                <a
                  href={evidenceLinks.firms_map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-lg bg-[#070e0a] border border-[#1a3627] hover:border-[#4ade80] text-[#f97316] flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <ExternalLink size={12} /> NASA FIRMS Fire Map
                  </span>
                  <span className="text-[10px] text-[#718579]">Full Continental VIIRS</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Research & Decision-Support Advisory Notice */}
      <div className="p-2 rounded-lg bg-[#070e0a] border border-[#14231b] text-[10px] text-[#718579] flex items-center gap-1.5">
        <Info size={12} className="text-[#38bdf8] shrink-0" />
        <span>
          <strong>Operational Notice:</strong> TERRAVOX is an environmental intelligence research &amp; decision-support prototype. Official wildfire containment and evacuation directives remain under CAL FIRE, county sheriff, and Cal OES authority.
        </span>
      </div>

      {/* Action Footer: Situation Report Generator Link */}
      {onGenerateSitRep && (
        <div className="pt-1 border-t border-[#14261c] flex justify-end">
          <button
            onClick={() => onGenerateSitRep({
              incident_coords: incidentCoords,
              incident_name: incidentName,
              county: incidentCounty,
              correlation_radius_km: radiusKm,
              correlation_time_window_hours: timeWindowHours
            })}
            className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[#07130c] font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <FileText size={13} />
            <span>Generate Grounded Situation Report</span>
          </button>
        </div>
      )}
    </div>
  )
}
