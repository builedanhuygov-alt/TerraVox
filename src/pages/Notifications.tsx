import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { ShieldAlert, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'

type AlertRow = {
  id: string
  title?: string
  level?: string
  risk_type: string
  administrative_unit_id?: string
  status: string
  created_at?: string
}

export default function Notifications() {
  const [rows, setRows] = useState<AlertRow[]>([])
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL')
  const [stFilter, setStFilter] = useState<'ALL' | 'ACTIVE' | 'ACKNOWLEDGED'>('ALL')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.alertsList()
      setRows(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const levelStyle = (lvl?: string) => {
    switch (lvl) {
      case 'CRITICAL':
      case 'V':
        return 'text-[#ef4444] bg-[#ef4444]/15 border-[#ef4444]/30'
      case 'HIGH':
      case 'IV':
        return 'text-[#f97316] bg-[#f97316]/15 border-[#f97316]/30'
      default:
        return 'text-[#eab308] bg-[#eab308]/15 border-[#eab308]/30'
    }
  }

  const openDetails = async (id: string) => {
    if (openId === id) { setOpenId(null); return }
    setOpenId(id)
    setDetail(null)
    setDetailLoading(true)
    try {
      setDetail(await api.alertDetail(id))
    } catch (e: any) {
      setDetail({ id, title: 'Failed to load details', message: String(e.message || e) })
    } finally {
      setDetailLoading(false)
    }
  }

  const ack = async (id: string) => {
    const r = await api.ackAlert(id).catch((e: any) => ({ error: String(e.message || e) }))
    if ((r as any).error) { setError((r as any).error); return }
    setRows(rs => rs.map(a => a.id === id ? { ...a, status: (r as any).status } : a))
    setDetail((d: any) => d ? { ...d, status: (r as any).status } : d)
  }

  const shown = rows.filter(a => filter === 'ALL' || a.level === filter)
  const active = rows.filter(a => a.status === 'ACTIVE').length

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#172b22]">
        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#4ade80] font-semibold flex items-center gap-1.5">
            <ShieldAlert size={14} />
            <span>TERRAVOX INCIDENT REGISTRY</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#f0fdf4]">
            Active Directives &amp; Operational Alerts ({active} active)
          </h1>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-[#091410] p-1 border border-[#172b22]">
            {(['ALL', 'CRITICAL', 'HIGH'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  filter === f ? 'bg-[#22c55e] text-[#070f0b]' : 'text-[#8b9f94] hover:text-[#f0fdf4]'
                }`}
              >
                {f === 'ALL' ? 'All' : f === 'CRITICAL' ? 'Critical' : 'High'}
              </button>
            ))}
          </div>

          <div className="flex rounded-lg bg-[#091410] p-1 border border-[#172b22]">
            {(['ALL', 'ACTIVE', 'ACKNOWLEDGED'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStFilter(s)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  stFilter === s ? 'bg-[#183a2b] text-[#4ade80]' : 'text-[#8b9f94] hover:text-[#f0fdf4]'
                }`}
              >
                {s === 'ALL' ? 'All States' : s === 'ACTIVE' ? 'Active' : 'Acknowledged'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-32 w-full" />
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-[#ef4444]/15 border border-[#ef4444]/30 text-xs text-[#fca5a5]">
          {error}
        </div>
      )}

      {!loading && !error && shown.length === 0 && (
        <div className="tv-card text-center py-12 text-xs text-[#5b6f64]">
          No alerts found matching current filter criteria.
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-3">
        {shown.map(a => (
          <div key={a.id} className="tv-card space-y-2.5">
            <button
              onClick={() => openDetails(a.id)}
              className="w-full text-left"
              aria-expanded={openId === a.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${levelStyle(a.level)}`}>
                      {a.level || 'III'}
                    </span>
                    <span className="font-bold text-sm text-[#f0fdf4]">{a.title || a.risk_type || a.id}</span>
                  </div>
                  <div className="text-xs text-[#8b9f94]">
                    Jurisdiction: <b className="text-[#cbd5d1]">{a.administrative_unit_id || 'California Pilot'}</b> · Type: {a.risk_type} · {a.created_at?.slice(0, 16).replace('T', ' ')}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                    a.status === 'ACTIVE' ? 'bg-[#ef4444]/15 text-[#ef4444]' : 'bg-[#22c55e]/15 text-[#4ade80]'
                  }`}>
                    {a.status}
                  </span>
                  {openId === a.id ? <ChevronUp size={16} className="text-[#8b9f94]" /> : <ChevronDown size={16} className="text-[#8b9f94]" />}
                </div>
              </div>
            </button>

            {openId === a.id && (
              <div className="pt-3 border-t border-[#172b22] space-y-3 text-xs">
                {detailLoading ? (
                  <div className="skeleton h-12 w-full" />
                ) : detail ? (
                  <>
                    <div className="p-3 rounded-lg bg-[#08120e] border border-[#14261d] text-[#cbd5d1] space-y-1.5">
                      <div><b>Incident Summary:</b> {detail.message || 'Telemetry and satellite observation thresholds exceeded.'}</div>
                      {detail.explanation && <div className="text-[#8b9f94]"><b>AI Synthesis:</b> {detail.explanation}</div>}
                      {detail.incident && (
                        <div className="text-[#f59e0b]">
                          Linked Incident: ID {detail.incident.id} (Status: {detail.incident.status})
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => ack(a.id)}
                        disabled={detail.status !== 'ACTIVE'}
                        className="tv-btn-primary text-xs"
                      >
                        <CheckCircle2 size={14} />
                        <span>{detail.status === 'ACTIVE' ? 'Acknowledge Directive' : 'Acknowledged'}</span>
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
