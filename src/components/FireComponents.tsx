import { useState, useEffect } from 'react'
import { Flame, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react'

const LEVELS = [
  { lv: 'I', label: 'LOW DANGER', color: '#22c55e' },
  { lv: 'II', label: 'MODERATE DANGER', color: '#38bdf8' },
  { lv: 'III', label: 'HIGH DANGER', color: '#eab308' },
  { lv: 'IV', label: 'VERY HIGH DANGER', color: '#f97316' },
  { lv: 'V', label: 'EXTREME / RED FLAG', color: '#ef4444' },
]

export function FireWarningGauge({ level = 'IV', onSelect, adminOnly = true }: { level: string; onSelect?: (lv: string) => void; adminOnly?: boolean }) {
  const idx = LEVELS.findIndex(l => l.lv === level)
  const pct = ((idx + 0.5) / 5) * 100
  const canEdit = !adminOnly || (() => { try { return !!sessionStorage.getItem('ecogl_admin_token') } catch { return false } })()
  const pick = (lv: string) => { if (canEdit) onSelect?.(lv) }

  return (
    <div className="tv-card space-y-3">
      <div className="font-mono text-xs uppercase font-bold text-[#8b9f94] flex items-center justify-between">
        <span>NFDRS / CFFDRS Wildfire Danger Scale</span>
        <span className="text-[#4ade80] font-mono">California</span>
      </div>

      <div className="relative h-9 bg-[#091410] rounded-lg border border-[#14261d] flex items-center">
        {LEVELS.map(l => (
          <div
            key={l.lv}
            onClick={() => pick(l.lv)}
            title={canEdit ? 'Admin: Manual NFDRS override' : 'Calculated automatically from FWI telemetry'}
            className={`flex-1 text-center font-mono font-bold text-xs cursor-pointer z-10 transition-colors ${
              LEVELS[idx]?.lv === l.lv ? 'text-[#070f0b]' : 'text-[#8b9f94] hover:text-[#f0fdf4]'
            }`}
          >
            {l.lv}
          </div>
        ))}
        {/* Active level slider badge */}
        <div
          className="absolute top-1 bottom-1 w-1/5 rounded-md transition-all duration-300 shadow-sm flex items-center justify-center font-mono font-black text-xs text-[#070f0b]"
          style={{
            left: `${(idx / 5) * 100}%`,
            backgroundColor: LEVELS[idx]?.color || '#f97316'
          }}
        >
          {level}
        </div>
      </div>

      <div className="p-2.5 rounded-lg bg-[#091410] border border-[#14261d] text-xs space-y-1">
        <div className="font-bold text-[#f0fdf4]">
          {LEVELS[idx]?.label} (Class {LEVELS[idx]?.lv})
        </div>
        <p className="text-[11px] text-[#8b9f94] leading-relaxed">
          {idx >= 3 ? '24/7 Red Flag watch, preposition Type 3 strike teams, maintain tender reservoirs.' : 'Routine corridor patrol and surveillance active.'}
        </p>
      </div>
    </div>
  )
}

export function FireWarningCard({ level = 'IV', risk = 82, confidence = 91, temp = 35, humidity = 31, rainfall = 0, wind = 21, vegetation = 'VERY DRY', hotspots = 2 }: { level?: string; risk?: number; confidence?: number; temp?: number; humidity?: number; rainfall?: number; wind?: number; vegetation?: string; hotspots?: number }) {
  const info = LEVELS.find(l => l.lv === level) || LEVELS[3]
  return (
    <div className="tv-card space-y-4">
      <div className="flex items-center gap-3">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-[#070f0b] shrink-0 shadow-sm"
          style={{ backgroundColor: info.color }}
        >
          🔥
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#f97316] font-bold">
            WILDFIRE ADVISORY
          </div>
          <div className="text-lg font-bold text-[#f0fdf4] truncate">
            CLASS {level} · {info.label}
          </div>
        </div>
      </div>

      {/* Stats Matrix */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="p-2 rounded bg-[#091410] border border-[#14261d]">
          <span className="text-[#718579] block text-[10px] font-sans">Hazard Score</span>
          <b className="text-[#f0fdf4] text-sm">{risk}/100</b>
        </div>
        <div className="p-2 rounded bg-[#091410] border border-[#14261d]">
          <span className="text-[#718579] block text-[10px] font-sans">Confidence</span>
          <b className="text-[#4ade80] text-sm">{confidence}%</b>
        </div>
        <div className="p-2 rounded bg-[#091410] border border-[#14261d]">
          <span className="text-[#718579] block text-[10px] font-sans">Temperature</span>
          <b className="text-[#f0fdf4] text-sm">{temp}°C</b>
        </div>
        <div className="p-2 rounded bg-[#091410] border border-[#14261d]">
          <span className="text-[#718579] block text-[10px] font-sans">Humidity</span>
          <b className="text-[#38bdf8] text-sm">{humidity}%</b>
        </div>
      </div>

      <div className="flex gap-2 pt-1 border-t border-[#14261d]">
        <a 
          href="/" 
          className="tv-btn-primary text-xs flex-1 text-center"
        >
          Command Center
        </a>
        <a 
          href="/what-if" 
          className="tv-btn-secondary text-xs flex-1 text-center"
        >
          What-If Simulation
        </a>
      </div>
    </div>
  )
}

export function FireIntelligencePanel({ official, ai, discrepancy }: { official?: any; ai?: any; discrepancy?: boolean }) {
  const [level, setLevel] = useState('IV')
  const [detail, setDetail] = useState<any>(null)

  useEffect(() => {
    if (level === 'IV') {
      setDetail({
        meaning: 'Critically dry fuel beds, low relative humidity, strong downslope wind gusts',
        conditions: 'Temp > 35°C (95°F), RH < 15%, 100-Hr fuel moisture < 8%',
        actions: ['Pre-stage strike teams', 'Aerial thermal surveillance', 'Stand by water tenders 24/7']
      })
    }
  }, [level])

  return (
    <div className="space-y-4">
      <FireWarningGauge level={level} onSelect={setLevel} />

      {detail && (
        <div className="tv-card space-y-2 text-xs">
          <h4 className="font-bold text-sm text-[#f0fdf4]">
            Operational Directives — Class {level} ({LEVELS.find(l => l.lv === level)?.label})
          </h4>
          <div className="text-[#cbd5d1]">
            <b>Trigger Conditions:</b> {detail.conditions}
          </div>
          <div className="text-[#8b9f94]">
            <b>Authoritative Baseline:</b> CAL FIRE Operations · NFDRS / Rothermel Spread Engine · NASA FIRMS VIIRS 375m
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {detail.actions.map((a: string) => (
              <span key={a} className="px-2 py-0.5 rounded bg-[#13281f] text-[#4ade80] text-[10px] font-medium border border-[#1f4231]">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {discrepancy && (
        <div className="p-3 rounded-xl bg-[#f59e0b]/15 border border-[#f59e0b]/30 text-xs text-[#fde68a] space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-[#f59e0b]">
            <AlertTriangle size={14} /> Signal Discrepancy Alert
          </div>
          <div>Official Rating: Class {official?.level} · AI Satellite Assessment: Class {ai?.level}</div>
          <div className="text-[11px] opacity-80">Recommendation: Dispatch ground or aerial reconnaissance to verify canopy moisture.</div>
        </div>
      )}
    </div>
  )
}
