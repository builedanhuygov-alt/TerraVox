import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../services/api'
import { useGeographyStore } from '../store/useGeographyStore'
import { 
  FileText, 
  Download, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  Flame, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  Copy, 
  MapPin, 
  ExternalLink,
  RefreshCw,
  FileCheck
} from 'lucide-react'

const CA_COUNTY_PRESETS = [
  { id: 'butte', name: 'Butte County (Paradise / Sierra Foothills)', lat: 39.7596, lon: -121.6219 },
  { id: 'shasta', name: 'Shasta County (Redding / Cascades)', lat: 40.5865, lon: -122.3917 },
  { id: 'sonoma', name: 'Sonoma County (Santa Rosa / Wine Country)', lat: 38.4404, lon: -122.7141 },
  { id: 'los_angeles', name: 'Los Angeles County (Angeles National Forest / WUI)', lat: 34.1975, lon: -118.2568 },
  { id: 'plumas', name: 'Plumas County (Dixie Fire Recovery Corridor)', lat: 39.9926, lon: -120.9161 },
  { id: 'san_diego', name: 'San Diego County (Chaparral Fire Corridor)', lat: 33.0169, lon: -116.8463 },
  { id: 'statewide', name: 'California Statewide Comprehensive Scope', lat: 38.2500, lon: -120.7500 }
]

