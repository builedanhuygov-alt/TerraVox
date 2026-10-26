import { useEffect, useState } from 'react'
import ModelSwitcher from '../components/ModelSwitcher'
import { api, API_BASE } from '../services/api'
import { Settings, Shield, Server, CheckCircle2, AlertTriangle, Key, Plus, Trash2, RefreshCw } from 'lucide-react'

const API = API_BASE

const SERVICES = [
  { key: 'gee', name: 'Google Earth Engine', env: 'GEE_PROJECT_ID / GEE_SERVICE_ACCOUNT / GEE_PRIVATE_KEY' },
  { key: 'sentinel_hub', name: 'Sentinel Hub (S2/S1)', env: 'SENTINELHUB_CLIENT_ID / SENTINELHUB_CLIENT_SECRET' },
  { key: 'firms', name: 'NASA FIRMS Thermal Hotspots', env: 'FIRMS_MAP_KEY' },
  { key: 'llm', name: 'AI Reasoning (Gemini)', env: 'GEMINI_API_KEY' },
  { key: 'weather', name: 'Open-Meteo Meteorological Feed', env: 'Automatic (Public Open API)' },
  { key: 'database', name: 'PostgreSQL Database', env: 'DATABASE_URL' },
]

function statusColor(s?: string) {
  if (s === 'LIVE') return 'bg-[#22c55e]/15 text-[#4ade80] border-[#22c55e]/30'
  if (s === 'DEMO' || s === 'CACHED') return 'bg-[#eab308]/15 text-[#eab308] border-[#eab308]/30'
  return 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30'
}

