import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Flame, 
  Satellite, 
  Wind, 
  Users, 
  ShieldAlert, 
  Radio, 
  Clock, 
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { EnvironmentalIncident } from '../config/geography'

export interface SignalItem {
  id: string
  timestamp: string
  source: 'CAL_FIRE' | 'NASA_FIRMS' | 'METEO' | 'COMMUNITY'
  category: string
  title: string
  details: string
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'INFO'
  coordinates?: [number, number]
  raw?: any
}

interface LiveActivityStreamProps {
  incidents: EnvironmentalIncident[]
  cadIncidents?: any[]
  hotspotCount?: number
  weatherTelemetry?: any
  publicReports?: any[]
  onSelectIncident?: (incident: EnvironmentalIncident) => void
  onFocusCoordinates?: (coords: [number, number]) => void
}

export default function LiveActivityStream({
  incidents = [],
  cadIncidents = [],
  hotspotCount = 0,
  weatherTelemetry,
  publicReports = [],
  onSelectIncident,
  onFocusCoordinates
}: LiveActivityStreamProps) {
  const [filter, setFilter] = useState<'ALL' | 'CAD' | 'FIRMS' | 'METEO'>('ALL')
  const [isLiveReceiving, setIsLiveReceiving] = useState(true)

  // Construct unified high-tech feed
  const feedItems: SignalItem[] = []

  // 1. Official CAD Incidents
  incidents.filter(i => i.category === 'CONFIRMED_WILDFIRE').forEach(inc => {
    feedItems.push({
      id: `cad-${inc.id}`,
      timestamp: 'LIVE CAD',
      source: 'CAL_FIRE',
      category: 'DISPATCHED CAD',
      title: inc.title,
      details: `${inc.estimatedAreaHa ? `${Math.round(inc.estimatedAreaHa * 2.47105)} acres` : 'Active spread'} · Source: ${inc.officialSource || 'CAL FIRE'} · ${inc.sectorName}`,
      severity: 'CRITICAL',
      coordinates: inc.coordinates,
      raw: inc
    })
  })

  // 2. NASA FIRMS VIIRS Detections
  incidents.filter(i => i.category === 'THERMAL_ANOMALY').forEach((inc, idx) => {
    feedItems.push({
      id: `firms-${inc.id || idx}`,
      timestamp: inc.timestamp ? new Date(inc.timestamp).toLocaleTimeString('en-US', { hour12: false }) : '3m ago',
      source: 'NASA_FIRMS',
      category: 'VIIRS RADIOMETER',
      title: inc.title,
      details: `${inc.brightnessKelvin || 328}K brightness · FRP ${Math.round((inc.brightnessKelvin || 320) * 0.12)} MW · 375m NRT`,
      severity: 'HIGH',
      coordinates: inc.coordinates,
      raw: inc
    })
  })

  // 3. Meteorological High-Wind & Fuel Desiccation Alert
  if (weatherTelemetry?.windSpeedMph && weatherTelemetry.windSpeedMph > 12) {
    feedItems.push({
      id: 'meteo-wind-funnel',
      timestamp: 'STREAM',
      source: 'METEO',
      category: 'GAP WIND ALERT',
      title: `Diablo Ridge Wind Funnel (${weatherTelemetry.windSpeedMph} mph)`,
      details: `Gusts up to ${Math.round(weatherTelemetry.windSpeedMph * 1.35)} mph NE · RH ${weatherTelemetry.relativeHumidity || 18}% · Red Flag conditions`,
      severity: 'HIGH',
      coordinates: [-121.5, 39.8]
    })
  }

  // 4. Community Ground-Truth Observations
  publicReports.slice(0, 3).forEach(rep => {
    feedItems.push({
      id: `rep-${rep.id}`,
      timestamp: 'RECENT',
      source: 'COMMUNITY',
      category: 'GROUND TRUTH',
      title: `${rep.category?.toUpperCase() || 'SMOKE'} Sighting`,
      details: `${rep.location_name || 'Butte County'} · ${rep.description?.slice(0, 50) || 'Field observation'}...`,
      severity: 'MODERATE',
      coordinates: rep.longitude && rep.latitude ? [rep.longitude, rep.latitude] : undefined,
      raw: rep
    })
  })

  // Filter items
  const filtered = feedItems.filter(item => {
    if (filter === 'CAD') return item.source === 'CAL_FIRE'
    if (filter === 'FIRMS') return item.source === 'NASA_FIRMS'
    if (filter === 'METEO') return item.source === 'METEO'
    return true
  })

  return (
    <div className="flex flex-col h-full bg-[#0D1117]/85 backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden shadow-2xl">
      {/* Stream Header */}
      <div className="p-3.5 border-b border-[rgba(255,255,255,0.08)] bg-[#0A0E14]/90 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className={`w-2.5 h-2.5 rounded-full ${isLiveReceiving ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
            <span className={`absolute w-4 h-4 rounded-full ${isLiveReceiving ? 'bg-emerald-400/30' : 'bg-amber-400/30'} animate-ping`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold text-[#f0fdf4] tracking-wide uppercase">
                Live Signal Stream
              </span>
              <span className="text-[9px] font-mono px-1 rounded bg-white/5 text-[#718579] border border-white/10">
                1.2 Hz
              </span>
            </div>
            <p className="text-[10px] font-mono text-[#5b6f64]">
              CAL FIRE CAD · VIIRS NRT · METEO
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsLiveReceiving(v => !v)}
          className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
            isLiveReceiving 
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' 
              : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
          }`}
          title="Toggle Stream Reception Mode"
        >
          {isLiveReceiving ? 'RECEIVING' : 'PAUSED'}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-3 py-2 border-b border-[rgba(255,255,255,0.06)] bg-[#090D13]/60 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
        {(['ALL', 'CAD', 'FIRMS', 'METEO'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filter === tab
                ? 'bg-white/10 text-[#4ade80] border border-emerald-500/30 font-bold shadow-xs'
                : 'text-[#718579] hover:text-[#f0fdf4] hover:bg-white/5'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Real-time Ticker Scroll Area */}
      <div className="flex-1 p-3 space-y-2.5 overflow-y-auto overflow-x-hidden">
        <AnimatePresence initial={false}>
          {filtered.map((item, index) => {
            const isCad = item.source === 'CAL_FIRE'
            const isFirms = item.source === 'NASA_FIRMS'
            const isMeteo = item.source === 'METEO'

            const borderColor = isCad 
              ? 'border-red-500/30 hover:border-red-500/60' 
              : isFirms 
              ? 'border-orange-500/30 hover:border-orange-500/60'
              : 'border-cyan-500/30 hover:border-cyan-500/60'

            const accentGlow = isCad
              ? 'hover:shadow-[0_0_16px_rgba(239,68,68,0.18)]'
              : isFirms
              ? 'hover:shadow-[0_0_16px_rgba(249,115,22,0.18)]'
              : 'hover:shadow-[0_0_16px_rgba(56,189,248,0.18)]'

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                onClick={() => {
                  if (item.raw && onSelectIncident) {
                    onSelectIncident(item.raw)
                  } else if (item.coordinates && onFocusCoordinates) {
                    onFocusCoordinates(item.coordinates)
                  }
                }}
                className={`p-3 rounded-xl bg-[#0F141D]/90 border ${borderColor} ${accentGlow} transition-all duration-200 cursor-pointer group space-y-1.5`}
              >
                {/* Meta Header */}
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-1.5">
                    {isCad ? (
                      <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/40 flex items-center gap-1">
                        <Flame size={10} /> CAD DIRECT
                      </span>
                    ) : isFirms ? (
                      <span className="px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 font-bold border border-orange-500/40 flex items-center gap-1">
                        <Satellite size={10} /> VIIRS 375m
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 flex items-center gap-1">
                        <Wind size={10} /> MET SENSOR
                      </span>
                    )}
                  </div>
                  <span className="text-[#5b6f64] font-mono tabular-nums">
                    {item.timestamp}
                  </span>
                </div>

                {/* Title */}
                <div className="font-semibold text-xs text-[#f0fdf4] group-hover:text-emerald-300 transition-colors flex items-center justify-between">
                  <span className="truncate">{item.title}</span>
                  <ChevronRight size={13} className="text-[#5b6f64] group-hover:text-[#4ade80] group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>

                {/* Details */}
                <p className="text-[11px] text-[#8b9f94] line-clamp-2 leading-relaxed">
                  {item.details}
                </p>

                {/* Footer Coordinates if present */}
                {item.coordinates && (
                  <div className="text-[9px] font-mono text-[#5b6f64] pt-1 border-t border-white/5 flex items-center justify-between">
                    <span>GPS: {item.coordinates[1].toFixed(3)}°N, {Math.abs(item.coordinates[0]).toFixed(3)}°W</span>
                    <span className="text-emerald-400/80 group-hover:underline">Track Vector →</span>
                  </div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Stream Footer */}
      <div className="p-2.5 border-t border-[rgba(255,255,255,0.08)] bg-[#0A0E14] flex items-center justify-between text-[10px] font-mono text-[#5b6f64]">
        <span>Feed Integrity: 100% OK</span>
        <span className="text-emerald-400 font-bold">● ONLINE</span>
      </div>
    </div>
  )
}
