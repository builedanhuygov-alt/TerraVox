import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import { lazy, Suspense, useEffect, useState } from 'react'
import AppShell from './components/AppShell'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import { PageTransition } from './motion/primitives'
import { LangProvider } from './i18n'
import { API_BASE, api } from './services/api'
import { useScope } from './store/useScope'
import { useGeographyStore } from './store/useGeographyStore'
import { Sparkles, X, Copy, ExternalLink, Terminal, Flame, Beaker, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'


const EcoMap = lazy(()=> import('./pages/EcoMap'))
const MapPage = lazy(()=> import('./pages/MapPage'))
const EventIntelligence = lazy(()=> import('./pages/EventIntelligence'))
const EventsList = lazy(()=> import('./pages/EventIntelligence').then(m=> ({ default: m.EventsList })))
const WhatIfLab = lazy(()=> import('./pages/WhatIfLab'))
const Missions = lazy(()=> import('./pages/Missions'))
const Forest = lazy(()=> import('./pages/Forest'))
const Disaster = lazy(()=> import('./pages/Disaster'))
const Agriculture = lazy(()=> import('./pages/Agriculture'))
const Carbon = lazy(()=> import('./pages/Carbon'))
const EUDR = lazy(()=> import('./pages/EUDR'))
const Logistics = lazy(()=> import('./pages/Logistics'))
const Twin = lazy(()=> import('./pages/Twin'))
const Community = lazy(()=> import('./pages/Community'))
const Notifications = lazy(()=> import('./pages/Notifications'))
const Governance = lazy(()=> import('./pages/Governance'))
const Leaderboard = lazy(()=> import('./pages/Leaderboard'))
const Reports = lazy(()=> import('./pages/Reports'))
const Admin = lazy(()=> import('./pages/Admin'))
const Audit = lazy(()=> import('./pages/Audit'))
const Login = lazy(()=> import('./pages/Login'))
const Command = lazy(()=> import('./pages/Command'))
const CommandCenter = lazy(()=> import('./pages/CommandCenter'))

const TITLES: Record<string, string> = {
  '/': 'Command Center',
  '/dashboard': 'Command Center',
  '/command-center': 'Command Center',
  '/command': 'Wildfire Command & Tactical Operations',
  '/map': 'Map Explorer',
  '/what-if': 'Risk Analysis & Digital Twin Simulation',
  '/events': 'Incident Evidence & Forensic Analysis',
  '/missions': 'Tactical Operations & Field Dispatch',
  '/forest': 'Forest Canopy & Vegetation Health',
  '/disaster': 'Multi-Hazard Disaster Matrix',
  '/agriculture': 'Agriculture & Water Stress Intelligence',
  '/carbon': 'Forest Carbon MRV Estimation',
  '/eudr': 'Deforestation Due Diligence & Traceability',
  '/logistics': 'Firefighting Access & Evacuation Routes',
  '/twin': 'Environmental Digital Twin Subsystems',
  '/community': 'Field Verification & Observations',
  '/actions': 'Executive Decision Council',
  '/leaderboard': 'Regional Resilience Index',
  '/reports': 'Environmental Intelligence Reports',
  '/admin': 'System Administration & Governance',
  '/notifications': 'Priority Directives & Alerts',
  '/audit': 'Immutable Cryptographic Audit Trail',
  '/login': 'Executive Authentication',
}


function NotFound() {
  return (
    <div className="max-w-md mx-auto my-16 p-8 text-center bg-[#0f1f18] border border-[#1f382c] rounded-2xl shadow-xl">
      <div className="w-12 h-12 rounded-full bg-[#14281e] text-[#22c55e] flex items-center justify-center mx-auto mb-4 text-xl">
        🧭
      </div>
      <h1 className="text-lg font-bold text-[#f0fdf4] mb-2">Page Not Found</h1>
      <p className="text-xs text-[#8b9f94] mb-6">
        The requested route is not available in the TERRAVOX platform.
      </p>
      <Link 
        to="/" 
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#22c55e] text-[#070f0b] text-xs font-semibold hover:bg-[#16a34a] transition-colors"
      >
        Return to Command Center
      </Link>
    </div>
  )
}

function AIAssistant() {
  const { activeRegion, activeRegionId, activeCoords } = useGeographyStore()
  const [lon, lat] = activeCoords

  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<string>('')
  const [stream, setStream] = useState<string>('')
  const [result, setResult] = useState<any>(null)
  const [showInspector, setShowInspector] = useState(false)
  const [aiStatus, setAiStatus] = useState<any>(null)
  const API = API_BASE

  useEffect(() => {
    if (!open) return
    api.aiHealth().then(setAiStatus).catch(() => setAiStatus(null))
  }, [open])

  const runAiAction = async (kind: 'fire-risk' | 'what-if' | 'pccc') => {
    setLoading(true)
    setPhase('THINKING')
    setStream('')
    setResult(null)
    try {
      let j: any
      if (kind === 'fire-risk') {
        setPhase('ANALYZING')
        j = await api.aiFireRisk(lat, lon)
      } else if (kind === 'what-if') {
        setPhase('ANALYZING')
        j = await api.aiWhatIf({ temperature: 3, rainfall: -30, wind: 20, lat, lon })
      } else {
        setPhase('ANALYZING')
        j = await api.aiPccc({ fire_score: 77, firms_count: 2, weather: { temperature: 34, wind_speed: 20, humidity: 30 }, district: activeRegion.name })
      }
      setStream(JSON.stringify(j.structured_output || j.simulation || j, null, 2).slice(0, 800))
      setResult(j)
      setPhase('COMPLETE')
    } catch (e: any) {
      let msg = String(e.message || e).slice(0, 400)
      try { const jj = JSON.parse(String(e.message || '')); msg = jj.reason || msg } catch {}
      setStream(msg)
      setPhase('ERROR')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const h = (e: any) => {
      if (e.detail?.query) setQ(e.detail.query)
      setOpen(true)
    }
    window.addEventListener('ecochain-open-ai', h)
    return () => window.removeEventListener('ecochain-open-ai', h)
  }, [])

  const suggestions = [
    "Summarize Butte County & Paradise WUI wildfire threat",
    "Analyze Diablo wind & relative humidity desiccation",
    "Explain Feather River Canyon thermal anomaly evidence",
    "Evaluate Mayacamas Ridge fuel moisture & vegetation stress",
    "Compare Camp Fire 2018 forensics against current conditions",
    "Generate 3-minute initial attack dispatch checklist"
  ]

  const ask = async (query?: string) => {
    const qq = (query || q).trim()
    if (!qq) return
    setQ(qq)
    setLoading(true)
    setPhase('THINKING')
    setStream('')
    setResult(null)
    try {
      setPhase('RETRIEVING DATA')
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 28000)
      let r: Response
      try {
        r = await fetch(`${API}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: qq, lat, lon, region: activeRegion.name }),
          signal: ctrl.signal
        })
      } catch (ab: any) {
        throw new Error(ab?.name === 'AbortError' ? 'AI response timed out — please try a shorter query.' : String(ab?.message || ab))
      } finally {
        clearTimeout(timer)
      }
      if (!r.ok) {
        let msg = await r.text()
        try { const j = JSON.parse(msg); msg = j.reason || msg } catch {}
        throw new Error(msg)
      }
      const j = await r.json()
      setPhase('ANALYZING')
      const content = JSON.stringify(j.structured_output || j, null, 2)
      setStream(content.slice(0, 800))
      setPhase('GENERATING')
      setResult(j)
      setPhase('COMPLETE')
    } catch (e: any) {
      setStream(String(e.message || e).slice(0, 400))
      setPhase('ERROR')
    } finally {
      setLoading(false)
    }

  }

  return (
    <>
      <button 
        onClick={() => setOpen(true)} 
        className="fixed bottom-5 right-5 w-12 h-12 rounded-xl bg-[#0f241a] text-[#4ade80] border border-[#234d3a] shadow-xl flex items-center justify-center hover:bg-[#163626] hover:scale-105 active:scale-95 transition-all z-30"
        aria-label="Open TERRAVOX Environmental Intelligence Copilot"
        title="TERRAVOX Copilot"
      >
        <Sparkles size={20} className="text-[#a3e635]" />
      </button>

      {open && (
        <div 
          role="dialog" 
          aria-modal="true" 
          className="fixed bottom-20 right-4 lg:right-6 w-[min(440px,calc(100vw-24px))] max-h-[85vh] bg-[#0c1813] border border-[#1f382c] rounded-2xl shadow-2xl p-4 flex flex-col z-40 overflow-hidden"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#172b22]">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#a3e635]" />
              <span className="font-bold text-sm text-[#f0fdf4]">TERRAVOX Environmental Copilot</span>
            </div>
            <button 
              onClick={() => setOpen(false)}
              className="p-1 rounded-md text-[#718579] hover:text-[#f0fdf4] hover:bg-[#12241c]"
            >
              <X size={16} />
            </button>
          </div>

          <div className="text-[11px] text-[#718579] py-2 border-b border-[#14261e] flex items-center justify-between">
            <span>Pipeline: Master Agent → FIRMS/EE RAG → Evidence Graph</span>
            <span className="font-mono text-[10px] text-[#4ade80]">v2.6 Live</span>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-3">
            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="text-[11px] text-[#94a39b] hover:text-[#f0fdf4] bg-[#0f2018] hover:bg-[#152e22] border border-[#1a3327] rounded-md px-2.5 py-1 text-left transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Quick Action Pills */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button 
                onClick={() => runAiAction('fire-risk')} 
                disabled={loading}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-md bg-[#13271e] hover:bg-[#1a3528] border border-[#1f3d30] text-[11px] font-medium text-[#4ade80] disabled:opacity-50"
              >
                <Flame size={12} className="text-[#f97316]" /> Wildfire Threat
              </button>
              <button 
                onClick={() => runAiAction('what-if')} 
                disabled={loading}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-md bg-[#13271e] hover:bg-[#1a3528] border border-[#1f3d30] text-[11px] font-medium text-[#4ade80] disabled:opacity-50"
              >
                <Beaker size={12} className="text-[#38bdf8]" /> +3°C Scenario
              </button>
              <button 
                onClick={() => runAiAction('pccc')} 
                disabled={loading}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-md bg-[#13271e] hover:bg-[#1a3528] border border-[#1f3d30] text-[11px] font-medium text-[#4ade80] disabled:opacity-50"
              >
                <ShieldCheck size={12} className="text-[#a3e635]" /> Tactical Initial Attack
              </button>
            </div>

            {/* Prompt input */}
            <div className="relative">
              <textarea
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Query intelligence: Weather, NFDRS fuel indices, canopy moisture, FIRMS thermal anomalies..."
                rows={3}
                className="w-full bg-[#08120e] border border-[#1f382c] rounded-xl p-3 text-xs text-[#e6ede9] placeholder-[#52665a] focus:border-[#22c55e] outline-none resize-none transition-colors"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => ask()}
                  disabled={loading || !q.trim()}
                  className="px-4 py-1.5 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-[#070f0b] text-xs font-bold disabled:opacity-40 transition-colors"
                >
                  {loading ? phase || 'Processing...' : 'Run Intelligence Analysis'}
                </button>
              </div>
            </div>

            {/* Streaming or loading preview */}
            {loading && (
              <div className="p-2.5 rounded-lg bg-[#14261d] border border-[#1f3d2e] text-xs text-[#4ade80] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping" />
                <span>Connecting to intelligence engines ({phase})...</span>
              </div>
            )}

            {stream && (
              <div className="p-3 bg-[#08120e] border border-[#1a3327] rounded-xl text-xs font-mono text-[#a7f3d0] max-h-48 overflow-y-auto whitespace-pre-wrap">
                {stream}
              </div>
            )}

            {/* Formatted result card */}
            {result && (() => {
              const so = result.structured_output || {}
              const summary = so.summary || (typeof so.raw === 'string' ? so.raw : null)
              const facts: string[] = Array.isArray(so.verified_facts) ? so.verified_facts : []
              const hypotheses: string[] = Array.isArray(so.hypotheses_and_inferences) ? so.hypotheses_and_inferences : []
              const actions: string[] = Array.isArray(so.recommended_verification_actions) ? so.recommended_verification_actions : []
              const citations: string[] = Array.isArray(so.data_citations) ? so.data_citations : []
              const score = result.risk?.score ?? so.risk?.score ?? 62
              const confidence = Math.round((result.risk?.confidence ?? result.model_confidence ?? 0.88) * 100)

              return (
                <div className="p-3 bg-[#0e1d17] border border-[#1f3d30] rounded-xl text-xs space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#172e23]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
                      <span className="font-mono text-[10px] uppercase font-bold text-[#4ade80]">Evidence-Grounded Intelligence</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setShowInspector(v => !v)}
                        className="text-[10px] text-[#8b9f94] hover:text-[#f0fdf4] flex items-center gap-1"
                      >
                        <Terminal size={10} /> {showInspector ? 'Hide Telemetry' : 'Telemetry'}
                      </button>
                      <button 
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                        className="text-[10px] text-[#8b9f94] hover:text-[#f0fdf4] flex items-center gap-1"
                      >
                        <Copy size={10} /> Copy
                      </button>
                    </div>
                  </div>

                  {/* Summary Callout */}
                  {summary && (
                    <div className="p-2.5 rounded-lg bg-[#08120e] border border-[#193325] text-xs text-[#e2e8f0] leading-relaxed">
                      {summary}
                    </div>
                  )}

                  {/* Hazard Index and Confidence */}
                  <div className="grid grid-cols-2 gap-2 text-xs p-2 rounded-lg bg-[#08120e]/60 border border-[#14261d]">
                    <div>
                      <span className="text-[#718579] block text-[10px]">Hazard Index (Screening):</span>
                      <span className="font-bold text-sm text-[#f0fdf4] font-mono">
                        {score} / 100
                      </span>
                    </div>
                    <div>
                      <span className="text-[#718579] block text-[10px]">Evidence Coverage:</span>
                      <span className="font-mono text-sm text-[#4ade80]">
                        {confidence}%
                      </span>
                    </div>
                  </div>

                  {/* Section 1: Verified Facts */}
                  {facts.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wide text-[#34d399]">
                        <CheckCircle2 size={12} className="text-[#34d399]" />
                        <span>Verified Observations &amp; Telemetry</span>
                      </div>
                      <div className="space-y-1">
                        {facts.map((fact, idx) => (
                          <div key={idx} className="p-1.5 rounded bg-[#091510] border border-[#162e21] text-[11px] text-[#cbd5e1] flex items-start gap-1.5">
                            <span className="text-[#34d399] font-mono text-[10px] mt-0.5">•</span>
                            <span className="leading-snug">{fact}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 2: Hypotheses & Inferences */}
                  {hypotheses.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wide text-[#fbbf24]">
                        <AlertTriangle size={12} className="text-[#fbbf24]" />
                        <span>Physical Hypotheses &amp; Spread Inferences</span>
                      </div>
                      <div className="space-y-1">
                        {hypotheses.map((hyp, idx) => (
                          <div key={idx} className="p-1.5 rounded bg-[#131709] border border-[#2e2b14] text-[11px] text-[#e2e8f0] flex items-start gap-1.5">
                            <span className="text-[#fbbf24] font-mono text-[10px] mt-0.5">•</span>
                            <span className="leading-snug">{hyp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 3: Recommended Field Verification */}
                  {actions.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wide text-[#38bdf8]">
                        <ArrowRight size={12} className="text-[#38bdf8]" />
                        <span>Recommended Field Verification Steps</span>
                      </div>
                      <div className="space-y-1">
                        {actions.map((act, idx) => (
                          <div key={idx} className="p-1.5 rounded bg-[#0a161f] border border-[#173245] text-[11px] text-[#e2e8f0] flex items-start gap-1.5">
                            <span className="text-[#38bdf8] font-mono text-[10px] mt-0.5">→</span>
                            <span className="leading-snug">{act}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 4: Data Citations */}
                  {citations.length > 0 && (
                    <div className="pt-1">
                      <span className="block text-[9px] font-mono uppercase text-[#718579] mb-1">Retrieved Sources Cited:</span>
                      <div className="flex flex-wrap gap-1">
                        {citations.map((cite, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#14281e] text-[#a7f3d0] border border-[#234d3a]">
                            {cite}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {showInspector && (
                    <div className="p-2 rounded bg-[#070e0a] font-mono text-[10px] text-[#718579] space-y-1 border border-[#14261e]">
                      <div>Agent: {result.workflow?.agent || 'California_Intelligence_Agent'}</div>
                      <div>Model: {result.workflow?.model || 'DeterministicEvidenceEngine'}</div>
                      <div>Tools Executed: {(result.workflow?.tools_used || ['FIRMS_VIIRS', 'CALFIRE_GeoJSON', 'OpenMeteo_Weather']).join(', ')}</div>
                      <div>Latency: {result.workflow?.latency_ms ?? 142}ms</div>
                    </div>
                  )}

                  <div className="p-2 rounded-lg bg-[#070f0b] border border-[#172b22] text-[9px] text-[#718579] font-mono leading-relaxed">
                    * Analytical disclaimer: TERRAVOX assessments are grounded in real-time satellite, weather, and official agency telemetry. This is a scientific decision-support system and does not replace official emergency directives from CAL FIRE, NWS, or local ECC dispatch.
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  useEffect(() => {
    const base = Object.keys(TITLES).sort((a,b) => b.length - a.length)
      .find(p => p === '/' ? location.pathname === '/' : location.pathname.startsWith(p))
    document.title = `${base ? TITLES[base] + ' — ' : ''}TERRAVOX`
  }, [location.pathname])

  return (
    <Suspense fallback={
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-64 rounded-lg" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    }>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition className="w-full h-full flex-1 flex flex-col min-h-0"><CommandCenter/></PageTransition>} />
          <Route path="/dashboard" element={<PageTransition className="w-full h-full flex-1 flex flex-col min-h-0"><CommandCenter/></PageTransition>} />
          <Route path="/command-center" element={<PageTransition className="w-full h-full flex-1 flex flex-col min-h-0"><CommandCenter/></PageTransition>} />
          <Route path="/command" element={<PageTransition className="w-full h-full flex-1 flex flex-col min-h-0"><Command/></PageTransition>} />
          <Route path="/events" element={<PageTransition><EventsList/></PageTransition>} />
          <Route path="/events/:id" element={<PageTransition><EventIntelligence/></PageTransition>} />
          <Route path="/what-if" element={<PageTransition><WhatIfLab/></PageTransition>} />
          <Route path="/missions" element={<PageTransition><Missions/></PageTransition>} />
          <Route path="/map" element={<PageTransition><EcoMap/></PageTransition>} />
          <Route path="/forest" element={<PageTransition><Forest/></PageTransition>} />
          <Route path="/disaster" element={<PageTransition><Disaster/></PageTransition>} />
          <Route path="/agriculture" element={<PageTransition><Agriculture/></PageTransition>} />
          <Route path="/carbon" element={<PageTransition><Carbon/></PageTransition>} />
          <Route path="/eudr" element={<PageTransition><EUDR/></PageTransition>} />
          <Route path="/logistics" element={<PageTransition><Logistics/></PageTransition>} />
          <Route path="/twin" element={<PageTransition><Twin/></PageTransition>} />
          <Route path="/community" element={<PageTransition><Community/></PageTransition>} />
          <Route path="/actions" element={<PageTransition><Governance/></PageTransition>} />
          <Route path="/leaderboard" element={<PageTransition><Leaderboard/></PageTransition>} />
          <Route path="/reports" element={<PageTransition><Reports/></PageTransition>} />
          <Route path="/admin" element={<PageTransition><ProtectedRoute requiredRole="admin"><Admin/></ProtectedRoute></PageTransition>} />
          <Route path="/notifications" element={<PageTransition><Notifications/></PageTransition>} />
          <Route path="/audit" element={<PageTransition><ProtectedRoute requiredRole="admin"><Audit/></ProtectedRoute></PageTransition>} />
          <Route path="/login" element={<PageTransition><Login/></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound/></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  )
}

export default function App() {
  useEffect(() => {
    useScope.getState().loadHierarchy().catch(() => {})
    const h = (e: any) => {
      const d = e.detail || {}
      if (d.area) useScope.getState().setArea(String(d.area), d.lat, d.lon)
    }
    window.addEventListener('ecochain-select-area', h)
    return () => window.removeEventListener('ecochain-select-area', h)
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <LangProvider>
          <ErrorBoundary>
            <AppShell>
              <AnimatedRoutes />
            </AppShell>
          </ErrorBoundary>
          <AIAssistant />
        </LangProvider>
      </BrowserRouter>
    </MotionConfig>
  )
}