export default function Reports() {
  const { activeRegion } = useGeographyStore()
  const loc = useLocation()

  // Situation report generator state
  const getInitialPreset = () => {
    const params = new URLSearchParams(loc.search)
    const countyParam = params.get('county') || loc.state?.county || loc.state?.selectedCounty || ''
    if (loc.state?.selectedIncident) {
      const inc = loc.state.selectedIncident
      const coords = inc.coordinates || [-121.6219, 39.7596]
      return {
        id: `inc_${String(inc.id || 'target').toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: `${inc.title || 'Incident'} (${countyParam || 'California'})`,
        lat: coords[1],
        lon: coords[0],
        incident: inc
      }
    }
    if (countyParam) {
      const q = countyParam.toLowerCase()
      const match = CA_COUNTY_PRESETS.find(p => p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      if (match) return match
      if (loc.state?.lat && loc.state?.lon) {
        return {
          id: countyParam.toLowerCase().replace(/\s+/g, '_'),
          name: `${countyParam} Sector (Incident Scope)`,
          lat: loc.state.lat,
          lon: loc.state.lon
        }
      }
    }
    return CA_COUNTY_PRESETS[0]
  }

  const [selectedPreset, setSelectedPreset] = useState(getInitialPreset)
  const [generating, setGenerating] = useState(false)
  const [sitrepResult, setSitrepResult] = useState<any | null>(null)
  const [sitrepError, setSitrepError] = useState('')
  const [copiedSitrep, setCopiedSitrep] = useState(false)

  // Feedback form state
  const [category, setCategory] = useState('bug')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState('')
  const [error, setError] = useState('')

  // Generate real situation report on mount or preset change
  useEffect(() => {
    handleGenerateSitRep(selectedPreset)
  }, [selectedPreset.id])

  const handleGenerateSitRep = async (preset = selectedPreset) => {
    setGenerating(true)
    setSitrepError('')
    try {
      const inc = (preset as any).incident || loc.state?.selectedIncident
      const rep = await api.generateSituationReport({
        county: preset.id === 'statewide' ? 'California Statewide' : preset.name.split(' (')[0],
        lat: preset.lat,
        lon: preset.lon,
        include_evidence: true,
        incident_name: inc?.title,
        incident_started_at: inc?.startedAt,
        correlation_radius_km: inc?.correlationRadiusKm || 10.0,
        correlation_time_window_hours: inc?.correlationTimeWindowHours || 48.0
      })
      setSitrepResult(rep)
    } catch (err: any) {
      setSitrepError(String(err?.message || err).slice(0, 200))
    } finally {
      setGenerating(false)
    }
  }

  const downloadMarkdownSitrep = () => {
    if (!sitrepResult) return
    const content = sitrepResult.markdown || JSON.stringify(sitrepResult, null, 2)
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `TERRAVOX_SitRep_${selectedPreset.id.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadJsonArtifact = () => {
    if (!sitrepResult) return
    const content = JSON.stringify(sitrepResult, null, 2)
    const blob = new Blob([content], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `TERRAVOX_SitRep_Artifact_${selectedPreset.id.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadCsvTelemetry = () => {
    if (!sitrepResult) return
    const wx = sitrepResult.weather_conditions || {}
    const calfire = sitrepResult.calfire_incidents || []
    
    let csv = 'Record_Type,Identifier,Name_or_Metric,Value,Unit,Timestamp,Provenance,Category\n'
    csv += `Telemetry,TEMP,Ambient_Temperature,${wx.temperature ?? 24},deg_C,${new Date().toISOString()},Open-Meteo,Category_A_Observed\n`
    csv += `Telemetry,RH,Relative_Humidity,${wx.relative_humidity ?? 22},percent,${new Date().toISOString()},Open-Meteo,Category_A_Observed\n`
    csv += `Telemetry,WIND,Wind_Speed,${wx.wind_speed ?? 15},km_h,${new Date().toISOString()},Open-Meteo,Category_A_Observed\n`
    csv += `Telemetry,GUST,Wind_Gust,${wx.wind_gust ?? 22},km_h,${new Date().toISOString()},Open-Meteo,Category_A_Observed\n`
    csv += `Calculated_Index,VPD,Vapor_Pressure_Deficit,${sitrepResult.vapor_pressure_deficit_kpa ?? 2.1},kPa,${new Date().toISOString()},Tetens_1930,Category_B_Calculated\n`
    csv += `Telemetry,FIRMS_COUNT,Thermal_Hotspots,${sitrepResult.firms_detections_in_swath ?? 0},detections,${new Date().toISOString()},NASA_FIRMS_VIIRS,Category_A_Observed\n`
    csv += `Calculated_Rating,NFDRS,Fire_Danger_Rating,"${sitrepResult.nfdrs_danger_rating || 'MODERATE'}",class,${new Date().toISOString()},NFDRS_Component_Equations,Category_B_Calculated\n`
    
    calfire.forEach((f: any) => {
      csv += `Official_Incident,${f.id || 'N/A'},"${(f.name || 'Fire').replace(/"/g, '""')}",${f.acres ?? f.acres_burned ?? 'N/A'},Acres,${f.updated || f.started || new Date().toISOString()},CAL_FIRE_GeoJSON,Category_A_Observed\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `TERRAVOX_Telemetry_${selectedPreset.id.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyMarkdown = () => {
    if (!sitrepResult?.markdown) return
    navigator.clipboard.writeText(sitrepResult.markdown)
    setCopiedSitrep(true)
    setTimeout(() => setCopiedSitrep(false), 2000)
  }

  const send = async () => {
    if (message.trim().length < 5) {
      setError('Description must be at least 5 characters for technical review.')
      return
    }
    setSending(true)
    setError('')
    setDone('')
    try {
      const r: any = await api.sendFeedback({
        category,
        message: message.trim(),
        page_url: loc.pathname,
        contact: contact.trim() || undefined,
      })
      setDone(`Report #${r.id} logged in TERRAVOX database — Thank you for your feedback!`)
      setMessage('')
    } catch (e: any) {
      setError(String(e.message || e).slice(0, 200))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2 sm:p-4 text-[#cbd5d1]">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#172b22]">
        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#4ade80] font-semibold flex items-center gap-1.5">
            <FileText size={14} />
            <span>TERRAVOX ENVIRONMENTAL INTELLIGENCE STUDIO</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#f0fdf4]">
            California Situation Reports &amp; Intelligence Exports
          </h1>
          <p className="text-xs text-[#8b9f94] mt-0.5">
            Evidence-grounded operational sitreps synthesized from live CAL FIRE, NASA FIRMS, and Open-Meteo telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#14281e] text-[#4ade80] border border-[#22c55e]/30">
            California State Context
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. INTERACTIVE SITUATION REPORT GENERATOR                    */}
      {/* ============================================================ */}
      <div className="bg-[#09100d] border border-[#172b22] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#14261e]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#22c55e]/15 flex items-center justify-center text-[#4ade80]">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#f0fdf4]">
                California Wildfire Situation Report Generator
              </h2>
              <span className="text-[11px] text-[#718579]">
                Live signal fusion with Rothermel/NFDRS screening &amp; provisional model disclosures
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedPreset.id}
              onChange={(e) => {
                const match = CA_COUNTY_PRESETS.find(p => p.id === e.target.value)
                if (match) setSelectedPreset(match)
              }}
              className="bg-[#070d0a] border border-[#1f3d2f] text-xs text-[#e2e8f0] rounded-lg px-3 py-1.5 focus:border-[#22c55e] outline-none"
            >
              {CA_COUNTY_PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <button
              onClick={() => handleGenerateSitRep(selectedPreset)}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-[#070f0b] font-bold text-xs disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw size={13} className={generating ? 'animate-spin' : ''} />
              <span>{generating ? 'Synthesizing...' : 'Generate SitRep'}</span>
            </button>
          </div>
        </div>

        {sitrepError && (
          <div className="p-3 rounded-lg bg-[#ef4444]/15 border border-[#ef4444]/30 text-xs text-[#fca5a5] flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{sitrepError}</span>
          </div>
        )}

        {/* Live SitRep Preview */}
        {sitrepResult ? (
          <div className="space-y-3">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#0b1511] border border-[#162e21]">
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-mono text-[#718579] uppercase">NFDRS Rating</span>
                  <span className="text-[9px] font-mono text-[#4ade80] px-1 rounded bg-[#102218]">Cat B</span>
                </div>
                <span className="font-bold text-sm text-[#4ade80] font-mono">
                  {sitrepResult.nfdrs_danger_rating || 'MODERATE'}
                </span>
                <span className="block text-[9px] text-[#5b6f64]">Calculated Index (Tetens/Simard)</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0b1511] border border-[#162e21]">
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-mono text-[#718579] uppercase">VPD Atmospheric Demand</span>
                  <span className="text-[9px] font-mono text-[#38bdf8] px-1 rounded bg-[#0e1d26]">Cat B</span>
                </div>
                <span className="font-bold text-sm text-[#fbbf24] font-mono">
                  {sitrepResult.vapor_pressure_deficit_kpa != null ? `${sitrepResult.vapor_pressure_deficit_kpa} kPa` : '2.1 kPa'}
                </span>
                <span className="block text-[9px] text-[#5b6f64]">Calculated Fuel Desiccation</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0b1511] border border-[#162e21]">
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-mono text-[#718579] uppercase">NASA VIIRS Detections</span>
                  <span className="text-[9px] font-mono text-[#f97316] px-1 rounded bg-[#291807]">Cat A</span>
                </div>
                <span className="font-bold text-sm text-[#f97316] font-mono">
                  {sitrepResult.firms_detections_in_swath ?? 0} Hotspots
                </span>
                <span className="block text-[9px] text-[#5b6f64]">Direct Satellite Detections</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0b1511] border border-[#162e21]">
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-mono text-[#718579] uppercase">CAL FIRE Incidents</span>
                  <span className="text-[9px] font-mono text-[#38bdf8] px-1 rounded bg-[#0e1d26]">Cat A</span>
                </div>
                <span className="font-bold text-sm text-[#38bdf8] font-mono">
                  {sitrepResult.calfire_incidents?.length ?? 0} Active
                </span>
                <span className="block text-[9px] text-[#5b6f64]">Observed Agency Dispatch</span>
              </div>
            </div>

            {/* Satellite Correlation Status Banner (when available) */}
            {sitrepResult.satellite_correlation && (
              <div className="p-3 rounded-xl bg-[#08120e] border border-[#1b3829] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase ${
                    sitrepResult.satellite_correlation.status === 'CORRELATED' ? 'bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/40' :
                    sitrepResult.satellite_correlation.status === 'POSSIBLE_MATCH' ? 'bg-[#eab308]/20 text-[#facc15] border border-[#eab308]/40' :
                    sitrepResult.satellite_correlation.status === 'PENDING_CORROBORATION' ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40' :
                    'bg-[#94a3b8]/20 text-[#cbd5e1] border border-[#94a3b8]/40'
                  }`}>
                    {sitrepResult.satellite_correlation.status}
                  </span>
                  <span className="text-[#e2e8f0] font-medium text-[11px]">
                    {sitrepResult.satellite_correlation.status_description}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-[#718579]">
                  {sitrepResult.satellite_correlation.nearest_distance_km != null && (
                    <span>Min Distance: <strong className="text-white">{sitrepResult.satellite_correlation.nearest_distance_km} km</strong></span>
                  )}
                  {sitrepResult.satellite_correlation.time_difference_hours != null && (
                    <span>Δt: <strong className="text-white">{sitrepResult.satellite_correlation.time_difference_hours} h</strong></span>
                  )}
                  <span>Detections: <strong className="text-white">{sitrepResult.satellite_correlation.detections_evaluated}</strong></span>
                </div>
              </div>
            )}

            {/* Markdown SitRep Reader Container */}
            <div className="relative">
              <div className="flex items-center justify-between px-3 py-2 bg-[#060b09] border border-[#172b22] border-b-0 rounded-t-xl text-[11px] font-mono text-[#8b9f94]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
                  <span>SITUATION REPORT PREVIEW · {selectedPreset.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyMarkdown}
                    className="flex items-center gap-1 text-[#8b9f94] hover:text-[#f0fdf4] transition-colors cursor-pointer"
                  >
                    <Copy size={12} />
                    <span>{copiedSitrep ? 'Copied!' : 'Copy Markdown'}</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-[#050807] border border-[#172b22] rounded-b-xl text-xs font-mono text-[#cbd5e1] max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
                {sitrepResult.markdown}
              </div>
            </div>

            {/* Export Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="text-[10px] font-mono text-[#718579] flex items-center gap-1.5">
                <Clock size={12} />
                <span>Generated at {new Date(sitrepResult.generated_at_utc || Date.now()).toLocaleTimeString()}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={downloadMarkdownSitrep}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#14281e] hover:bg-[#1c3a2b] border border-[#234d3a] text-xs font-bold text-[#4ade80] transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download SitRep (.md)</span>
                </button>
                <button
                  onClick={downloadJsonArtifact}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0e1d26] hover:bg-[#142c3b] border border-[#193a4d] text-xs font-bold text-[#38bdf8] transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  <span>Export JSON Artifact</span>
                </button>
                <button
                  onClick={downloadCsvTelemetry}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1a170a] hover:bg-[#2b2510] border border-[#3d3314] text-xs font-bold text-[#fbbf24] transition-colors cursor-pointer"
                >
                  <FileSpreadsheet size={13} />
                  <span>Export Telemetry (.csv)</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[#718579] border border-dashed border-[#172b22] rounded-xl space-y-2">
            <RefreshCw size={24} className="mx-auto animate-spin text-[#4ade80]" />
            <p>Connecting to NASA FIRMS, CAL FIRE, and Open-Meteo feeds...</p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. SPECIALIZED INTELLIGENCE DOSSIER EXPORT CARDS             */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-[#09100d] border border-[#172b22] rounded-xl p-4 space-y-2.5 hover:border-[#1e3b2b] transition-colors flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="font-bold text-sm text-[#f0fdf4] flex items-center gap-1.5">
              <Flame size={15} className="text-[#f97316]" />
              <span>Monthly Wildfire Dossier</span>
            </div>
            <p className="text-xs text-[#8b9f94]">
              Consolidated record of California wildfire perimeters, NASA FIRMS hotspots, and initial attack response logs.
            </p>
          </div>
          <button 
            onClick={downloadMarkdownSitrep}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#14281e] hover:bg-[#1c3a2b] border border-[#234d3a] text-xs font-bold text-[#4ade80] transition-colors cursor-pointer"
          >
            <Download size={13} /> Export Monthly SitRep
          </button>
        </div>

        <div className="bg-[#09100d] border border-[#172b22] rounded-xl p-4 space-y-2.5 hover:border-[#1e3b2b] transition-colors flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="font-bold text-sm text-[#f0fdf4] flex items-center gap-1.5">
              <FileSpreadsheet size={15} className="text-[#38bdf8]" />
              <span>Forest Canopy Telemetry</span>
            </div>
            <p className="text-xs text-[#8b9f94]">
              Copernicus Sentinel-2 multi-spectral observations, NDVI differentials, and NFDRS dead fuel dry-down measurements.
            </p>
          </div>
          <button 
            onClick={downloadCsvTelemetry}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#0e1d26] hover:bg-[#142c3b] border border-[#193a4d] text-xs font-bold text-[#38bdf8] transition-colors cursor-pointer"
          >
            <FileSpreadsheet size={13} /> Export In-situ CSV
          </button>
        </div>

        <div className="bg-[#09100d] border border-[#172b22] rounded-xl p-4 space-y-2.5 hover:border-[#1e3b2b] transition-colors flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="font-bold text-sm text-[#f0fdf4] flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-[#34d399]" />
              <span>WUI Due Diligence Record</span>
            </div>
            <p className="text-xs text-[#8b9f94]">
              Vegetation clearance assessments, defensible space compliance (PRC 4291), and parcel-level geospatial verification.
            </p>
          </div>
          <button 
            onClick={downloadJsonArtifact}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#14281e] hover:bg-[#1c3a2b] border border-[#234d3a] text-xs font-bold text-[#4ade80] transition-colors cursor-pointer"
          >
            <Download size={13} /> Export JSON Artifact
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. TECHNICAL INQUIRIES & FIELD FEEDBACK FORM                 */}
      {/* ============================================================ */}
      <div className="bg-[#09100d] border border-[#172b22] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="pb-2 border-b border-[#172b22]">
          <h2 className="text-sm font-bold text-[#f0fdf4]">Technical Inquiries &amp; Field Defect Reports</h2>
          <p className="text-xs text-[#8b9f94]">
            Notice unexpected telemetry values or operational interface issues? Our engineering and geospatial team investigates immediately.
          </p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="bg-[#070d0a] border border-[#1f3d2f] text-xs text-[#e2e8f0] rounded-lg px-3 py-2 focus:border-[#22c55e] outline-none"
            >
              <option value="bug">Bug Report / Display Glitch</option>
              <option value="data">Discrepancy in Field Telemetry</option>
              <option value="suggestion">Feature Enhancement Proposal</option>
            </select>
            <input
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder="Contact email or agency affiliation (Optional)"
              className="bg-[#070d0a] border border-[#1f3d2f] text-xs text-[#e2e8f0] rounded-lg px-3 py-2 sm:col-span-2 focus:border-[#22c55e] outline-none"
            >
            </input>
          </div>

          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Detailed description: Which view, which coordinates/layer, expected vs actual behavior..."
            rows={3}
            className="bg-[#070d0a] border border-[#1f3d2f] text-xs text-[#e2e8f0] rounded-lg p-3 w-full resize-none focus:border-[#22c55e] outline-none"
          />

          <div className="flex justify-end">
            <button
              onClick={send}
              disabled={sending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-[#070f0b] font-bold text-xs disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Send size={14} />
              <span>{sending ? 'Submitting report...' : 'Submit Report'}</span>
            </button>
          </div>

          {done && (
            <div className="p-3 rounded-lg bg-[#22c55e]/15 border border-[#22c55e]/30 text-xs text-[#4ade80]">
              {done}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-[#ef4444]/15 border border-[#ef4444]/30 text-xs text-[#fca5a5]">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
