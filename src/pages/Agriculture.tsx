import MapView from '../components/MapView'
import { useEffect, useState } from 'react'
import { API_BASE } from '../services/api'
import { useGeographyStore } from '../store/useGeographyStore'
import { Sprout, Droplets, Thermometer, AlertCircle, ArrowRight } from 'lucide-react'

const API = API_BASE

export default function Agriculture() {
  const { activeRegion, activeRegionId, selectedCountyId } = useGeographyStore()
  const activeCounty = activeRegion.counties.find(c => c.id === selectedCountyId) || activeRegion.counties[0]

  const [agri, setAgri] = useState<any>(null)

  useEffect(() => {
    fetch(`${API}/api/predictive/agri?administrative_unit_id=${encodeURIComponent(activeCounty?.name || 'Central Valley')}&crop=orchard`)
      .then(r => r.json())
      .then(j => setAgri(j))
      .catch(() => {})
  }, [activeRegionId, activeCounty])

  const cropTitle = 'California Agricultural & Groundwater Hydrology'
  const cropSubtext = 'Central Valley Orchards, Sonoma Vineyards & Evapotranspiration Deficit'

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#172b22]">
        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#4ade80] font-semibold flex items-center gap-1.5">
            <Sprout size={14} />
            <span>TERRAVOX // AGRO-HYDROLOGICAL INTELLIGENCE</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#f0fdf4] mt-0.5">
            {cropTitle}
          </h1>
        </div>
        <span className="text-xs font-mono text-[#8b9f94]">{cropSubtext}</span>
      </div>

      {/* Health Distribution */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="tv-card">
          <div className="text-xs text-[#8b9f94]">Optimum Soil Moisture &amp; Canopy</div>
          <div className="text-2xl font-bold font-mono text-[#22c55e] mt-1">68%</div>
          <div className="text-[11px] text-[#5b6f64] mt-1">Evapotranspiration balance within baseline</div>
        </div>

        <div className="tv-card">
          <div className="text-xs text-[#8b9f94]">Moisture Deficit Surveillance</div>
          <div className="text-2xl font-bold font-mono text-[#eab308] mt-1">24%</div>
          <div className="text-[11px] text-[#5b6f64] mt-1">3-week cumulative precipitation deficit</div>
        </div>

        <div className="tv-card">
          <div className="text-xs text-[#8b9f94]">Severe Hydrological Drought Stress</div>
          <div className="text-2xl font-bold font-mono text-[#ef4444] mt-1">8%</div>
          <div className="text-[11px] text-[#5b6f64] mt-1">Groundwater overdraft &amp; irrigation priority</div>
        </div>
      </div>

      {/* Map stage */}
      <div className="h-[480px] rounded-xl overflow-hidden border border-[#1f382c] relative">
        <MapView />
      </div>

      {/* Model summary card */}
      <div className="tv-card p-4 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[#4ade80] font-semibold">ECO-AGRI SIMULATION CORE</span>
          <span className="text-[#718579] font-mono text-[10px]">Copernicus Sentinel-2 &amp; Open-Meteo Soil Moists</span>
        </div>
        <p className="text-[#cbd5d1] leading-relaxed">
          Groundwater and soil moisture dynamics synthesized via multi-spectral Sentinel-2 NDMI and meteorological water balance models across monitored irrigation districts.
        </p>
      </div>
    </div>
  )
}
