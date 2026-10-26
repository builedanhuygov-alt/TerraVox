import MapView from '../components/MapView'
import { useEffect, useState } from 'react'
import { API_BASE } from '../services/api'
import { useGeographyStore } from '../store/useGeographyStore'
import { Truck, Route, Navigation, ShieldCheck, ArrowRight, ShieldAlert } from 'lucide-react'

const API = API_BASE

export default function Logistics() {
  const { activeRegion, activeRegionId, selectedCountyId } = useGeographyStore()
  const activeCounty = activeRegion.counties.find(c => c.id === selectedCountyId) || activeRegion.counties[0]

  const [routes, setRoutes] = useState<any[] | null>(null)
  const [mode, setMode] = useState<'Balanced' | 'Fastest' | 'Lowest Risk' | 'Heavy Tender'>('Balanced')

  useEffect(() => {
    fetch(`${API}/api/logistics/routes`).then(r => r.json()).then(j => setRoutes(j)).catch(() => setRoutes([]))
  }, [activeRegionId])

  const californiaRoutes = [
    {
      name: 'Corridor A: Highway 70 to Pulga Pass (Feather River Canyon)',
      status: 'RECOMMENDED / CLEAR',
      distance: '48 miles (77 km)',
      eta: '52 mins',
      burnRisk: 'LOW (PAVED HIGHWAY)',
      vehicleAccess: 'Type 1 Heavy Tanker & Type 3 Strike Team Compatible'
    },
    {
      name: 'Corridor B: Skyway North via Magalia Ridge to Stirling City',
      status: 'CAUTION / CONGESTION RISK',
      distance: '24 miles (38 km)',
      eta: '34 mins',
      burnRisk: 'MODERATE (WUI INTERFACE BRUSH)',
      vehicleAccess: 'Single-Lane Chokepoint at Boles Creek'
    },
    {
      name: 'Corridor C: Highway 101 to Geysers Road (Sonoma Ridge)',
      status: 'STANDBY',
      distance: '36 miles (58 km)',
      eta: '46 mins',
      burnRisk: 'VERY HIGH (DIABLO WIND CROSSING)',
      vehicleAccess: '4WD Only in Upper Geothermal Sector'
    }
  ]

  const displayedRoutes = californiaRoutes

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#172b22]">
        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#4ade80] font-semibold flex items-center gap-1.5">
            <Truck size={14} />
            <span>TERRAVOX // TACTICAL ACCESS &amp; EVACUATION ROUTING</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#f0fdf4] mt-0.5">
            {activeRegion.name} Tactical Routing
          </h1>
          <p className="text-xs text-[#8b9f94] mt-0.5">
            Firefighting vehicle access roads, evacuation chokepoints, and slope accessibility across {activeCounty?.name}.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[#091410] border border-[#172b22] rounded-lg">
          {(['Balanced', 'Fastest', 'Lowest Risk', 'Heavy Tender'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === m
                  ? 'bg-[#22c55e] text-[#070f0b] font-bold'
                  : 'text-[#8b9f94] hover:text-[#f0fdf4]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[480px] rounded-xl overflow-hidden border border-[#1f382c] relative">
        <MapView />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {displayedRoutes.map((r, i) => (
          <div key={i} className="tv-card space-y-2.5">
            <div className="flex justify-between items-start gap-2">
              <span className="font-bold text-stone-100 text-sm">{r.name}</span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
                r.status.includes('CLEAR') || r.status.includes('RECOMMENDED')
                  ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-700/60 text-amber-300'
              }`}>
                {r.status}
              </span>
            </div>

            <div className="text-[#cbd5d1] space-y-1">
              <div>Distance: <span className="font-mono text-stone-100 font-bold">{r.distance}</span> &middot; Travel Time: <span className="font-mono text-stone-100">{r.eta}</span></div>
              <div>Route Fire Threat: <span className="font-mono text-[#f97316] font-semibold">{r.burnRisk}</span></div>
              <div className="text-[11px] text-[#718579] border-t border-[#172b22] pt-1.5">{r.vehicleAccess}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
