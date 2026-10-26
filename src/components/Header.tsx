import { Bell, Sparkles, Menu, Search, CheckCircle2, AlertTriangle, Maximize2, CloudSun, Cloud, Layers, History, PlusCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../services/api'
import { useGeographyStore } from '../store/useGeographyStore'
import { getMode, EcoMode, MODE_KEY } from './ModeSwitch'

export default function Header({ onMenu }: { onMenu: () => void }) {
  const [activeCount, setActiveCount] = useState(3)
  const [backendUp, setBackendUp] = useState<boolean | null>(true)
  const [mode, setModeState] = useState<EcoMode>(getMode())
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<any[]>([])
  const [openSearch, setOpenSearch] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const nav = useNavigate()

  const { activeRegion, activeRegionId, selectedCountyId, selectCounty, selectSector, selectIncident, telemetry } = useGeographyStore()

  // Location search query debouncer supporting California sectors + backend global search
  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([])
      return
    }
    const query = q.trim().toLowerCase()

    const localMatches: any[] = []
    activeRegion.counties.forEach(county => {
      if (county.name.toLowerCase().includes(query)) {
        localMatches.push({
          name: county.name,
          type: 'County',
          countyId: county.id,
          coords: county.coordinates,
          source: 'Pilot County'
        })
      }
      county.sectors.forEach(sector => {
        if (sector.name.toLowerCase().includes(query)) {
          localMatches.push({
            name: sector.name,
            type: 'Sector',
            countyId: county.id,
            sectorId: sector.id,
            coords: sector.coordinates,
            source: county.name
          })
        }
      })
    })

    // Also search incidents
    activeRegion.incidents.forEach(inc => {
      if (inc.title.toLowerCase().includes(query) || inc.sectorName.toLowerCase().includes(query)) {
        localMatches.push({
          name: inc.title,
          type: 'Incident',
          incidentId: inc.id,
          coords: inc.coordinates,
          source: inc.sectorName
        })
      }
    })

    const id = setTimeout(async () => {
      try {
        const r = await fetch(`${API_BASE}/api/search/global?q=${encodeURIComponent(query)}`)
        const j = await r.json()
        const remoteResults = Array.isArray(j.results) ? j.results : []
        setHits([...localMatches, ...remoteResults].slice(0, 8))
        setOpenSearch(true)
      } catch {
        setHits(localMatches.slice(0, 8))
        if (localMatches.length > 0) setOpenSearch(true)
      }
    }, 180)
    return () => clearTimeout(id)
  }, [q, activeRegion])

  const selectHit = (h: any) => {
    setOpenSearch(false)
    setQ(h.name || '')
    if (h.incidentId) {
      selectIncident(h.incidentId)
    } else if (h.countyId) {
      selectCounty(h.countyId)
      if (h.sectorId) selectSector(h.sectorId)
    }
    window.dispatchEvent(new CustomEvent('ecochain-search', { detail: h }))
  }

  // Periodic backend health ping
  useEffect(() => {
    const ping = () => {
      fetch(`${API_BASE}/api/health`, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(d => setBackendUp(!!(d && (d.ok || d.status === 'ok'))))
        .catch(() => setBackendUp(false))
    }
    ping()
    const id = setInterval(ping, 45000)
    return () => clearInterval(id)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  const toggleMode = () => {
    const next: EcoMode = mode === 'demo' ? 'live' : 'demo'
    try { localStorage.setItem(MODE_KEY, next) } catch {}
    setModeState(next)
    window.dispatchEvent(new CustomEvent('ecochain-mode', { detail: { mode: next } }))
    fetch(`${API_BASE}/api/demo/${next === 'demo' ? 'run' : 'reset'}`, { method: 'POST' }).catch(() => {})
  }

  // Display weather: use real telemetry if available, else standard California baseline
  const tempC = telemetry?.temperatureC ?? 16
  const weatherDesc = 'Clear'

  return (
    <header className="h-14 bg-[#090e0c] border-b border-[#14261c] px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Mobile Menu Toggle & Brand on Mobile */}
      <div className="flex items-center gap-2.5 lg:hidden">
        <button
          onClick={onMenu}
          className="p-1.5 rounded-lg text-[#8b9f94] hover:text-[#f0fdf4] hover:bg-[#12241c]"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <span className="font-extrabold text-sm tracking-tight text-[#f0fdf4]">TERRAVOX</span>
      </div>

      {/* Global Location, County, or Incident Search */}
      <div className="flex-1 max-w-md relative">
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[#0e1713] border border-[#1b2b22] rounded-lg focus-within:border-[#22c55e] transition-colors">
          <Search size={14} className="text-[#5b6f64] shrink-0" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search location, county, or incident..."
            className="bg-transparent border-0 outline-none text-xs text-[#e6ede9] placeholder-[#5b6f64] w-full"
            onKeyDown={e => {
              if (e.key === 'Enter' && hits.length) selectHit(hits[0])
            }}
            onFocus={() => hits.length > 0 && setOpenSearch(true)}
            onBlur={() => setTimeout(() => setOpenSearch(false), 200)}
          />
          {q && (
            <button onClick={() => setQ('')} className="text-[10px] text-[#5b6f64] hover:text-[#e6ede9]">
              ✕
            </button>
          )}
        </div>

        {openSearch && hits.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0f1f18] border border-[#1f382c] rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-[#172b22]">
            {hits.map((h, i) => (
              <button
                key={i}
                onMouseDown={() => selectHit(h)}
                className="w-full text-left px-3.5 py-2 hover:bg-[#152c22] transition-colors flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span>{h.type === 'Incident' ? '🔥' : h.type === 'County' ? '🌲' : '📍'}</span>
                  <span className="font-medium text-[#e6ede9] truncate">{h.name}</span>
                  <span className="text-[11px] text-[#718579] truncate">({h.source || h.type})</span>
                </div>
                <span className="text-[10px] font-mono text-[#4ade80] uppercase ml-2 shrink-0">
                  {h.type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Controls: Mode Badge, Layers, Timeline, Report, Weather, Fullscreen */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Layer Controls Toggle Button */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('terravox-toggle-layers'))}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0e1713] hover:bg-[#14261e] border border-[#1b2b22] hover:border-[#22c55e]/40 text-xs font-mono font-medium text-[#cbd5d1] transition-all shadow-xs"
          title="Toggle GIS Layers & Cartography"
          aria-label="Toggle GIS Layers"
        >
          <Layers size={14} className="text-[#4ade80]" />
          <span className="hidden md:inline">Layers</span>
        </button>

        {/* Timeline Exploration Toggle Button */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('terravox-toggle-timeline'))}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0e1713] hover:bg-[#14261e] border border-[#1b2b22] hover:border-[#a3e635]/40 text-xs font-mono font-medium text-[#cbd5d1] transition-all shadow-xs"
          title="Toggle Environmental Time Machine"
          aria-label="Toggle Timeline"
        >
          <History size={14} className="text-[#a3e635]" />
          <span className="hidden md:inline">Timeline</span>
        </button>

        {/* Report Environmental Observation Button */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('terravox-open-report'))}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#12281c] hover:bg-[#1a3828] border border-[#22573a] text-xs font-semibold text-[#4ade80] transition-all shadow-xs"
          title="Submit Community Environmental Report"
          aria-label="Submit Community Report"
        >
          <PlusCircle size={14} />
          <span className="hidden sm:inline">Report Hazard</span>
        </button>

        {/* LIVE / DEMO Indicator Button */}
        <button
          onClick={toggleMode}
          title={mode === 'demo' ? 'Currently using demonstration datasets. Click to switch to LIVE.' : 'Connected to real-time NASA FIRMS & Open-Meteo telemetry. Click to toggle DEMO.'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono transition-colors border ${
            mode === 'demo'
              ? 'bg-[#eab308]/15 text-[#eab308] border-[#eab308]/30 hover:bg-[#eab308]/25'
              : 'bg-[#0d281a] text-[#4ade80] border-[#1d4d33] hover:bg-[#123624]'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${mode === 'demo' ? 'bg-[#eab308]' : 'bg-[#22c55e] animate-pulse'}`} />
          <span>{mode === 'demo' ? 'DEMO' : 'LIVE'}</span>
        </button>

        {/* Real Weather Chip */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0e1713] border border-[#1b2b22] text-xs font-mono text-[#cbd5d1]">
          <Cloud size={14} className="text-[#38bdf8]" />
          <span>{telemetry?.temperatureC !== undefined ? `${telemetry.temperatureC}°C` : `${tempC}°C`}</span>
        </div>

        {/* Notifications Bell */}
        <button
          onClick={() => nav('/notifications')}
          className="relative p-2 rounded-lg bg-[#0e1713] hover:bg-[#14231b] border border-[#1b2b22] text-[#8b9f94] hover:text-[#f0fdf4] transition-colors"
          aria-label="Active emergency alerts"
          title="Active emergency alerts"
        >
          <Bell size={16} />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#ef4444] text-[#ffffff] font-mono font-bold text-[9px] flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg bg-[#0e1713] hover:bg-[#14231b] border border-[#1b2b22] text-[#8b9f94] hover:text-[#f0fdf4] transition-colors hidden sm:flex"
          aria-label="Toggle Fullscreen"
          title="Toggle Fullscreen"
        >
          <Maximize2 size={15} />
        </button>
      </div>
    </header>
  )
}
