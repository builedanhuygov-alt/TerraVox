import { useState } from 'react'

// 5-Step Guided Demo Tutorial — TERRAVOX Operational Platform
const STEPS = [
  {
    title: '1/5 · Simulation & Validation Mode (DEMO)',
    body: 'This mode simulates operational test scenarios: incident alerts and hotspot feeds are configured to test emergency response workflows. Switch to LIVE on the navigation header to stream verified sensor telemetry.',
    action: null as string | null
  },
  {
    title: '2/5 · High-Priority Incident Warnings',
    body: 'High-risk proximity detections (≤5 km) trigger priority operational banners across the header alongside initial attack dispatch plans. Click any incident card to fly directly to coordinates.',
    action: 'burning'
  },
  {
    title: '3/5 · Thermal Anomaly & Fuel Moisture Surveillance',
    body: 'Surrounding surveillance sectors (≤20 km) are classified by NFDRS Danger Ratings (Low to Extreme). Inspect microclimate, downslope wind gusts, and live fuel moisture on the telemetry panel.',
    action: null
  },
  {
    title: '4/5 · Multi-Spectral Satellite Overlays',
    body: 'Layer controls let you toggle: Satellite Basemap, NASA FIRMS VIIRS 375m hotspots, Copernicus Sentinel-2 NDVI canopy vigor, and Sentinel-1 SAR backscatter.',
    action: 'layers'
  },
  {
    title: '5/5 · Tactical AI & Geospatial Tracking',
    body: 'Activate TERRAVOX Intelligence Assistant to query environmental telemetry, run Rothermel fire spread simulations, or focus on any California county.',
    action: 'hotspot'
  },
]

export default function DemoTour({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)

  const go = (d: number) => {
    const n = i + d
    if (n >= STEPS.length) {
      try { sessionStorage.setItem('ecogl_tour_done', '1') } catch {}
      onDone()
      return
    }
    setI(n)
    const act = STEPS[n].action
    if (act) {
      window.dispatchEvent(new CustomEvent('ecochain-tour', { detail: { action: act } }))
    }
  }

  const s = STEPS[i]

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-96 max-w-[94vw] bg-stone-950/95 backdrop-blur-md border border-stone-800 rounded-xl p-4 shadow-2xl text-stone-200">
      <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-2">
        <span className="text-xs font-semibold text-stone-100 font-mono tracking-tight">
          {s.title}
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-700/60 text-amber-300 font-semibold">
          DEMO MODE
        </span>
      </div>

      <div className="text-xs text-stone-300 mt-2.5 leading-relaxed">
        {s.body}
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-stone-800/80 font-mono">
        <button
          onClick={() => {
            try { sessionStorage.setItem('ecogl_tour_done', '1') } catch {}
            onDone()
          }}
          className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 rounded border border-stone-800 hover:bg-stone-900 transition"
        >
          Skip
        </button>
        {i > 0 && (
          <button
            onClick={() => go(-1)}
            className="px-3 py-1.5 text-xs text-stone-300 hover:text-stone-100 rounded border border-stone-700 hover:bg-stone-900 transition"
          >
            ← Back
          </button>
        )}
        <button
          onClick={() => go(1)}
          className="ml-auto px-4 py-1.5 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-stone-950 transition"
        >
          {i === STEPS.length - 1 ? 'Finish ✓' : 'Next →'}
        </button>
      </div>
    </div>
  )
}