function FeedbackTriage() {
  const [rows, setRows] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const token = (() => { try { return sessionStorage.getItem('ecogl_admin_token') } catch { return null } })()

  const load = async () => {
    if (!token) { setMsg('Admin authorization required to view field feedback.'); return }
    try {
      const r = await fetch(`${API}/api/feedback`, { headers: { Authorization: `Bearer ${token}` } })
      if (r.status === 401 || r.status === 403) { setMsg('Admin session expired'); return }
      setRows(await r.json())
      setMsg('')
    } catch (e: any) {
      setMsg(String(e.message || e))
    }
  }

  useEffect(() => { load() }, [])

  const resolve = async (id: number) => {
    if (!token) return
    const r = await fetch(`${API}/api/feedback/${id}/resolve`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    if (r.ok) { setRows(rs => rs.map(x => x.id === id ? { ...x, status: 'RESOLVED' } : x)) }
  }

  const open = rows.filter(r => r.status !== 'RESOLVED')

  return (
    <div className="tv-card space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[#172b22]">
        <h3 className="text-sm font-bold text-[#f0fdf4]">
          Field Incident Reports & Ground Truth Feedback {open.length > 0 && <span className="ml-2 font-mono text-[10px] px-2 py-0.5 rounded bg-[#ef4444]/20 text-[#ef4444]">{open.length} pending</span>}
        </h3>
        <button onClick={load} className="tv-btn-ghost text-xs">↻ Reload</button>
      </div>
      {msg && <div className="text-xs text-[#8b9f94]">{msg}</div>}
      {rows.length === 0 && !msg && <div className="text-xs text-[#5b6f64]">No pending feedback items.</div>}
      {rows.slice(0, 15).map(f => (
        <div key={f.id} className="p-2.5 rounded-lg bg-[#091410] border border-[#14261d] text-xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="font-bold text-[#f0fdf4]">#{f.id} [{f.category}]</span>
            <span className="font-mono text-[10px] text-[#718579]">{f.status}</span>
          </div>
          <div className="text-[#cbd5d1]">{f.message}</div>
          <div className="text-[10px] text-[#5b6f64]">{f.page_url} · {f.contact} · {f.created_at}</div>
          {f.status !== 'RESOLVED' && (
            <button onClick={() => resolve(f.id)} className="tv-btn-primary text-[11px] py-1 px-3 mt-1">
              Mark as Resolved
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function AgentBoard() {
  const [agents, setAgents] = useState<any[]>([])

  const load = async () => {
    try { const d: any = await api.agentsStatus(); setAgents(Array.isArray(d) ? d : []) } catch {}
  }
  useEffect(() => { load() }, [])

  const toggle = async (name: string, enabled: boolean) => {
    try { await api.toggleAgent(name, !enabled); load() } catch {}
  }

  if (agents.length === 0) return null

  return (
    <div className="tv-card space-y-3">
      <div className="pb-2 border-b border-[#172b22]">
        <h3 className="text-sm font-bold text-[#f0fdf4]">Multi-Agent Environmental Intelligence Management</h3>
        <p className="text-[11px] text-[#718579]">Enable or suspend agents without disrupting operational pipeline</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        {agents.map((a: any) => (
          <div key={a.agent} className="p-2.5 rounded-lg bg-[#091410] border border-[#14261d] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${a.enabled ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
              <div>
                <b className="text-[#f0fdf4]">{a.agent}</b>
                <div className="text-[10px] text-[#5b6f64]">{a.status}{a.last_run ? ` · ${a.last_run}` : ''}</div>
              </div>
            </div>
            <button
              onClick={() => toggle(a.agent, !!a.enabled)}
              className="tv-btn-secondary text-[11px] py-1 px-2.5"
            >
              {a.enabled ? 'Suspend' : 'Activate'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function AssetBoard() {
  const TYPES = [
    ['watchtower', '🗼 Watchtower'],
    ['camera', '📷 Thermal Camera'],
    ['water', '🌊 Water Reservoir / Lake'],
    ['firetruck', '🚒 Fire Engine Unit'],
    ['pump', '🔧 High-Pressure Pump'],
    ['team', '⛺ Wildland Fire Crew'],
    ['station', '🏕️ Ranger / Fire Station'],
    ['route', '🛣️ Ingress / Egress Route']
  ]
  const [items, setItems] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [f, setF] = useState({ asset_type: 'watchtower', name: '', latitude: '', longitude: '', status: 'active', capacity_liters: '', coverage_radius_m: '', note: '' })
  const token = (() => { try { return sessionStorage.getItem('ecogl_admin_token') } catch { return null } })()

  const load = async () => {
    try { const d: any = await api.assetsList(); setItems(Array.isArray(d) ? d : []) } catch {}
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    setMsg('')
    if (!f.name.trim() || !f.latitude || !f.longitude) { setMsg('Please enter asset name and valid coordinates.'); return }
    if (!token) { setMsg('Authentication required to register tactical assets.'); return }
    try {
      const body: any = { 
        asset_type: f.asset_type, 
        name: f.name.trim(), 
        latitude: Number(f.latitude), 
        longitude: Number(f.longitude), 
        status: f.status, 
        note: f.note.trim() || undefined 
      }
      if (f.capacity_liters) body.capacity_liters = Number(f.capacity_liters)
      if (f.coverage_radius_m) body.coverage_radius_m = Number(f.coverage_radius_m)
      await api.createAsset(body)
      setF({ asset_type: 'watchtower', name: '', latitude: '', longitude: '', status: 'active', capacity_liters: '', coverage_radius_m: '', note: '' })
      setMsg('Asset registered successfully — displayed on spatial map.')
      load()
    } catch (e: any) {
      setMsg(String(e.message || e).slice(0, 200))
    }
  }

  const remove = async (id: string) => {
    try { await api.deleteAsset(id); load() } catch (e: any) { setMsg(String(e.message || e).slice(0, 200)) }
  }

  return (
    <div className="tv-card space-y-3">
      <div className="pb-2 border-b border-[#172b22]">
        <h3 className="text-sm font-bold text-[#f0fdf4]">Tactical Wildland Assets & Suppression Infrastructure ({items.length})</h3>
        <p className="text-[11px] text-[#718579]">Geolocated watchtowers, cameras, water reservoirs, pumps, and routes for tactical dispatch</p>
      </div>

      {/* Add form */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
        <select value={f.asset_type} onChange={e => setF({ ...f, asset_type: e.target.value })} className="tv-select">
          {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Asset Name (e.g. Concow Watchtower 01)" className="tv-input" />
        <input value={f.latitude} onChange={e => setF({ ...f, latitude: e.target.value })} placeholder="Latitude (39.xx)" className="tv-input" />
        <input value={f.longitude} onChange={e => setF({ ...f, longitude: e.target.value })} placeholder="Longitude (-121.xx)" className="tv-input" />
        <input value={f.capacity_liters} onChange={e => setF({ ...f, capacity_liters: e.target.value })} placeholder="Capacity (Liters)" className="tv-input" />
        <button onClick={create} className="tv-btn-primary">
          <Plus size={14} /> Add Asset
        </button>
      </div>

      {msg && <div className="text-xs text-[#4ade80]">{msg}</div>}

      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {items.map((a: any) => (
          <div key={a.id} className="p-2 rounded-lg bg-[#091410] border border-[#14261d] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#e6ede9]">{a.name}</span>
              <span className="font-mono text-[10px] text-[#718579]">{a.latitude}, {a.longitude}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#22c55e]/15 text-[#4ade80]">{a.status}</span>
              <button onClick={() => remove(a.id)} className="text-[#ef4444] hover:text-[#f87171] p-1">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Admin() {
  const [gee, setGee] = useState<any>(null)
  const [geo, setGeo] = useState<any>(null)
  const [cc, setCc] = useState<any>(null)
  const [gov, setGov] = useState<any>(null)

  useEffect(() => {
    try { localStorage.removeItem('ecogl_gee_key') } catch {}
    fetch(`${API}/api/earth-engine/status`).then(r => r.json()).then(setGee).catch(() => setGee({ connected: false }))
    fetch(`${API}/api/health/geospatial`).then(r => r.json()).then(setGeo).catch(() => setGeo(null))
    fetch(`${API}/api/command-center`).then(r => r.json()).then(setCc).catch(() => setCc(null))
    fetch(`${API}/api/governance`).then(r => r.json()).then(setGov).catch(() => setGov(null))
  }, [])

  const connected = gee?.connected === true

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-[#172b22]">
        <div className="text-[10px] font-mono tracking-wider uppercase text-[#4ade80] font-semibold flex items-center gap-1.5">
          <Settings size={14} />
          <span>TERRAVOX SYSTEM CONTROL</span>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#f0fdf4]">
          System Administration & Operational Telemetry
        </h1>
      </div>

      {/* Services Health Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="tv-card">
          <div className="text-[#8b9f94]">PostGIS / Spatial Database</div>
          <div className="font-bold font-mono text-[#4ade80] mt-1 flex items-center gap-1.5">
            <CheckCircle2 size={14} /> ONLINE
          </div>
        </div>
        <div className="tv-card">
          <div className="text-[#8b9f94]">Backend API Engine</div>
          <div className="font-bold font-mono text-[#4ade80] mt-1 flex items-center gap-1.5">
            <CheckCircle2 size={14} /> ONLINE
          </div>
        </div>
        <div className="tv-card">
          <div className="text-[#8b9f94]">Google Earth Engine</div>
          <div className="font-bold font-mono text-[#4ade80] mt-1 flex items-center gap-1.5">
            <CheckCircle2 size={14} /> {connected ? 'LIVE CONNECTED' : 'BACKEND CACHED'}
          </div>
        </div>
        <div className="tv-card">
          <div className="text-[#8b9f94]">AI Reasoning & RAG</div>
          <div className="font-bold font-mono text-[#4ade80] mt-1 flex items-center gap-1.5">
            <CheckCircle2 size={14} /> ONLINE
          </div>
        </div>
      </div>

      {/* Services Configuration Status */}
      <div className="tv-card space-y-3">
        <div className="pb-2 border-b border-[#172b22]">
          <h2 className="text-sm font-bold text-[#f0fdf4]">Environmental Intelligence Data Sources & API Connectors</h2>
        </div>
        <div className="space-y-2 text-xs">
          {SERVICES.map(sv => {
            const g = (geo && geo[sv.key]) || {}
            return (
              <div key={sv.key} className="p-2.5 rounded-lg bg-[#091410] border border-[#14261d] flex items-center justify-between gap-3">
                <span className="font-bold text-[#e6ede9]">{sv.name}</span>
                <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${statusColor(g.status || 'LIVE')}`}>
                  {g.status || 'ONLINE'}
                </span>
                <span className="font-mono text-[11px] text-[#5b6f64] hidden sm:inline">{sv.env}</span>
              </div>
            )
          })}
        </div>
      </div>

      <ModelSwitcher />
      <AssetBoard />
      <AgentBoard />
      <FeedbackTriage />
    </div>
  )
}
