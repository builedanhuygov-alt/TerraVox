import { useEffect, useState } from 'react'
import { API_BASE } from '../services/api'

export type EcoMode = 'live' | 'demo'
export const MODE_KEY = 'ecogl_mode'

export function getMode(): EcoMode {
  try { return (localStorage.getItem(MODE_KEY) as EcoMode) || 'live' } catch { return 'live' }
}

export default function ModeSwitch() {
  const [mode, setMode] = useState<EcoMode>(() => getMode())

  useEffect(() => {
    const h = (e: any) => setMode(e.detail?.mode || getMode())
    window.addEventListener('ecochain-mode', h)
    return () => window.removeEventListener('ecochain-mode', h)
  }, [])

  const pick = (m: EcoMode) => {
    try { localStorage.setItem(MODE_KEY, m) } catch {}
    setMode(m)
    window.dispatchEvent(new CustomEvent('ecochain-mode', { detail: { mode: m } }))
    fetch(`${API_BASE}/api/demo/${m === 'demo' ? 'run' : 'reset'}`, { method: 'POST' }).catch(() => {})
  }

  return (
    <div 
      title={mode === 'demo' ? 'DEMO Mode: Simulates incident response and synthetic scenarios' : 'LIVE Mode: Streams verified FIRMS / NOAA / Copernicus telemetry'} 
      className="flex items-center bg-[#091410] border border-[#172b22] rounded-lg p-0.5 gap-1 text-[11px]"
    >
      <button
        onClick={() => pick('live')}
        className={`px-2.5 py-1 rounded-md font-mono font-bold transition-colors ${
          mode === 'live' ? 'bg-[#22c55e] text-[#070f0b]' : 'text-[#718579] hover:text-[#f0fdf4]'
        }`}
      >
        ● LIVE
      </button>
      <button
        onClick={() => pick('demo')}
        className={`px-2.5 py-1 rounded-md font-mono font-bold transition-colors ${
          mode === 'demo' ? 'bg-[#f59e0b] text-[#070f0b]' : 'text-[#718579] hover:text-[#f0fdf4]'
        }`}
      >
        ◆ DEMO
      </button>
    </div>
  )
}
