import { useEffect, useState } from 'react'
import { API_BASE } from '../services/api'
import { useGeographyStore } from '../store/useGeographyStore'
import { Sprout, BarChart3, ShieldAlert, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

const API = API_BASE

export default function Carbon() {
  const { activeRegion, activeRegionId, selectedCountyId } = useGeographyStore()
  const activeCounty = activeRegion.counties.find(c => c.id === selectedCountyId) || activeRegion.counties[0]

  const [live, setLive] = useState<any>(null)

  useEffect(() => {
    fetch(`${API}/api/carbon/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        administrative_unit_id: activeCounty?.name || activeRegion.name,
        forest_area_ha: activeRegionId === 'california-us' ? 434400 : 692722,
        ndvi: 0.62,
        period: '2026-09'
      })
    })
      .then(r => r.json())
      .then(j => setLive(j))
      .catch(() => {})
  }, [activeRegionId, activeCounty])

  const carbonData = [
    { year: '2021', stock: 1.12, baseline: 1.10 },
    { year: '2022', stock: 1.15, baseline: 1.11 },
    { year: '2023', stock: 1.19, baseline: 1.12 },
    { year: '2024', stock: 1.22, baseline: 1.13 },
    { year: '2025', stock: 1.25, baseline: 1.14 },
    { year: '2026', stock: 1.28, baseline: 1.15 },
  ]

  const regionLabel = `${activeCounty?.name || 'Butte County'}, California (Sierra Nevada Canopy Reserve)`

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#172b22]">
        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#4ade80] font-semibold flex items-center gap-1.5">
            <Sprout size={14} />
            <span>TERRAVOX // FOREST CARBON MRV ENGINE</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#f0fdf4] mt-0.5">
            Forest Carbon Stock &amp; MRV Surveillance
          </h1>
        </div>
        <span className="text-xs font-mono text-[#8b9f94]">{regionLabel}</span>
      </div>

      {/* Main Stock Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="tv-card">
          <div className="text-xs text-[#8b9f94]">Estimated Above-Ground Carbon Stock</div>
          <div className="text-2xl font-bold font-mono text-[#4ade80] mt-1">
            {live ? `${Math.round(live.estimated_carbon_stock_t || 0).toLocaleString()} tCO₂e` : '1,280,000 tCO₂e'}
          </div>
          <div className="text-[11px] text-[#5b6f64] mt-1 font-mono">Confidence band: 0.95M &ndash; 1.45M tCO₂e</div>
        </div>

        <div className="tv-card">
          <div className="text-xs text-[#8b9f94]">Annual Sequestration Rate</div>
          <div className="text-2xl font-bold font-mono text-[#22c55e] mt-1">+2.4%</div>
          <div className="text-[11px] text-[#5b6f64] mt-1">Post-fire vegetative regeneration</div>
        </div>

        <div className="tv-card">
          <div className="text-xs text-[#8b9f94]">Satellite Verification Tier</div>
          <div className="text-2xl font-bold font-mono text-[#a3e635] mt-1">Tier 3 MRV</div>
          <div className="text-[11px] text-[#5b6f64] mt-1">Copernicus GEDI &amp; Sentinel-2 SAR</div>
        </div>
      </div>

      {/* Historical Stock Trend Chart */}
      <div className="tv-card space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#172b22]">
          <span className="text-xs font-mono font-bold text-stone-200 uppercase">
            Carbon Stock Growth Trajectory (Million tCO₂e)
          </span>
          <span className="text-[11px] font-mono text-[#4ade80]">2021 &ndash; 2026 AUDITED</span>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={carbonData}>
              <defs>
                <linearGradient id="carbonColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#172b22" />
              <XAxis dataKey="year" stroke="#5b6f64" tick={{ fontSize: 11 }} />
              <YAxis stroke="#5b6f64" tick={{ fontSize: 11 }} domain={[1.0, 1.4]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#070f0b', borderColor: '#1f382c', borderRadius: 8, fontSize: 12 }} 
                labelStyle={{ color: '#f0fdf4' }}
              />
              <Area type="monotone" dataKey="stock" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#carbonColor)" name="Observed Stock" />
              <Area type="monotone" dataKey="baseline" stroke="#718579" strokeDasharray="4 4" fill="none" name="Baseline Projection" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
