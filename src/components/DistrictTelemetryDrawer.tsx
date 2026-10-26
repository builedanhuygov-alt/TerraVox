import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  ShieldAlert, 
  Flame, 
  Wind, 
  Thermometer, 
  Droplets, 
  Layers, 
  MapPin, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Activity,
  Compass
} from 'lucide-react'
import Sparkline from './Sparkline'
import NumberTicker from './NumberTicker'
import { CountyRegion } from '../config/geography'
import { useNavigate } from 'react-router-dom'

interface DistrictTelemetryDrawerProps {
  isOpen: boolean
  onClose: () => void
  county: CountyRegion | null
  telemetry: any
  onOpenWhatIf?: (countyId: string) => void
  onOpenMap?: (coords: [number, number]) => void
}

export default function DistrictTelemetryDrawer({
  isOpen,
  onClose,
  county,
  telemetry,
  onOpenWhatIf,
  onOpenMap
}: DistrictTelemetryDrawerProps) {
  const nav = useNavigate()
  if (!isOpen || !county) return null

  const isClassIVOrV = county.id === 'butte' || county.id === 'shasta-trinity'
  const threatColor = isClassIVOrV ? '#ef4444' : county.id === 'sonoma' ? '#f59e0b' : '#22c55e'
  const threatLabel = isClassIVOrV ? 'CLASS IV VERY HIGH' : county.id === 'sonoma' ? 'CLASS III HIGH' : 'CLASS II MODERATE'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end pointer-events-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
        />

        {/* Slide-over Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-lg h-full bg-[#0B0F15]/95 backdrop-blur-2xl border-l border-[rgba(255,255,255,0.12)] shadow-2xl flex flex-col overflow-hidden text-[#e6ede9]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[rgba(255,255,255,0.08)] bg-[#070A0F] flex items-start justify-between">
            <div className="space-y-1 min-w-0 pr-3">
              <div className="flex items-center gap-2">
                <span 
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border"
                  style={{
                    color: threatColor,
                    backgroundColor: `${threatColor}15`,
                    borderColor: `${threatColor}40`
                  }}
                >
                  {threatLabel}
                </span>
                <span className="text-[10px] font-mono text-[#718579]">
                  FIPS 06007 · CAL FIRE AOI
                </span>
              </div>
              <h2 className="text-xl font-black text-[#f0fdf4] truncate">
                {county.name} Unit
              </h2>
              <p className="text-xs text-[#8b9f94]">
                {county.sectors?.[0]?.name || 'Northern California Wildland-Urban Interface'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#718579] hover:text-[#f0fdf4] hover:bg-white/5 transition-colors shrink-0"
              aria-label="Close district telemetry"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {/* Real-time KPI Metric Tiles */}
            <div className="grid grid-cols-2 gap-3">
              {/* 100-Hr Fuel Moisture */}
              <div className="p-3.5 rounded-xl bg-[#0F141D] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#718579]">
                  <span className="font-mono text-[10px] uppercase">100-Hr Fuel Moisture</span>
                  <Droplets size={13} className="text-cyan-400" />
                </div>
                <div className="text-2xl font-black font-mono text-[#f0fdf4]">
                  <NumberTicker value={county.averageFuelMoisturePct || 58} suffix="%" />
                </div>
                <div className="text-[10px] text-red-400 font-mono flex items-center gap-1">
                  <TrendingDown size={11} /> -14% below 30d median
                </div>
                <Sparkline 
                  data={[72, 70, 68, 64, 62, 59, 58]} 
                  color="#ef4444" 
                  height={28} 
                />
              </div>

              {/* Peak Canyon Wind Gusts */}
              <div className="p-3.5 rounded-xl bg-[#0F141D] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#718579]">
                  <span className="font-mono text-[10px] uppercase">Diablo Ridge Winds</span>
                  <Wind size={13} className="text-amber-400" />
                </div>
                <div className="text-2xl font-black font-mono text-[#f0fdf4]">
                  <NumberTicker value={telemetry?.windSpeedMph || 18} suffix=" mph" />
                </div>
                <div className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                  <TrendingUp size={11} /> Gusts to 32 mph NE
                </div>
                <Sparkline 
                  data={[8, 11, 14, 12, 19, 24, 28, 22, 18]} 
                  color="#f59e0b" 
                  height={28} 
                />
              </div>
            </div>

            {/* Vegetation & Environmental Desiccation Index */}
            <div className="p-4 rounded-xl bg-[#0F141D] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#cbd5e1] flex items-center gap-1.5">
                  <Layers size={13} className="text-emerald-400" />
                  Vegetation Desiccation Matrix
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Sentinel-2 L2A
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-mono">
                  <span className="text-[#718579]">Satellite NDVI Score:</span>
                  <span className="font-bold text-[#f0fdf4]">0.42 (Stressed Evergreen)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 w-[42%]" />
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-[#718579]">Primary Fuel Model:</span>
                  <span className="text-stone-300 font-semibold">{county.sectors?.[0]?.primaryFuelType || 'Oak-Chaparral Shrub'}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-[#718579]">Total Monitored Acres:</span>
                  <span className="text-[#a3e635] font-bold">1,072,400 Acres</span>
                </div>
              </div>
            </div>

            {/* Active Operational Unit Details */}
            <div className="p-4 rounded-xl bg-[#0F141D] border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-[#cbd5e1]">
                <span className="flex items-center gap-1.5">
                  <Flame size={13} className="text-red-400" />
                  CAL FIRE Dispatch Status
                </span>
                <span className="text-[10px] text-emerald-400">CONNECT ACTIVE</span>
              </div>
              <p className="text-xs text-[#8b9f94] leading-relaxed">
                Emergency Command Center (ECC) is actively monitoring wind gaps along Sierra foothill corridors. Mutual aid dispatch channels armed on State Frequency Tactical Net 4.
              </p>
            </div>

            {/* Quick Tactical Navigation Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  onClose()
                  nav(`/what-if?county=${county.id}`)
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-500 text-[#070A0F] font-bold text-xs hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
              >
                <span className="flex items-center gap-2">
                  <Compass size={15} />
                  Run Huygens Digital Twin Spread Model
                </span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => {
                  onClose()
                  nav(`/map`)
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-[#f0fdf4] hover:bg-white/10 transition-colors"
              >
                <span>Open in Full-Bleed Map Explorer</span>
                <ArrowRight size={14} className="text-[#718579]" />
              </button>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-3 border-t border-[rgba(255,255,255,0.08)] bg-[#070A0F] flex items-center justify-between text-[10px] font-mono text-[#5b6f64]">
            <span>District Coordinates: {county.coordinates[1].toFixed(3)}°N, {Math.abs(county.coordinates[0]).toFixed(3)}°W</span>
            <span>WGS84</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
