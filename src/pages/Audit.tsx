import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Shield, Clock, FileCode, CheckCircle2 } from 'lucide-react'

export default function Audit() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.auditLog()
      .then((d: any) => setRows(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#172b22]">
        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#4ade80] font-semibold flex items-center gap-1.5">
            <Shield size={14} />
            <span>TERRAVOX IMMUTABLE AUDIT LOG</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#f0fdf4]">
            System Audit Log & Telemetry Oversight
          </h1>
        </div>
        <span className="text-xs font-mono text-[#8b9f94]">Environmental Data Integrity</span>
      </div>

      {loading && (
        <div className="space-y-2">
          <div className="skeleton h-8 w-64" />
          <div className="skeleton h-32 w-full" />
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="tv-card text-center py-12 text-xs text-[#5b6f64]">
          No audit log entries recorded yet.
        </div>
      )}

      <div className="space-y-2">
        {rows.map((l: any, i: number) => (
          <div key={i} className="tv-card p-3 font-mono text-xs text-[#cbd5d1] flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[#4ade80] font-bold">{l.action}</span>
                <span className="text-[#5b6f64]">·</span>
                <span className="text-[#f0fdf4]">{l.resource_type}{l.resource_id ? `/${String(l.resource_id).slice(0, 8)}` : ''}</span>
              </div>
              {l.detail && (
                <div className="text-[11px] text-[#8b9f94] mt-1 font-sans">
                  {String(l.detail).slice(0, 160)}
                </div>
              )}
            </div>

            <div className="text-[10px] text-[#5b6f64] shrink-0">
              {l.created_at?.slice(0, 19).replace('T', ' ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
