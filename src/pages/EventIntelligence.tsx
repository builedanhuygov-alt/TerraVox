import { Link, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useGeographyStore } from '../store/useGeographyStore'
import { 
  Flame, 
  ShieldAlert, 
  Satellite, 
  Eye, 
  ArrowRight, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Activity,
  Wind,
  Droplets,
  Compass,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
  Layers,
  MapPin
} from 'lucide-react'
import { NFDRS_HAZARD_SCALE, EnvironmentalIncident, HazardLevel } from '../config/geography'

export default function EventIntelligence() {
  const { id } = useParams<{ id?: string }>()
  const { activeRegion, activeRegionId, selectedIncidentId, selectIncident } = useGeographyStore()

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'THERMAL_ANOMALY' | 'CONFIRMED_WILDFIRE' | 'HISTORICAL_LANDMARK'>('ALL')
  const [severityFilter, setSeverityFilter] = useState<string>('ALL')

  // Selected incident from URL or store
  const targetId = id || selectedIncidentId || activeRegion.incidents[0]?.id
  const incident = activeRegion.incidents.find(i => i.id === targetId) || activeRegion.incidents[0]

  const filteredIncidents = activeRegion.incidents.filter(inc => {
    if (activeFilter !== 'ALL' && inc.category !== activeFilter) return false
    if (severityFilter !== 'ALL' && inc.hazardLevel !== severityFilter) return false
    return true
  })

  const hazard = incident ? NFDRS_HAZARD_SCALE[incident.hazardLevel] : NFDRS_HAZARD_SCALE['III']

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumb & Regional Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1a3327] pb-4">
        <div>
          <div className="text-xs font-mono text-[#8b9f94] flex items-center gap-2">
            <span>{activeRegion.name}</span>
            <span>/</span>
            <span className="text-[#a3e635]">Incident Intelligence Dossiers</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#f0fdf4] mt-1">
            Evidence-Grounded Incident Analysis
          </h1>
          <p className="text-xs text-[#8b9f94] mt-0.5">
            Cross-referencing satellite radiometry, surface micrometeorology, fuel moisture models, and field verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/map"
            className="px-3 py-1.5 rounded-lg border border-[#1f4231] bg-[#0b1611] text-xs font-mono text-stone-300 hover:text-[#f0fdf4] hover:border-[#22c55e] transition flex items-center gap-1.5"
          >
            <MapPin size={13} className="text-[#22c55e]" />
            <span>View on Radar</span>
          </Link>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('ecochain-open-ai', { detail: { query: `Provide structured forensic analysis for incident ${incident?.title}.` } }))}
            className="px-3 py-1.5 rounded-lg bg-[#142d22] hover:bg-[#1a382b] border border-[#234d3a] text-xs font-semibold text-[#4ade80] transition flex items-center gap-1.5"
          >
            <Sparkles size={13} className="text-[#a3e635]" />
            <span>AI Evidence Audit</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Column Incident Selector, Right Column 9-Point Evidence Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Cols: Filterable Incident Queue */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#0b1611] border border-[#1a3327] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
                <Filter size={13} className="text-[#22c55e]" />
                <span>Incident Queue</span>
              </span>
              <span className="text-[10px] font-mono text-[#718579]">{filteredIncidents.length} events</span>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1 text-[11px] font-mono">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-2 py-1 rounded transition ${
                  activeFilter === 'ALL'
                    ? 'bg-[#22c55e] text-[#070f0b] font-bold'
                    : 'bg-[#070f0b] text-[#718579] hover:text-[#e6ede9] border border-[#172b22]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter('THERMAL_ANOMALY')}
                className={`px-2 py-1 rounded transition ${
                  activeFilter === 'THERMAL_ANOMALY'
                    ? 'bg-[#22c55e] text-[#070f0b] font-bold'
                    : 'bg-[#070f0b] text-[#718579] hover:text-[#e6ede9] border border-[#172b22]'
                }`}
              >
                Hotspots
              </button>
              <button
                onClick={() => setActiveFilter('HISTORICAL_LANDMARK')}
                className={`px-2 py-1 rounded transition ${
                  activeFilter === 'HISTORICAL_LANDMARK'
                    ? 'bg-[#22c55e] text-[#070f0b] font-bold'
                    : 'bg-[#070f0b] text-[#718579] hover:text-[#e6ede9] border border-[#172b22]'
                }`}
              >
                Historical Studies
              </button>
            </div>

            {/* Incident Cards */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredIncidents.map(inc => {
                const hz = NFDRS_HAZARD_SCALE[inc.hazardLevel]
                const isSelected = incident?.id === inc.id
                return (
                  <div
                    key={inc.id}
                    onClick={() => selectIncident(inc.id)}
                    className={`p-3 rounded-lg border transition cursor-pointer text-xs space-y-1.5 ${
                      isSelected
                        ? 'bg-[#12281e] border-[#22c55e] text-[#f0fdf4]'
                        : 'bg-[#070f0b] border-[#172b22] text-[#8b9f94] hover:border-[#1f4231] hover:text-[#e6ede9]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-stone-100 line-clamp-1">{inc.title}</span>
                      <span
                        className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0"
                        style={{ color: hz.color, borderColor: hz.border, backgroundColor: hz.bg }}
                      >
                        Level {inc.hazardLevel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#718579]">
                      <span>{inc.sectorName}</span>
                      <span className="font-mono">
                        {new Date(inc.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-[#14281f]">
                      <span className="text-[#a3e635]">{inc.category.replace('_', ' ')}</span>
                      <span className="text-stone-400">Confidence: {Math.round(inc.confidenceScore * 100)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right 8 Cols: Detailed 9-Point Evidence Workspace */}
        <div className="lg:col-span-8 space-y-5">
          {incident ? (
            <div className="space-y-5">
              {/* Incident Header Card */}
              <div className="bg-[#0b1611] border border-[#1a3327] rounded-xl p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#14281f] pb-3">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span 
                        className="px-2 py-0.5 rounded font-bold border"
                        style={{ color: hazard.color, borderColor: hazard.border, backgroundColor: hazard.bg }}
                      >
                        NFDRS LEVEL {hazard.level} · {hazard.label.toUpperCase()}
                      </span>
                      <span className="text-[#718579]">·</span>
                      <span className="text-stone-300 font-semibold">{incident.status}</span>
                      <span className="text-[#718579]">·</span>
                      <span className="text-[#4ade80]">{Math.round(incident.confidenceScore * 100)}% TELEMETRY CONFIDENCE</span>
                    </div>
                    <h2 className="text-xl font-bold text-stone-100 mt-1.5">{incident.title}</h2>
                  </div>

                  <span className="text-xs font-mono text-stone-400 self-start sm:self-auto">
                    {new Date(incident.timestamp).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>

                {/* Section 1 & 2: Summary, Location & Environmental Profile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-[#070f0b] border border-[#172b22] space-y-1">
                    <span className="text-[10px] font-mono text-[#718579] uppercase">Geographic Location</span>
                    <div className="text-stone-200 font-semibold">{incident.sectorName}</div>
                    <div className="text-[11px] font-mono text-[#4ade80]">
                      {Math.abs(incident.coordinates[1]).toFixed(4)}°N, {Math.abs(incident.coordinates[0]).toFixed(4)}°W
                    </div>
                    <div className="text-[11px] text-[#718579] pt-1">
                      Sensor: <span className="text-stone-300 font-mono">{incident.satelliteSensor || 'VIIRS'}</span>
                      {incident.estimatedAreaHa && (
                        <span> · Footprint: <span className="font-mono text-stone-300">{incident.estimatedAreaHa} ha</span></span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#070f0b] border border-[#172b22] space-y-1">
                    <span className="text-[10px] font-mono text-[#718579] uppercase">Weather & Fuel Context</span>
                    <div className="text-stone-200">
                      Temp: <b className="font-mono text-stone-100">{incident.weatherContext.tempF}°F</b> ({incident.weatherContext.tempC}°C)
                    </div>
                    <div className="text-[11px] text-[#f97316] font-mono">
                      Relative Humidity: {incident.weatherContext.relativeHumidityPct}% · Wind: {incident.weatherContext.windSpeedMph} mph (Gust {incident.weatherContext.windGustMph} mph)
                    </div>
                    <div className="text-[11px] text-[#718579] pt-1">
                      Wind Corridor: <span className="text-stone-300">{incident.weatherContext.windDirection}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strict Evidence Categorization: 
                  Facts, Measurements, Model Outputs, Hypotheses, Recommendations */}
              <div className="space-y-4">
                {/* 1. Verified Facts & In-Situ Measurements */}
                <div className="bg-[#0b1611] border border-[#1a3327] rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-bold uppercase">
                      VERIFIED FACTS &amp; IN-SITU OBSERVATIONS
                    </span>
                  </div>
                  <ul className="text-xs text-stone-300 space-y-1.5 pl-4 list-disc leading-relaxed">
                    {incident.evidenceChain.observedFacts.map((fact, idx) => (
                      <li key={idx}>
                        <span className="text-stone-100">{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 2. Satellite Telemetry & Remote Sensing */}
                <div className="bg-[#0b1611] border border-[#1a3327] rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/80 border border-sky-700/60 text-sky-300 font-bold uppercase">
                      SATELLITE TELEMETRY &amp; MULTI-SPECTRAL DATA
                    </span>
                  </div>
                  <ul className="text-xs text-stone-300 space-y-1.5 pl-4 list-disc leading-relaxed">
                    {incident.evidenceChain.satelliteTelemetry.map((sat, idx) => (
                      <li key={idx}>
                        <span className="text-stone-100">{sat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. Model Inferences & Propagation Physics */}
                <div className="bg-[#0b1611] border border-[#1a3327] rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/60 text-amber-300 font-bold uppercase">
                      MODEL INFERENCES &amp; PREDICTIVE RISK DYNAMICS
                    </span>
                  </div>
                  <ul className="text-xs text-stone-300 space-y-1.5 pl-4 list-disc leading-relaxed">
                    {incident.evidenceChain.modelInferences.map((inf, idx) => (
                      <li key={idx}>
                        <span className="text-stone-100">{inf}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 4. Missing Information & Limitations */}
                <div className="bg-[#0b1611] border border-[#1a3327] rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 border border-rose-700/60 text-rose-300 font-bold uppercase">
                      MISSING INFORMATION &amp; UNCERTAINTIES
                    </span>
                  </div>
                  <ul className="text-xs text-stone-400 space-y-1.5 pl-4 list-disc leading-relaxed">
                    {incident.evidenceChain.uncertainties.map((unc, idx) => (
                      <li key={idx}>
                        <span>{unc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 5. Recommended Field Actions */}
                <div className="bg-[#0b1611] border border-[#1a3327] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#162c20] border border-[#234d3a] text-[#4ade80] font-bold uppercase">
                      RECOMMENDED VERIFICATION &amp; DISPATCH ACTIONS
                    </span>
                    <Link
                      to="/missions"
                      className="text-xs font-mono text-[#a3e635] hover:underline flex items-center gap-1"
                    >
                      <span>Task Field Units &rarr;</span>
                    </Link>
                  </div>
                  <ul className="text-xs text-stone-200 space-y-1.5 pl-4 list-disc leading-relaxed">
                    {incident.evidenceChain.recommendedActions.map((act, idx) => (
                      <li key={idx}>
                        <span className="text-stone-100 font-medium">{act}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2 border-t border-[#172b22] flex items-center justify-between text-[11px] text-[#718579] font-mono">
                    <span>Source Authority: <strong className="text-stone-300">{incident.officialSource}</strong></span>
                    {incident.officialUrl && (
                      <a 
                        href={incident.officialUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[#4ade80] hover:underline flex items-center gap-1"
                      >
                        <span>Official Archive</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-[#0b1611] border border-[#1a3327] text-center text-stone-400 text-xs">
              Select an incident from the queue to inspect its complete multi-spectral evidence chain.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const EventsList = EventIntelligence

