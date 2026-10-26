import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { Scale, CheckCircle2, XCircle, Clock, Shield, ArrowRight } from 'lucide-react'

type Approval = { id: string; plan_id?: string; action?: string; status?: string }

export default function Governance() {
  const [stats, setStats] = useState<any>(null)
  const [items, setItems] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const refresh = async () => {
    setLoading(true)
    try {
      const [g, a] = await Promise.all([api.governance(), api.approvals()])
      setStats(g)
      setItems(Array.isArray(a) ? a : [])
      setError('')
    } catch (e: any) {
      setError(String(e.message || e).slice(0, 200))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const decide = async (id: string, ok: boolean) => {
    setMsg('')
    try {
      if (ok) await api.approveApproval(id)
      else await api.rejectApproval(id)
      setMsg(ok ? 'Action authorized — plan escalated to field execution stage.' : 'Action rejected.')
      refresh()
    } catch (e: any) {
      const m = String(e.message || e)
      setMsg(m.includes('401') ? 'Please log in.' : m.includes('403') ? 'Administrator privileges required.' : m.slice(0, 200))
    }
  }

  const pending = items.filter(a => a.status === 'PENDING')
  const done = items.filter(a => a.status !== 'PENDING')

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#172b22]">
        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#4ade80] font-semibold flex items-center gap-1.5">
            <Scale size={14} />
            <span>TERRAVOX GOVERNANCE &amp; OVERSIGHT</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#f0fdf4]">
            Governance Council &amp; Incident Decision Oversight
          </h1>
        </div>
        <div className="text-xs text-[#8b9f94]">Human-in-the-loop Protocol</div>
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

      {/* Decision metrics */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="tv-card">
            <div className="text-xs text-[#8b9f94]">AI Model Proposals</div>
            <div className="text-2xl font-bold font-mono text-[#38bdf8] mt-1">{stats.ai_decisions ?? 0}</div>
            <div className="text-[11px] text-[#5b6f64] mt-1">Autonomous tactical recommendations</div>
          </div>

          <div className="tv-card">
            <div className="text-xs text-[#8b9f94]">Human / Agency Authorizations</div>
            <div className="text-2xl font-bold font-mono text-[#22c55e] mt-1">{stats.human_decisions ?? 0}</div>
            <div className="text-[11px] text-[#5b6f64] mt-1">Decisions verified with accountability</div>
          </div>

          <div className="tv-card">
            <div className="text-xs text-[#8b9f94]">Pending Reviews</div>
            <div className="text-2xl font-bold font-mono text-[#eab308] mt-1">{stats.pending_approvals ?? pending.length}</div>
            <div className="text-[11px] text-[#5b6f64] mt-1">Requiring priority review</div>
          </div>
        </div>
      )}

      {msg && (
        <div className="p-3 rounded-xl bg-[#091410] border border-[#1f382c] text-xs text-[#cbd5d1] flex items-center justify-between">
          <span>{msg}</span>
          <div className="flex gap-3">
            <Link to="/login" className="text-[#4ade80] hover:underline">Sign In</Link>
            <Link to="/audit" className="text-[#8b9f94] hover:underline">View Audit Log</Link>
          </div>
        </div>
      )}

      {/* Pending Approvals */}
      <div className="tv-card space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#172b22]">
          <h2 className="text-sm font-bold text-[#f0fdf4] flex items-center gap-2">
            <Clock size={16} className="text-[#eab308]" />
            <span>Actions Awaiting Authorization ({pending.length})</span>
          </h2>
          <span className="font-mono text-xs text-[#718579]">Operational Escalation</span>
        </div>

        {pending.length === 0 && !loading && (
          <div className="py-6 text-center text-xs text-[#5b6f64]">
            No pending intervention decisions awaiting approval.
          </div>
        )}

        <div className="space-y-2.5">
          {pending.map(a => (
            <div key={a.id} className="p-3 rounded-xl bg-[#091410] border border-[#1f382c] flex items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-bold text-[#f0fdf4] text-sm">{a.action || 'Tactical Intervention'}</div>
                <div className="text-[11px] text-[#8b9f94] mt-0.5">
                  Plan: <span className="font-mono text-[#cbd5d1]">{String(a.plan_id || '').slice(0, 8)}</span> · ID: <span className="font-mono text-[#5b6f64]">{a.id.slice(0, 8)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => decide(a.id, true)}
                  className="tv-btn-primary text-xs py-1.5 px-3"
                >
                  <CheckCircle2 size={13} /> Approve
                </button>
                <button
                  onClick={() => decide(a.id, false)}
                  className="tv-btn-secondary text-xs py-1.5 px-3 hover:text-[#ef4444]"
                >
                  <XCircle size={13} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Processed History */}
      {done.length > 0 && (
        <div className="tv-card space-y-2">
          <h2 className="text-sm font-bold text-[#f0fdf4] pb-2 border-b border-[#172b22]">
            Decisions Executed ({done.length})
          </h2>
          <div className="space-y-2 text-xs">
            {done.slice(0, 8).map(a => (
              <div key={a.id} className="p-2.5 rounded-lg bg-[#091410] border border-[#14261d] flex items-center justify-between text-[#8b9f94]">
                <span>{a.action || 'Intervention'} — Plan {String(a.plan_id || '').slice(0, 8)}</span>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                  a.status === 'APPROVED' ? 'bg-[#22c55e]/15 text-[#4ade80]' : 'bg-[#ef4444]/15 text-[#ef4444]'
                }`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
