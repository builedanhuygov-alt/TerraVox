import React from 'react'
import { HazardLevel, NFDRS_HAZARD_SCALE } from '../config/geography'
import { tokens } from '../design/tokens'

// ── Source Pipeline Health Badge ─────────────────────────────────────────────

interface SourceBadgeProps {
  status: string
  cacheAge?: number
  latency?: number
  compact?: boolean
  showDot?: boolean
}

export function SourceStatusBadge({
  status,
  cacheAge,
  latency,
  compact = false,
  showDot = true
}: SourceBadgeProps) {
  const normStatus = (status || 'UNKNOWN').toUpperCase()
  const def = (tokens.colors.status as any)[normStatus] || {
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.35)',
    dot: '#94a3b8'
  }

  const formatAge = (s?: number) => {
    if (s === undefined || s === null) return null
    if (s < 60) return `${s}s age`
    if (s < 3600) return `${Math.floor(s / 60)}m age`
    return `${Math.floor(s / 3600)}h age`
  }

  const ageStr = formatAge(cacheAge)

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border shrink-0 transition-colors"
      style={{ color: def.color, backgroundColor: def.bg, borderColor: def.border }}
      title={`Pipeline status: ${normStatus}${latency ? ` · ${latency}ms latency` : ''}${ageStr ? ` · ${ageStr}` : ''}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${normStatus === 'LIVE' ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: def.dot }}
        />
      )}
      <span>{normStatus}</span>
      {!compact && ageStr && normStatus === 'CACHED' && (
        <span className="text-[#8b9f94] font-normal hidden sm:inline">({ageStr})</span>
      )}
    </span>
  )
}

// ── NFDRS Fire Danger Class Badge ────────────────────────────────────────────

interface HazardBadgeProps {
  level: HazardLevel
  compact?: boolean
}

export function HazardBadge({ level, compact = false }: HazardBadgeProps) {
  const def = NFDRS_HAZARD_SCALE[level] || NFDRS_HAZARD_SCALE['I']
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[9px] font-bold border shrink-0"
      style={{ color: def.color, backgroundColor: def.bg, borderColor: def.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: def.color }} />
      <span>{compact ? def.level : def.label}</span>
    </span>
  )
}

// ── Provenance & Verification Badge ──────────────────────────────────────────

interface VerificationBadgeProps {
  type: 'OFFICIAL' | 'COMMUNITY_VERIFIED' | 'UNVERIFIED' | 'HISTORICAL'
  label?: string
}

export function VerificationBadge({ type, label }: VerificationBadgeProps) {
  switch (type) {
    case 'OFFICIAL':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase border bg-emerald-950/60 text-emerald-400 border-emerald-500/40">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {label || 'OFFICIAL CAD'}
        </span>
      )
    case 'COMMUNITY_VERIFIED':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase border bg-sky-950/60 text-sky-400 border-sky-500/40">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          {label || 'FIELD VERIFIED'}
        </span>
      )
    case 'HISTORICAL':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase border bg-stone-900/90 text-stone-300 border-stone-600/40">
          🏛️ {label || 'CASE STUDY'}
        </span>
      )
    case 'UNVERIFIED':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase border bg-amber-950/50 text-amber-300 border-amber-500/40">
          ⚠️ {label || 'UNVERIFIED SIGHTING'}
        </span>
      )
  }
}
