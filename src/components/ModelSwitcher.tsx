import { useEffect, useState } from 'react'
import { API_BASE } from '../services/api'
import { Cpu, Shield, Activity, RefreshCw } from 'lucide-react'

const API = API_BASE

// where each agent's output is actually surfaced (honest mapping)
const POWERS: Record<string, { map?: string; pages: [string, string][] }> = {
  ForestGuard: { map: 'NDVI canopy overlay + forest zones on Map', pages: [['/forest', 'Forestry'], ['/map', 'Map']] },
  FireRisk: { map: 'Wildfire Danger Class + monitoring stations', pages: [['/disaster', 'Incidents'], ['/map', 'Map']] },
  DisasterGuard: { pages: [['/disaster', 'Multi-Hazard Incidents']] },
  CarbonGuard: { pages: [['/carbon', 'Carbon MRV']] },
  EUDRGuard: { pages: [['/eudr', 'EUDR Compliance']] },
}

const token = () => sessionStorage.getItem('ecogl_admin_token') || ''
const authHeaders = (): Record<string, string> => token() ? { Authorization: `Bearer ${token()}` } : {}

export default function ModelSwitcher() {
  const [models, setModels] = useState<any[]>([])
  const [mode, setMode] = useState<any>(null)
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [me, setMe] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      const [m, md] = await Promise.all([
        fetch(`${API}/api/models/switch/list`).then(r => r.json()),
        fetch(`${API}/api/mode`).then(r => r.json()),
      ])
      setModels(m)
      setMode(md)
    } catch {
      setModels([{ agent: 'ForestGuard', active: 'v1.0', available: ['v1.0'] }])
    }
  }

  useEffect(() => { load() }, [])

  const login = async () => {
    setMsg('')
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: user, password: pass }),
      })
      if (!r.ok) {
        setMsg('Login failed: invalid administrative credentials')
        setLoading(false)
        return
      }
      const j = await r.json()
      sessionStorage.setItem('ecogl_admin_token', j.access_token)
      const m = await fetch(`${API}/api/auth/me`, { headers: authHeaders() }).then(x => x.json()).catch(() => null)
      setMe(m)
      setMsg(m?.role === 'admin' ? 'Administrator privileges authenticated' : 'Account lacks permission to modify engine models')
    } catch (e: any) {
      setMsg(e.message || 'Server connection error')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    sessionStorage.removeItem('ecogl_admin_token')
    setMe(null)
  }

  const doSwitch = async (agent: string, version: string) => {
    setMsg('')
    const r = await fetch(`${API}/api/models/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ agent, version }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      setMsg(`Engine switch failed: ${j.detail || r.status}`)
      return
    }
    setMsg(`${agent} → ${version} (recorded in immutable audit log)`)
    load()
  }

  const setModeApi = async (m: string) => {
    setMsg('')
    const r = await fetch(`${API}/api/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ mode: m }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      setMsg(`Environment switch failed: ${j.detail || r.status}`)
      return
    }
    setMode(j)
  }

  const isAdmin = me?.role === 'admin'
  const live = mode?.mode === 'REAL'

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 text-stone-200">
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-stone-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-stone-100">Environmental Intelligence Model Infrastructure (AI Guard Engines)</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-medium border ${
            live
              ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
              : 'bg-amber-950/70 border-amber-700/60 text-amber-300'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {mode ? `${mode.mode} · ${mode.source}` : 'Initializing...'}
          </span>
          <button
            onClick={() => load()}
            title="Reload Engine Status"
            className="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="text-xs text-stone-400 mt-2 font-mono">
        Data Source: <span className="text-stone-300 font-medium">{mode?.source || 'System'}</span>
        {mode && !mode.persistent && ' — active for current session only.'}
      </div>

      {!me ? (
        <div className="mt-3 p-3 rounded-lg bg-stone-950 border border-stone-800 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-stone-400 mr-2">
            <Shield className="w-3.5 h-3.5 text-stone-500" />
            <span>Admin Authorization:</span>
          </div>
          <input
            value={user}
            onChange={e => setUser(e.target.value)}
            placeholder="Admin username"
            aria-label="Username"
            className="bg-stone-900 border border-stone-700 text-stone-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500 font-mono"
          />
          <input
            value={pass}
            onChange={e => setPass(e.target.value)}
            type="password"
            placeholder="Password"
            aria-label="Password"
            className="bg-stone-900 border border-stone-700 text-stone-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500 font-mono"
            onKeyDown={e => { if (e.key === 'Enter') login() }}
          />
          <button
            onClick={login}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-semibold px-3 py-1 rounded text-xs transition disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </div>
      ) : (
        <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/60 flex items-center justify-between text-xs">
          <span className="text-emerald-300">
            User: <strong className="text-emerald-200 font-mono">{me.username}</strong> ({me.role})
          </span>
          <button
            onClick={logout}
            className="text-[11px] text-stone-400 hover:text-stone-200 px-2 py-0.5 rounded border border-stone-700 hover:bg-stone-800 transition"
          >
            Sign Out
          </button>
        </div>
      )}

      {msg && (
        <div className="mt-2 text-xs font-mono p-2 rounded bg-stone-950 border border-stone-800 text-emerald-400">
          {msg}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {models.map(m => (
          <div
            key={m.agent}
            className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-stone-800/80 bg-stone-950/60 flex-wrap"
          >
            <div>
              <div className="text-xs font-semibold text-stone-200 font-mono flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-emerald-500" />
                {m.agent}
              </div>
              <div className="text-[11px] text-stone-400 mt-0.5">
                Surveillance Channel: {POWERS[m.agent]?.map ? `${POWERS[m.agent].map} · ` : ''}
                {POWERS[m.agent]?.pages.map(([to, label], i) => (
                  <a key={to} href={to} className="text-emerald-400 hover:underline">
                    {i > 0 ? ' · ' : ''}{label}
                  </a>
                ))}
              </div>
            </div>

            {isAdmin ? (
              <select
                value={m.active}
                onChange={e => doSwitch(m.agent, e.target.value)}
                aria-label={`Version for ${m.agent}`}
                className="text-xs font-mono bg-stone-900 text-stone-200 border border-stone-700 rounded px-2 py-1 focus:outline-none focus:border-emerald-500"
              >
                {m.available.map((v: string) => (
                  <option key={v} value={v}>{v}{v === m.active ? ' (Active)' : ''}</option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-mono px-2 py-0.5 bg-stone-900 border border-stone-800 rounded text-emerald-400">
                {m.active} ✓
              </span>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="mt-3 pt-3 border-t border-stone-800 flex items-center gap-2">
          <span className="text-xs text-stone-400 font-mono">Environment Switch:</span>
          <button
            onClick={() => setModeApi('DEMO')}
            className={`text-xs font-mono px-2.5 py-1 rounded border transition ${
              mode?.mode === 'DEMO'
                ? 'bg-amber-950/80 border-amber-600 text-amber-300 font-semibold'
                : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-stone-200'
            }`}
          >
            DEMO
          </button>
          <button
            onClick={() => setModeApi('REAL')}
            className={`text-xs font-mono px-2.5 py-1 rounded border transition ${
              mode?.mode === 'REAL'
                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300 font-semibold'
                : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-stone-200'
            }`}
          >
            REAL (LIVE SENSOR FEEDS)
          </button>
        </div>
      )}

      <div className="text-[11px] text-stone-500 mt-2 font-mono">
        * Only calibrated model versions (v1.0 active) may be selected. All configuration events are logged into the audit ledger.
      </div>
    </div>
  )
}
