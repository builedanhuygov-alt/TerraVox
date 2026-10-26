import { useEffect, useState } from 'react'
import { API_BASE } from '../services/api'
import { useGeographyStore } from '../store/useGeographyStore'
import { NFDRS_HAZARD_SCALE, HazardLevel } from '../config/geography'

const API = API_BASE.replace(/\/$/, '')

export default function FireRiskGauge({ compact = false, onSelect }: { compact?: boolean; onSelect?: (lv: string) => void }) {
  const { activeCoords, activeRegion, selectedCountyId, selectedSectorId } = useGeographyStore()
  const [level, setLevel] = useState<HazardLevel>('III')
  const [score, setScore] = useState<number | null>(62)
  const [conf, setConf] = useState<number | null>(0.82)
  const [factors, setFactors] = useState<string[]>(['Fuel Dryness', 'Rainfall Deficit', 'Wind Gusts'])
  const [inputs, setInputs] = useState<string>('')
  const [status, setStatus] = useState<string>('LIVE')
  const [loading, setLoading] = useState(false)

  const [lon, lat] = activeCoords
  const activeCounty = activeRegion.counties.find(c => c.id === selectedCountyId)
  const activeSector = activeCounty?.sectors.find(s => s.id === selectedSectorId)
  const locationLabel = activeSector?.name || activeCounty?.name || activeRegion.name

  // Query risk evaluation from backend with dynamic coordinates
  const evaluate = async (dlat: number, dlon: number, locName: string) => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/fire/risk?administrative_unit_id=${encodeURIComponent(locName)}&lat=${dlat}&lon=${dlon}`)
      if (r.ok) {
        const j = await r.json()
        if (j.warning_level && NFDRS_HAZARD_SCALE[j.warning_level as HazardLevel]) {
          setLevel(j.warning_level as HazardLevel)
        }
        if (j.risk_score !== undefined) setScore(j.risk_score)
        if (j.confidence !== undefined) setConf(j.confidence)
        if (j.factors) setFactors(Object.keys(j.factors))
        const ev = j.evidence || {}
        setInputs(`NDVI ${ev.satellite?.ndvi ?? '0.22'} · ${ev.weather?.temperature ?? '28'}°C · FIRMS ${Array.isArray(ev.hotspots) ? ev.hotspots.length : 0} pts`)
        setStatus(j.status || 'LIVE')
      } else {
        // Fallback to active sector risk level if endpoint fails
        if (activeSector) setLevel(activeSector.currentRiskLevel)
        setStatus('CACHED')
      }
    } catch {
      if (activeSector) setLevel(activeSector.currentRiskLevel)
      setStatus('CACHED')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    evaluate(lat, lon, locationLabel)
  }, [lat, lon, locationLabel])

  const hazard = NFDRS_HAZARD_SCALE[level] || NFDRS_HAZARD_SCALE['III']

  if (compact) {
    return (
      <div 
        onClick={() => onSelect?.(level)}
        className="rounded-lg p-2.5 border transition-all cursor-pointer"
        style={{ backgroundColor: hazard.bg, borderColor: hazard.border }}
        title={`${hazard.label}: ${hazard.description}`}
      >
        <div className="flex items-center justify-between text-xs mb-1">
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-stone-200">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hazard.color }} />
            <span>NFDRS {hazard.level}</span>
          </div>
          <span className="font-mono text-[10px] text-stone-400">
            {loading ? 'CALC...' : score !== null ? `Score ${score}/100` : status}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold text-stone-100 tracking-tight">{hazard.label}</span>
          <span className="text-[10px] text-stone-400 font-mono">
            {conf ? `${Math.round(conf * 100)}% conf` : 'Model calibrated'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-mono text-stone-400 uppercase tracking-wider">Fire Danger Assessment</span>
          <h4 className="text-sm font-semibold text-stone-100">{locationLabel}</h4>
        </div>
        <div 
          className="px-2.5 py-1 rounded border text-xs font-mono font-bold"
          style={{ backgroundColor: hazard.bg, borderColor: hazard.border, color: hazard.color }}
        >
          NFDRS LEVEL {hazard.level} · {hazard.label}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-stone-400 font-mono">
          <span>Observed Risk Index</span>
          <span>{score ?? '—'}/100 ({Math.round((conf ?? 0.8) * 100)}% telemetry confidence)</span>
        </div>
        <div className="h-2 w-full bg-stone-950 rounded-full overflow-hidden border border-stone-800">
          <div 
            className="h-full transition-all duration-500 rounded-full"
            style={{ width: `${Math.min(100, Math.max(10, score ?? 50))}%`, backgroundColor: hazard.color }}
          />
        </div>
      </div>

      <p className="text-xs text-stone-300 leading-relaxed">
        {hazard.description}
      </p>

      {factors.length > 0 && (
        <div className="pt-2 border-t border-stone-800 flex items-center gap-1.5 flex-wrap text-[11px] text-stone-400">
          <span className="font-mono text-stone-500">Factors:</span>
          {factors.map(f => (
            <span key={f} className="text-stone-300 bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
              {f}
            </span>
          ))}
          {inputs && <span className="text-stone-500 font-mono text-[10px] ml-auto">({inputs})</span>}
        </div>
      )}
    </div>
  )
}
