import { useEffect, useState } from 'react'
import { API_BASE } from '../services/api'
import { Award, Trophy, Shield, CheckCircle2 } from 'lucide-react'

const TYPES = ['SAFETY', 'RESPONSE', 'FOREST', 'COMMUNITY', 'PREPAREDNESS'] as const
const TYPE_LABEL: Record<string, string> = {
  SAFETY: 'Overall Resilience', 
  RESPONSE: 'Initial Attack Speed', 
  FOREST: 'Canopy Health & Protection',
  COMMUNITY: 'Defensible Space Verification', 
  PREPAREDNESS: 'Operational Preparedness',
}

type Row = { rank: number; administrative_unit_id: string; score: number; period?: string; name?: string }

export default function Leaderboard() {
  const [tab, setTab] = useState<string>('SAFETY')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState<boolean | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/api/rankings/${tab}`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/api/forest/areas`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([rk, areas]: any[]) => {
      const names: Record<string, string> = {}
      ;(Array.isArray(areas) ? areas : []).forEach((a: any) => { names[a.id] = a.name })
      const list: Row[] = Array.isArray(rk) ? rk.slice(0, 10) : []
      setRows(list.map(r => ({ ...r, name: names[r.administrative_unit_id] || r.administrative_unit_id?.slice(0, 12) || '—' })))
      setLive(list.length > 0)
      setLoading(false)
    }).catch(() => { 
      setRows([])
      setLive(false)
      setLoading(false) 
    })
  }, [tab])

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#172b22]">
        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#4ade80] font-semibold flex items-center gap-1.5">
            <Trophy size={14} />
            <span>TERRAVOX REGIONAL BENCHMARK</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#f0fdf4]">
            California Wildland Fire Resilience &amp; Preparedness Rankings
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold ${
            live ? 'bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/30' : 'bg-[#eab308]/15 text-[#eab308] border border-[#eab308]/30'
          }`}>
            {live ? 'FIELD VERIFIED DATA' : 'AWAITING TELEMETRY'}
          </span>
        </div>
      </div>

      {/* Categories Tabs */}
      <div className="flex flex-wrap gap-2">
        {TYPES.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t
                ? 'bg-[#22c55e] text-[#070f0b] font-bold shadow-xs'
                : 'bg-[#091410] border border-[#172b22] text-[#8b9f94] hover:text-[#f0fdf4]'
            }`}
          >
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-2">
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-48 w-full" />
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="tv-card text-center py-12 text-xs text-[#5b6f64]">
          No ranking records found for this category. Periodic risk evaluations will automatically populate benchmark scores.
        </div>
      )}

      {/* Table */}
      {!loading && rows.length > 0 && (
        <div className="tv-card overflow-hidden p-0">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#091410] border-b border-[#172b22] text-[#718579] font-mono uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Jurisdiction / County Sector</th>
                <th className="py-3 px-4 text-right">Resilience Score</th>
                <th className="py-3 px-4 text-right">Evaluation Cycle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#14261d]">
              {rows.map(r => (
                <tr key={r.rank + r.administrative_unit_id} className="hover:bg-[#12241c] transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#4ade80]">#{r.rank}</td>
                  <td className="py-3 px-4 font-semibold text-[#f0fdf4]">{r.name}</td>
                  <td className="py-3 px-4 font-mono font-bold text-right text-[#22c55e]">{r.score}/100</td>
                  <td className="py-3 px-4 text-right font-mono text-[#5b6f64]">{r.period || '2026-Q3'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-[#5b6f64] leading-relaxed">
        Objective Ranking Methodology: Evaluates initial attack deployment speed upon satellite thermal anomaly detection, defensible space compliance, and water tender reservoir proximity; normalized against total acreage.
      </p>
    </div>
  )
}
