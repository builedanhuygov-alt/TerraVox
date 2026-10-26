import { MetricCard, AIInsightCard, AlertCard } from '../components/Cards'
import MapView from '../components/MapView'
import WeatherCard from '../components/WeatherCard'
import { StaggerContainer, StaggerItem } from '../motion/primitives'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { api, API_BASE } from '../services/api'

const RISK_ICON: Record<string,string> = { FIRE:'🔥', FLOOD:'🌊', LANDSLIDE:'⛰️', DROUGHT:'☀️', HEAT:'🌡️' }

function isDemoOrigin(o: unknown){
  return /DEMO|SIMULATED|MOCK/i.test(String(o || ''))
}

export default function Dashboard() {
  const [selected, setSelected] = useState<string|null>(null)
  const [selectedInfo, setSelectedInfo] = useState<any|null>(null)
  const [pending, setPending] = useState<string[]>([])
  const [kpis, setKpis] = useState<any[]|null>(null)
  const [liveAlerts, setLiveAlerts] = useState<any[]|null>(null)
  const [trend, setTrend] = useState<any[]|null>(null)
  const [badge, setBadge] = useState('LOADING…')
  const nav = useNavigate()

  useEffect(()=>{
    // real commune/station name clicked on the map (MapView dispatches this)
    const h = (e: any)=> setSelected(e.detail?.area || null)
    window.addEventListener('ecochain-select-area', h)
    return ()=> window.removeEventListener('ecochain-select-area', h)
  },[])

  useEffect(()=>{
    // KPIs + alerts come ONLY from real backend endpoints. When unreachable,
    // show an explicit offline state — never invented placeholder numbers.
    Promise.all([
      api.forestStats().catch(()=> null),
      api.riskOverview().catch(()=> null),
      api.dashboard().catch(()=> null),
      api.alertList('ACTIVE').catch(()=> []),
    ]).then(([stats, overview, green, alerts]: any[])=>{
      const origins = [stats?.origin, overview?.origin, green?.origin].filter(Boolean)
      if(!stats && !overview && !green){
        setBadge('OFFLINE')
        setKpis(null); setLiveAlerts([])
        return
      }
      setBadge(origins.some(isDemoOrigin) ? 'DEMO TELEMETRY' : 'LIVE SENSOR FEEDS')
      const num = (v: unknown)=> typeof v === 'number' ? v : 0
      setKpis([
        { label:'Monitored Sectors', value:String(num(stats?.areas_monitored)), unit:'zones', trend:'live', dir:'flat', status:'good' },
        { label:'Pending Signals', value:String(num(stats?.pending_signals)), unit:'', trend:'live', dir:'flat', status:'warn' },
        { label:'Community Verified', value:String(num(stats?.community_verified)), unit:'', trend:'live', dir:'flat', status:'good' },
        { label:'Critical Alerts', value:String(num(overview?.critical_alerts)), unit:'', trend:'live', dir:'flat', status:'danger' },
        { label:'Elevated Fire Risk', value:String(num(stats?.high_risk)), unit:'zones', trend:'live', dir:'flat', status:'warn' },
        { label:'Traceable Parcels', value:String(num(green?.traceable_farms)), unit:'', trend:'live', dir:'flat', status:'neutral' },
        { label:'EUDR Readiness Lots', value:String(num(green?.eudr_ready_lots)), unit:'', trend:'live', dir:'flat', status:'neutral' },
        { label:'Green Evacuation Routes', value:String(num(green?.green_routes)), unit:'', trend:'live', dir:'flat', status:'neutral' },
      ])
      const rows = Array.isArray(alerts) ? alerts.slice(0,3) : []
      setLiveAlerts(rows.map((a:any)=> ({
        id: a.id,
        icon: RISK_ICON[String(a.risk_type||'').toUpperCase()] || '⚠️',
        title: a.title || `${a.risk_type || 'Alert'} — ${a.level || ''}`,
        loc: a.administrative_unit_id || '',
        time: String(a.created_at || '').slice(0,16).replace('T',' '),
        status: a.status || '',
      })))
    }).catch(()=> { setBadge('OFFLINE'); setKpis(null); setLiveAlerts([]) })
    // trend from real risk history; empty state when no records yet
    api.riskHistory('California').then((h:any)=>{
      const recs = Array.isArray(h?.records) ? h.records : []
      setTrend(recs.length ? recs.slice(-12).map((r:any)=> ({ v: r.score })) : [])
    }).catch(()=> setTrend([]))
  },[])

  useEffect(()=>{
    // real pending work: PENDING approvals + ACTIVE alerts
    const API = API_BASE
    Promise.all([
      fetch(`${API}/api/approvals`).then(r=> r.ok ? r.json() : []).catch(()=> []),
      api.alertList().catch(()=> []),
    ]).then(([ap, al]: any[])=>{
      const items: string[] = []
      const pa = (Array.isArray(ap) ? ap : []).filter((a:any)=> a.status === 'PENDING').slice(0,2)
      pa.forEach((a:any)=> items.push(`Approve ${a.action || 'action'} — plan ${String(a.plan_id || '').slice(0,8)}`))
      const aa = (Array.isArray(al) ? al : []).filter((a:any)=> a.status === 'ACTIVE').slice(0, 3 - pa.length)
      aa.forEach((a:any)=> items.push(`${a.title || 'Alert'} — ${a.administrative_unit_id || ''}`))
      setPending(items)
    }).catch(()=> {})
  },[])

  useEffect(()=>{
    if(!selected){ setSelectedInfo(null); return }
    api.riskProfile(selected).then(setSelectedInfo).catch(()=> setSelectedInfo(null))
  },[selected])

  const askAI = (area: string)=>{
    window.dispatchEvent(new CustomEvent('ecochain-open-ai', { detail:{ query: `Analyze wildfire risk and fuel conditions for ${area}, California` } }))
  }
  const shownKpis: any[] = kpis || []
  const shownAlerts: any[] = liveAlerts || []
  const offline = kpis === null
  return (
    <div className="dash">
      <div className="welcome">
        <div style={{display:'flex', gap:12, alignItems:'center'}}>
          <img src="/logo.svg" alt="TERRAVOX" style={{width:44, height:44, borderRadius:10}} />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#f0fdf4]">TERRAVOX — Wildland Environmental Intelligence</h1>
            <p className="text-xs text-[#8b9f94]">Listen to the Earth · Understand the Signals · Act with Confidence</p>
          </div>
        </div>
        <span className="demo-badge">{badge}</span>
      </div>

      <StaggerContainer>
        {offline ? (
          <div className="card" style={{fontSize:13}}>Unable to connect to backend — verify network and reload. Stale metrics hidden to prevent misinterpretation.</div>
        ) : (
        <>
        <div className="kpi-grid">
          {shownKpis.slice(0,4).map((k:any)=> <StaggerItem key={k.label}><MetricCard {...k} icon={<span>●</span>} /></StaggerItem>)}
        </div>
        <div className="kpi-grid">
          {shownKpis.slice(4,8).map((k:any)=> <StaggerItem key={k.label}><MetricCard {...k} icon={<span>■</span>} /></StaggerItem>)}
        </div>
        </>
        )}
      </StaggerContainer>

      <WeatherCard />
      <MapView onSelect={(_t, id)=> setSelected(id)} />

      {selected && (
        <div className="panel">
          <h3>{selected}{selectedInfo ? ` — Risk Score ${selectedInfo.overall_score ?? '?'}/100 (${selectedInfo.overall_level ?? ''})` : ' — No data available'}</h3>
          <div className="panel-grid">
            <div>Level: {selectedInfo?.overall_level || '—'}</div>
            <div>Confidence: {selectedInfo?.confidence ?? '—'}%</div>
            <div>Factors: {selectedInfo?.breakdown ? Object.keys(selectedInfo.breakdown).length : 0}</div>
            <div>Source: Direct API</div>
          </div>
          <div className="panel-actions">
            <button className="btn primary" onClick={()=> nav('/forest')}>View Details</button>
            <button className="btn" onClick={()=> askAI(selected)}>Run AI Analysis</button>
            <button className="btn" onClick={()=> nav('/what-if')}>What-If Lab</button>
            <button className="btn" onClick={()=> nav('/missions', { state:{ area: selected } })}>Create Mission</button>
          </div>
        </div>
      )}

      <div className="two-col">
        <AIInsightCard />
        <div className="alerts">
          <div className="card-title">ACTIVE WARNINGS</div>
          {shownAlerts.length === 0 && <div style={{fontSize:12, color:'#64748B'}}>{offline ? 'Offline.' : 'No active warnings.'}</div>}
          {shownAlerts.map((a:any)=> <AlertCard key={a.id} {...a} />)}
        </div>
      </div>

      <div className="two-col">
        <div className="chart-card">
          <div className="card-title">RISK TREND</div>
          <div style={{height:160}}>
            {trend === null && <div style={{fontSize:13, color:'#64748B'}}>Loading…</div>}
            {trend !== null && trend.length === 0 && <div style={{fontSize:13, color:'#64748B'}}>No historical telemetry available — run analysis to record metrics.</div>}
            {trend !== null && trend.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <Line type="monotone" dataKey="v" stroke="#0F766E" strokeWidth={2} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="chart-card">
          <div className="card-title">PENDING ACTION QUEUE</div>
          <ul className="action-list">
            {pending.length === 0 && <li>No pending actions in queue 🎉</li>}
            {pending.map((p, i)=> <li key={i}>{p}</li>)}
          </ul>
        </div>
      </div>

      <style>{`
        .dash{ display:flex; flex-direction:column; gap:18px; }
        .card{ background:#0f1f18; border:1px solid #1f382c; border-radius:12px; padding:12px; color:#e6ede9; }
        .welcome{ background:#0f1f18; border:1px solid #1f382c; border-radius:16px; padding:18px; display:flex; justify-content:space-between; align-items:center; }
        .demo-badge{ background:#1c3328; border:1px solid #28543f; color:#4ade80; padding:4px 10px; border-radius:8px; font-size:11px; font-weight:700; font-family:'JetBrains Mono', monospace; }
        .kpi-grid{ display:grid; grid-template-columns: repeat(4, 1fr); gap:14px; }
        .panel{ background:#0f1f18; border:1px solid #1f382c; border-radius:16px; padding:16px; color:#e6ede9; }
        .panel-grid{ display:grid; grid-template-columns: repeat(4,1fr); gap:12px; margin:12px 0; font-size:13px; }
        .panel-actions{ display:flex; gap:8px; flex-wrap:wrap; }
        .btn{ padding:8px 12px; border-radius:8px; border:1px solid #1f382c; background:#12241c; color:#e6ede9; font-size:13px; }
        .btn.primary{ background:#22c55e; color:#070f0b; border-color:#22c55e; font-weight:700; }
        .two-col{ display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
        .chart-card, .alerts{ background:#0f1f18; border:1px solid #1f382c; border-radius:16px; padding:16px; color:#e6ede9; }
        .card-title{ font-size:12px; letter-spacing:0.6px; font-weight:700; color:#4ade80; margin-bottom:10px; text-transform:uppercase; font-family:'JetBrains Mono', monospace; }
        .action-list{ margin:0; padding-left:18px; font-size:13px; display:flex; flex-direction:column; gap:8px; color:#cbd5d1; }
        @media (max-width: 1100px){ .kpi-grid{ grid-template-columns: repeat(2,1fr); } .two-col{ grid-template-columns:1fr; } }
        @media (max-width: 600px){ .kpi-grid{ grid-template-columns:1fr; } .panel-grid{ grid-template-columns: repeat(2,1fr); } }
      `}</style>
    </div>
  )
}
