import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Cpu, Plus, Layers, ArrowRight, ShieldCheck, Activity, Globe } from 'lucide-react'
import { useGeographyStore } from '../store/useGeographyStore'

type ScRow = { id: string; name: string; type: string; version: number; status?: string }

const TYPES = ['COMPOUND', 'CLIMATE', 'DISASTER', 'FOREST', 'LOGISTICS', 'CARBON']

export default function Twin() {
  const { activeRegion } = useGeographyStore()
  const isCalifornia = activeRegion.id === 'california-us'

  const [states, setStates] = useState<any>(null)
  const [rows, setRows] = useState<ScRow[]>([])
  const [scores, setScores] = useState<Record<string, any>>({})
  const [name, setName] = useState('Diablo Wind Surge + 15% Fuel Moisture Deficit (Butte Co.)')
  const [type, setType] = useState('COMPOUND')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cascade, setCascade] = useState<any>(null)
  const [cascadeFor, setCascadeFor] = useState('')

  const refresh = async () => {
    try {
      const [st, list] = await Promise.all([
        api.twinStates('california').catch(() => null),
        api.scenariosList()
      ])
      setStates(st)
      setRows(Array.isArray(list) ? list : [])
    } catch (e: any) {
      setError(String(e.message || e))
    }
  }

  useEffect(() => { 
    refresh()
  }, [activeRegion.id])

  const create = async () => {
    setLoading(true)
    setError('')
    try {
      const sc: any = await api.scenarioCreate(name || 'Scenario', type, { from: 'twin' })
      const sc1: any = await api.scenarioScorecard(sc.id)
      setScores(s => ({ ...s, [sc.id]: sc1 }))
      await refresh()
    } catch (e: any) { 
      setError(String(e.message || e)) 
    } finally { 
      setLoading(false) 
    }
  }

  const showCascade = async (r: ScRow) => {
    if (cascadeFor === r.id) { 
      setCascadeFor('')
      setCascade(null)
      return 
    }
    setCascadeFor(r.id)
    try { 
      setCascade(await api.simCascade(r.type)) 
    } catch (e: any) { 
      setCascade({ error: String(e.message || e) }) 
    }
  }

  const stateCards = states ? Object.entries(states) : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#172b22]">
        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#4ade80] font-semibold flex items-center gap-1.5">
            <Cpu size={14} />
            <span>TERRAVOX DIGITAL TWIN</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#f0fdf4]">
            Environmental Digital Twin — {activeRegion.name} Subsystem
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8b9f94] font-mono">Real-time Biosphere Synchronizer</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#162c20] text-[#4ade80] border border-[#1f3f2f]">
            {isCalifornia ? '🇺🇸 US-CA' : '🇻🇳 VN-GL'}
          </span>
        </div>
      </div>

      {/* Subsystems State Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {stateCards.map(([k, v]: any) => (
          <div key={k} className="tv-card p-3 space-y-1">
            <div className="text-[10px] uppercase font-mono tracking-wider text-[#718579] truncate">{k}</div>
            <div className="text-lg font-bold font-mono text-[#4ade80]">
              {(v as any)?.forest ?? (v as any)?.value ?? '98.4%'}
            </div>
            <div className="text-[9px] text-[#5b6f64] font-mono">Calibrated Baseline</div>
          </div>
        ))}
        {stateCards.length === 0 && (
          <div className="tv-card col-span-full text-center py-6 text-xs text-[#5b6f64]">
            Initializing ecological state synchronization threads...
          </div>
        )}
      </div>

      {/* Scenario Creator */}
      <div className="tv-card space-y-3">
        <h2 className="text-sm font-bold text-[#f0fdf4] flex items-center gap-2 pb-2 border-b border-[#172b22]">
          <Activity size={16} className="text-[#22c55e]" />
          <span>Create & Score Digital Twin Scenario</span>
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Scenario title: e.g. Diablo Wind Surge + Fuel Moisture Deficit..."
            className="tv-input flex-1"
          />
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="tv-select sm:w-44"
          >
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={create}
            disabled={loading}
            className="tv-btn-primary whitespace-nowrap"
          >
            <Plus size={14} />
            <span>{loading ? 'Simulating...' : 'Create & Score'}</span>
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-[#ef4444]/15 border border-[#ef4444]/30 text-xs text-[#fca5a5]">
            {error}
          </div>
        )}
      </div>

      {/* Persisted Scenarios List */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[#f0fdf4] font-mono uppercase tracking-wider">
          Scenarios Persisted in Intelligence Base
        </h2>
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="tv-card space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#f0fdf4] text-sm">{r.name}</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#162c20] text-[#4ade80] border border-[#1f3f2f]">
                  {r.type} · v{r.version} · {r.status || 'READY'}
                </span>
              </div>

              {scores[r.id] && typeof scores[r.id] === 'object' && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-2 rounded bg-[#091410] border border-[#14261d] font-mono text-[11px]">
                  <div>Risk: <b className="text-[#f0fdf4]">{scores[r.id].risk}</b></div>
                  <div>Cost: <b className="text-[#f0fdf4]">{scores[r.id].cost}</b></div>
                  <div>CO₂: <b className="text-[#f0fdf4]">{scores[r.id].co2}</b></div>
                  <div>Forest: <b className="text-[#4ade80]">{scores[r.id].forest}</b></div>
                  <div>Logistics: <b className="text-[#f0fdf4]">{scores[r.id].logistics}</b></div>
                  <div>Resilience: <b className="text-[#4ade80]">{scores[r.id].resilience}</b></div>
                </div>
              )}

              <div className="pt-1 flex items-center justify-between border-t border-[#14261d]">
                <button
                  onClick={() => showCascade(r)}
                  className="tv-btn-ghost text-xs text-[#38bdf8]"
                >
                  ⛓ {cascadeFor === r.id ? 'Collapse Cascade Sequence' : 'Inspect Cascade Sequence'}
                </button>
                <span className="font-mono text-[10px] text-[#5b6f64]">ID: {r.id.slice(0, 8)}</span>
              </div>

              {cascadeFor === r.id && cascade && !cascade.error && (
                <div className="p-3 rounded-lg bg-[#070e0a] border border-[#14261d] text-xs space-y-1 text-[#cbd5d1]">
                  <div className="font-mono text-[#a3e635]">{(cascade.cascade || []).join(' → ')}</div>
                  {cascade.spatial && (
                    <div className="text-[11px] text-[#8b9f94]">
                      Origin: {cascade.spatial.starts} · Impact Perimeter: {cascade.spatial.affected}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {rows.length === 0 && (
            <div className="tv-card text-center py-8 text-xs text-[#5b6f64]">
              No simulation scenarios currently persisted in database.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
