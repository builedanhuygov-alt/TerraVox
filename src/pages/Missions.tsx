import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../services/api'
import { ShieldCheck, Plus, Play, CheckCircle2, AlertTriangle, ArrowRight, MapPin, ClipboardList, Activity } from 'lucide-react'

type MissionRow = {
  id: string
  goal: string
  scope?: string
  priority?: string
  status?: string
}

type PlanRow = {
  id: string
  goal: string
  priority?: string
  execution_status?: string
  approval_status?: string
}

export default function Missions() {
  const [tab, setTab] = useState<'missions' | 'plans' | 'field'>('missions')
  const [missions, setMissions] = useState<MissionRow[]>([])
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [goal, setGoal] = useState('')
  const [planGoal, setPlanGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [openPlan, setOpenPlan] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [sim, setSim] = useState<any>(null)
  const [rec, setRec] = useState<any>(null)

  const loc = useLocation()
  const incomingArea = (loc.state as any)?.area

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [ms, ps] = await Promise.all([
        api.missions().catch(() => []),
        api.plans().catch(() => [])
      ])
      setMissions(Array.isArray(ms) ? ms : [])
      setPlans(Array.isArray(ps) ? ps : [])
    } catch (e: any) {
      setError(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!goal.trim()) return
    setError('')
    try {
      const r = await api.createMission({
        goal: goal.trim(),
        scope: incomingArea || 'California Pilot',
        priority: 'HIGH'
      })
      setMissions(m => [r, ...m])
      setGoal('')
    } catch (e: any) {
      setError(String(e.message || e))
    }
  }

  const createP = async () => {
    if (!planGoal.trim()) return
    setError('')
    try {
      const r = await api.createPlan({
        goal: planGoal.trim(),
        goal_type: 'ENVIRONMENTAL_PROTECTION',
        priority: 'HIGH'
      })
      setPlans(p => [r, ...p])
      setPlanGoal('')
    } catch (e: any) {
      setError(String(e.message || e))
    }
  }

  const openPlanDetails = async (id: string) => {
    if (openPlan === id) { setOpenPlan(null); return }
    setOpenPlan(id)
    setDetail(null)
    setSim(null)
    setRec(null)
    try {
      const d = await api.planDetail(id)
      setDetail(d)
    } catch (e: any) {
      setError(String(e.message || e))
    }
  }

  const act = async (action: 'delegate' | 'simulate' | 'recommend', id: string) => {
    setError('')
    try {
      if (action === 'delegate') {
        await api.delegatePlan(id)
        load()
      } else if (action === 'simulate') {
        const s = await api.simulatePlan(id)
        setSim(s)
      } else if (action === 'recommend') {
        const r = await api.planRecommendation(id)
        setRec(r)
      }
    } catch (e: any) {
      setError(String(e.message || e))
    }
  }

  // Ranger Field Protocol checklist state
  const [steps, setSteps] = useState([false, false, false, false])
  const [log, setLog] = useState<string[]>([])

  const pushLog = (s: string) => setLog(l => [`${new Date().toLocaleTimeString()} · ${s}`, ...l.slice(0, 9)])

  const activeMissions = missions.filter(m => m.status !== 'COMPLETED').length

  const getStatusBadge = (s?: string) => {
    switch (s?.toUpperCase()) {
      case 'COMPLETED':
      case 'DONE':
        return <span className="font-mono text-[10px] text-[#4ade80] bg-[#22c55e]/15 border border-[#22c55e]/30 px-2 py-0.5 rounded">COMPLETED</span>
      case 'RUNNING':
      case 'IN_PROGRESS':
        return <span className="font-mono text-[10px] text-[#38bdf8] bg-[#38bdf8]/15 border border-[#38bdf8]/30 px-2 py-0.5 rounded">IN PROGRESS</span>
      default:
        return <span className="font-mono text-[10px] text-[#eab308] bg-[#eab308]/15 border border-[#eab308]/30 px-2 py-0.5 rounded">DISPATCH PENDING</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#172b22]">
        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#4ade80] font-semibold">
            TERRAVOX FIELD DISPATCH
          </div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#f0fdf4]">
            Field Missions &amp; Tactical Coordination
          </h1>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-[#091410] border border-[#172b22] rounded-lg">
          {(['missions', 'plans', 'field'] as const).map(tabId => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === tabId
                  ? 'bg-[#22c55e] text-[#070f0b] font-bold shadow-xs'
                  : 'text-[#8b9f94] hover:text-[#f0fdf4]'
              }`}
            >
              {tabId === 'missions' ? `Missions (${activeMissions})` : tabId === 'plans' ? 'Tactical Plans' : 'Patrol Protocols'}
            </button>
          ))}
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

      {/* Tab 1: Missions */}
      {tab === 'missions' && !loading && (
        <div className="space-y-4">
          {incomingArea && (
            <div className="p-3 rounded-xl bg-[#14261d] border border-[#1f4733] text-xs text-[#4ade80] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin size={14} />
                <span>Target Sector linked from Map: <b>{incomingArea}</b></span>
              </span>
              <span className="font-mono text-[10px] text-[#8b9f94]">California Pilot Unit</span>
            </div>
          )}

          {/* New mission input */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="Enter new mission objective: e.g. Reconnaissance patrol along Jarbo Gap corridor..."
              className="tv-input flex-1"
              onKeyDown={e => { if (e.key === 'Enter') create() }}
            />
            <button
              onClick={create}
              className="tv-btn-primary whitespace-nowrap"
            >
              <Plus size={14} />
              <span>Launch Mission</span>
            </button>
          </div>

          {/* Mission list */}
          <div className="space-y-3">
            {missions.length === 0 ? (
              <div className="tv-card text-center py-8 text-xs text-[#5b6f64]">
                No field missions currently assigned. Create the first mission above.
              </div>
            ) : (
              missions.map(m => (
                <div key={m.id} className="tv-card space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-[#f0fdf4]">{m.goal}</div>
                      <div className="text-xs text-[#8b9f94] flex items-center gap-2">
                        <span>Jurisdiction: <b className="text-[#cbd5d1]">{m.scope || 'California Pilot'}</b></span>
                        <span>·</span>
                        <span className="font-mono text-[11px] text-[#5b6f64]">ID: {m.id.slice(0, 8)}</span>
                      </div>
                    </div>
                    {getStatusBadge(m.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: AI Multi-Agent Plans */}
      {tab === 'plans' && !loading && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={planGoal}
              onChange={e => setPlanGoal(e.target.value)}
              placeholder="Autonomous multi-agent planning objective: e.g. Pre-position containment lines along Feather River..."
              className="tv-input flex-1"
              onKeyDown={e => { if (e.key === 'Enter') createP() }}
            />
            <button
              onClick={createP}
              className="tv-btn-primary whitespace-nowrap"
            >
              <Plus size={14} />
              <span>Generate AI Plan</span>
            </button>
          </div>

          <div className="space-y-3">
            {plans.length === 0 ? (
              <div className="tv-card text-center py-8 text-xs text-[#5b6f64]">
                No automated tactical plans generated yet.
              </div>
            ) : (
              plans.map(p => (
                <div key={p.id} className="tv-card space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm text-[#f0fdf4]">{p.goal}</div>
                      <div className="text-xs text-[#8b9f94] mt-1 font-mono text-[11px]">
                        ID: {p.id.slice(0, 8)} · Status: {p.execution_status || p.approval_status || 'PENDING'}
                      </div>
                    </div>
                    <button
                      onClick={() => openPlanDetails(p.id)}
                      className="tv-btn-secondary text-xs"
                    >
                      {openPlan === p.id ? 'Collapse' : 'Details'}
                    </button>
                  </div>

                  {openPlan === p.id && detail && (
                    <div className="p-3 bg-[#08120e] rounded-xl border border-[#14261e] space-y-3 text-xs">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => act('delegate', p.id)}
                          className="tv-btn-primary text-xs"
                        >
                          Authorize Autonomous Agents
                        </button>
                        <button
                          onClick={() => act('simulate', p.id)}
                          className="tv-btn-secondary text-xs"
                        >
                          Simulate Outcomes
                        </button>
                        <button
                          onClick={() => act('recommend', p.id)}
                          className="tv-btn-secondary text-xs"
                        >
                          Tactical Directives
                        </button>
                      </div>

                      {sim && (
                        <div className="p-2.5 rounded-lg bg-[#0e1d17] border border-[#1f3d30] text-[11px] text-[#cbd5d1]">
                          <div className="font-bold text-[#4ade80] mb-1">Plan Simulation Forecast:</div>
                          <pre className="font-mono text-[10px] overflow-x-auto text-[#a7f3d0]">
                            {JSON.stringify(sim, null, 2)}
                          </pre>
                        </div>
                      )}

                      {rec && (
                        <div className="p-2.5 rounded-lg bg-[#0e1d17] border border-[#1f3d30] text-[11px] text-[#cbd5d1]">
                          <div className="font-bold text-[#38bdf8] mb-1">Tactical Coordination Recommendations:</div>
                          <pre className="font-mono text-[10px] overflow-x-auto text-[#a7f3d0]">
                            {JSON.stringify(rec, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Ranger Field Checklist */}
      {tab === 'field' && (
        <div className="tv-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#172b22]">
            <div>
              <h2 className="text-sm font-bold text-[#f0fdf4]">Wildland Fire Tactical Field Protocol</h2>
              <p className="text-xs text-[#8b9f94]">Standard field verification protocol aligned with CAL FIRE & NWCG guidelines</p>
            </div>
            <span className="font-mono text-xs text-[#4ade80]">
              {steps.filter(Boolean).length}/4 Steps Completed
            </span>
          </div>

          <div className="space-y-2">
            {[
              "Step 1: Ingest GPS coordinates & download offline multi-spectral imagery",
              "Step 2: Measure surface wind speed, ambient RH, and fine dead fuel moisture",
              "Step 3: Inspect nearest water tenders, hydrants & apparatus access corridors",
              "Step 4: Capture geo-tagged field verification imagery & submit status report"
            ].map((st, i) => (
              <label 
                key={i} 
                className="flex items-center gap-3 p-3 rounded-lg bg-[#091410] border border-[#14261d] cursor-pointer hover:border-[#1f3d2e] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={steps[i]}
                  onChange={e => {
                    const next = [...steps]
                    next[i] = e.target.checked
                    setSteps(next)
                    pushLog(e.target.checked ? `Completed: ${st.slice(0, 24)}...` : `Unchecked: ${st.slice(0, 24)}...`)
                  }}
                  className="accent-[#22c55e] w-4 h-4 cursor-pointer"
                />
                <span className={`text-xs ${steps[i] ? 'text-[#4ade80] font-medium line-through opacity-70' : 'text-[#cbd5d1]'}`}>
                  {st}
                </span>
              </label>
            ))}
          </div>

          {/* Activity log */}
          {log.length > 0 && (
            <div className="pt-3 border-t border-[#172b22]">
              <div className="text-[10px] font-mono uppercase text-[#718579] mb-1.5">Field Patrol Protocol Activity Log:</div>
              <div className="space-y-1 font-mono text-[10px] text-[#8b9f94]">
                {log.map((l, i) => (
                  <div key={i} className="truncate">{l}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
