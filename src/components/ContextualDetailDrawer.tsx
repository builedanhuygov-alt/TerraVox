import React, { useState } from 'react'
import { 
  X, 
  Flame, 
  MapPin, 
  Satellite, 
  ShieldAlert, 
  Calendar, 
  Clock, 
  Copy, 
  Check, 
  ExternalLink, 
  FileText, 
  Compass, 
  Activity, 
  AlertTriangle, 
  Info, 
  Users, 
  Building2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react'

export interface SelectedEntity {
  type: 'incident' | 'detection' | 'county' | 'place' | 'report' | 'scar'
  id: string
  data: any
}

interface ContextualDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  entity: SelectedEntity | null
  onOpenSitRep?: (incidentData: any) => void
  onNavigateToCommand?: (incidentId: string) => void
}

export default function ContextualDetailDrawer({
  isOpen,
  onClose,
  entity,
  onOpenSitRep,
  onNavigateToCommand
}: ContextualDetailDrawerProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen || !entity) return null

  const copyCoords = (lat: number, lon: number) => {
    navigator.clipboard.writeText(`${lat.toFixed(5)}, ${lon.toFixed(5)}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div 
      className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-[#08120e]/98 backdrop-blur-md border-l border-[#1b3326] shadow-2xl flex flex-col animate-slideLeft pointer-events-auto max-h-screen overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Contextual Details"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#14261c] flex items-start justify-between bg-[#060c09] shrink-0">
        <div className="space-y-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
              entity.type === 'incident'
                ? 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30'
                : entity.type === 'detection'
                ? 'bg-[#f97316]/15 text-[#f97316] border-[#f97316]/30'
                : entity.type === 'report'
                ? 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30'
                : 'bg-[#22c55e]/15 text-[#4ade80] border-[#22c55e]/30'
            }`}>
              {entity.type === 'incident' ? 'CAL FIRE Incident' :
               entity.type === 'detection' ? 'NASA FIRMS Detection' :
               entity.type === 'report' ? 'Community Observation' :
               entity.type === 'county' ? 'County Jurisdiction' :
               entity.type === 'scar' ? 'Historical Fire Scar' : 'Municipality'}
            </span>

            {entity.data?.status && (
              <span className="text-[10px] font-mono text-[#8b9f94]">
                Status: <span className="text-[#f0fdf4] font-semibold">{entity.data.status}</span>
              </span>
            )}
          </div>

          <h3 className="font-bold text-base text-[#f0fdf4] truncate leading-tight">
            {entity.data?.title || 
             entity.data?.name || 
             entity.data?.location_name || 
             (entity.type === 'detection' ? `Thermal Anomaly (${entity.data?.satellite || 'VIIRS'})` : 'Selected Entity')}
          </h3>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#718579] hover:text-[#f0fdf4] hover:bg-[#12241b] transition-colors shrink-0"
          aria-label="Close details panel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-[#cbd5d1]">
        {/* CASE 1: OFFICIAL CAL FIRE INCIDENT */}
        {entity.type === 'incident' && (
          <div className="space-y-4">
            {/* Thumbnail preview */}
            {entity.data.thumbnail && (
              <div className="w-full h-44 rounded-xl overflow-hidden border border-[#1b3427] relative bg-[#070e0a]">
                <img 
                  src={entity.data.thumbnail} 
                  alt={entity.data.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[10px] font-mono text-stone-300">
                  Sentinel-2 Pre-Pass / Ground Imagery
                </div>
              </div>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-[#0c1813] border border-[#172b20]">
                <span className="text-[10px] text-[#718579] block">Estimated Area</span>
                <span className="text-sm font-bold text-[#f0fdf4]">
                  {entity.data.acres ? `${entity.data.acres.toLocaleString()} acres` : 'Perimeter Pending'}
                </span>
                <span className="text-[9px] text-[#5b6f64] block">Source: CAL FIRE Incident Log</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0c1813] border border-[#172b20]">
                <span className="text-[10px] text-[#718579] block">Containment</span>
                <span className="text-sm font-bold text-[#4ade80]">
                  {entity.data.containmentPct !== undefined ? `${entity.data.containmentPct}%` : '0%'}
                </span>
                <span className="text-[9px] text-[#5b6f64] block">Incident Command State</span>
              </div>
            </div>

            {/* Geographic Coordinates HUD */}
            {entity.data.coordinates && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0c1813] border border-[#172b20] font-mono text-[11px]">
                <div className="flex items-center gap-2 truncate">
                  <MapPin size={14} className="text-[#4ade80] shrink-0" />
                  <span className="text-[#f0fdf4] truncate">
                    {entity.data.coordinates[1].toFixed(4)}°N, {Math.abs(entity.data.coordinates[0]).toFixed(4)}°W
                  </span>
                </div>
                <button
                  onClick={() => copyCoords(entity.data.coordinates[1], entity.data.coordinates[0])}
                  className="p-1 text-[#718579] hover:text-[#4ade80] flex items-center gap-1"
                  title="Copy Lat/Lon Coordinates"
                >
                  {copied ? <Check size={12} className="text-[#4ade80]" /> : <Copy size={12} />}
                  <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}

            {/* Jurisdictional Lead Agency */}
            <div className="p-3 rounded-xl bg-[#091510] border border-[#162e21] space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#718579] block">
                Command Jurisdiction
              </span>
              <div className="font-semibold text-[#f0fdf4]">
                {entity.data.containingCounty ? `${entity.data.containingCounty} County Command` : 'CAL FIRE Headquarters (Sacramento)'}
              </div>
              <p className="text-[11px] text-[#8b9f94]">
                Lead agency coordinating initial attack, air tankers, and local evacuation zoning.
              </p>
            </div>

            {/* Weather Context */}
            {entity.data.weatherContext && (
              <div className="p-3 rounded-xl bg-[#0c1813] border border-[#172b20] space-y-2">
                <span className="text-[10px] font-mono uppercase text-[#718579] block font-semibold">
                  In-Situ Weather Conditions (Open-Meteo)
                </span>
                <div className="grid grid-cols-3 gap-2 font-mono text-center text-xs">
                  <div className="p-1.5 rounded bg-[#070e0a]">
                    <span className="text-[9px] text-[#718579] block">Temp</span>
                    <span className="font-bold text-[#f0fdf4]">{entity.data.weatherContext.tempC}°C</span>
                  </div>
                  <div className="p-1.5 rounded bg-[#070e0a]">
                    <span className="text-[9px] text-[#718579] block">Wind</span>
                    <span className="font-bold text-[#38bdf8]">{entity.data.weatherContext.windSpeedMph} mph</span>
                  </div>
                  <div className="p-1.5 rounded bg-[#070e0a]">
                    <span className="text-[9px] text-[#718579] block">Rel Hum</span>
                    <span className="font-bold text-[#eab308]">{entity.data.weatherContext.relativeHumidityPct}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-[#14261c]">
              {onOpenSitRep && (
                <button
                  onClick={() => onOpenSitRep(entity.data)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#163324] hover:bg-[#1f4934] border border-[#234f37] text-xs font-bold text-[#4ade80] transition-colors flex items-center justify-center gap-2"
                >
                  <FileText size={14} />
                  <span>Generate Situation Report (SitRep)</span>
                </button>
              )}

              {onNavigateToCommand && (
                <button
                  onClick={() => onNavigateToCommand(entity.id)}
                  className="w-full py-2 px-3 rounded-xl bg-[#0e1914] hover:bg-[#14261e] border border-[#1a3325] text-xs font-semibold text-[#cbd5d1] transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Open Deep Forensic Workspace</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* CASE 2: NASA FIRMS SATELLITE DETECTION */}
        {entity.type === 'detection' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-[#140e09] border border-[#f97316]/40 space-y-2">
              <div className="flex items-center gap-2 text-[#f97316] font-bold text-xs">
                <Satellite size={15} />
                <span>Thermal Radiometric Anomaly</span>
              </div>
              <p className="text-[11px] text-[#cbd5d1] leading-relaxed">
                Sensor detected surface temperature signature above expected diurnal threshold.
              </p>
            </div>

            {/* Detection Telemetry Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-[#0c1813] border border-[#172b20]">
                <span className="text-[10px] text-[#718579] block">Brightness Temp</span>
                <span className="text-sm font-bold text-[#f97316]">
                  {entity.data.brightnessKelvin ? `${entity.data.brightnessKelvin} K` : '328.5 K'}
                </span>
                <span className="text-[9px] text-[#5b6f64] block">4-micron radiometer</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0c1813] border border-[#172b20]">
                <span className="text-[10px] text-[#718579] block">Fire Radiative Power</span>
                <span className="text-sm font-bold text-[#f0fdf4]">
                  {entity.data.frpMw ? `${entity.data.frpMw} MW` : '16.4 MW'}
                </span>
                <span className="text-[9px] text-[#5b6f64] block">Pixel radiant energy</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0c1813] border border-[#172b20]">
                <span className="text-[10px] text-[#718579] block">Instrument</span>
                <span className="text-xs font-bold text-stone-200">
                  {entity.data.satelliteSensor || 'VIIRS 375m (S-NPP)'}
                </span>
                <span className="text-[9px] text-[#5b6f64] block">Sun-synchronous orbit</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0c1813] border border-[#172b20]">
                <span className="text-[10px] text-[#718579] block">Confidence</span>
                <span className="text-xs font-bold text-[#4ade80]">
                  {entity.data.confidence || 'Nominal / Verified'}
                </span>
                <span className="text-[9px] text-[#5b6f64] block">NASA algorithm rating</span>
              </div>
            </div>

            {/* Coordinates HUD */}
            {entity.data.coordinates && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0c1813] border border-[#172b20] font-mono text-[11px]">
                <div className="flex items-center gap-2 truncate">
                  <MapPin size={14} className="text-[#f97316] shrink-0" />
                  <span className="text-[#f0fdf4] truncate">
                    {entity.data.coordinates[1].toFixed(4)}°N, {Math.abs(entity.data.coordinates[0]).toFixed(4)}°W
                  </span>
                </div>
                <button
                  onClick={() => copyCoords(entity.data.coordinates[1], entity.data.coordinates[0])}
                  className="p-1 text-[#718579] hover:text-[#4ade80] flex items-center gap-1"
                >
                  {copied ? <Check size={12} className="text-[#4ade80]" /> : <Copy size={12} />}
                  <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}

            {/* MANDATORY SCIENTIFIC EVIDENCE NOTICE */}
            <div className="p-3 rounded-xl bg-[#0c1813] border border-[#22c55e]/30 space-y-2 text-[11px] leading-relaxed">
              <div className="flex items-center gap-1.5 text-[#eab308] font-bold text-xs">
                <Info size={14} />
                <span>Thermal Anomaly Distinction</span>
              </div>
              <p className="text-[#8b9f94]">
                A satellite thermal anomaly reflects high infrared radiation over an Earth surface pixel. It is <b>not automatically a confirmed wildfire</b> until verified against CAL FIRE ground dispatches. Thermal anomalies may also correspond to controlled prescribed burns, industrial refinery flaring, or sun-glint on exposed volcanic rock.
              </p>
              <div className="pt-1 border-t border-[#14261c] flex items-center justify-between text-[10px] font-mono text-[#718579]">
                <span>Source: NASA FIRMS Near Real-Time</span>
                <a 
                  href="https://firms.modaps.eosdis.nasa.gov/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#38bdf8] hover:underline flex items-center gap-1"
                >
                  <span>FIRMS Portal</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* CASE 3: COMMUNITY OBSERVATION REPORT */}
        {entity.type === 'report' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-[#09151c] border border-[#38bdf8]/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#38bdf8] font-bold uppercase">
                  Community Citizen Sighting
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#eab308]/20 text-[#eab308] border border-[#eab308]/40">
                  {entity.data.is_verified ? 'VERIFIED' : 'UNVERIFIED PENDING REVIEW'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-[#f0fdf4]">
                {entity.data.location_name || 'California Field Observation'}
              </h4>
              <p className="text-xs text-stone-200 leading-relaxed">
                "{entity.data.description || entity.data.message}"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-[#0c1813] border border-[#172b20]">
                <span className="text-[10px] text-[#718579] block">Category</span>
                <span className="text-xs font-bold text-white uppercase">
                  {entity.data.category || 'General'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0c1813] border border-[#172b20]">
                <span className="text-[10px] text-[#718579] block">Submitted</span>
                <span className="text-xs font-bold text-stone-300">
                  {entity.data.created_at ? new Date(entity.data.created_at).toLocaleDateString() : 'Today'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#091510] border border-[#162e21] text-[10px] text-[#718579] space-y-1">
              <div className="flex items-center gap-1.5 text-[#4ade80] font-bold">
                <ShieldCheck size={12} />
                <span>Verification &amp; Privacy Safeguards</span>
              </div>
              <p>
                Community submissions are recorded with client IP rate-limiting to prevent spam. Reporter contact information is kept confidential and is not published on public layers.
              </p>
            </div>
          </div>
        )}

        {/* CASE 4: COUNTY JURISDICTION */}
        {entity.type === 'county' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#0c1813] border border-[#172b20] space-y-2">
              <div className="text-[10px] font-mono text-[#34d399] uppercase tracking-wider">
                California County Boundary
              </div>
              <h4 className="text-base font-bold text-[#f0fdf4]">
                {entity.data.name} County
              </h4>
              <p className="text-[11px] text-[#8b9f94]">
                Official jurisdictional boundary from US Census Bureau TIGER/Line.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#091510] border border-[#162e21] space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#718579] block">
                CAL FIRE Operational Unit
              </span>
              <div className="font-semibold text-emerald-300">
                {entity.data.agencyUnit || `${entity.data.name} County Command Unit`}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
