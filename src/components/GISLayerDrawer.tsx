import React from 'react'
import { 
  X, 
  Layers, 
  Flame, 
  ShieldAlert, 
  Trees, 
  Wind, 
  MapPin, 
  History, 
  Building2, 
  Users, 
  Check, 
  Info, 
  Globe2 
} from 'lucide-react'

export interface LayerState {
  administrativeBoundaries: boolean
  incorporatedPlaces: boolean
  activeFires: boolean
  officialIncidents: boolean
  historicalScars: boolean
  vegetationStress: boolean
  weatherStations: boolean
  communityReports: boolean
}

interface GISLayerDrawerProps {
  isOpen: boolean
  onClose: () => void
  basemap: 'satellite' | 'terrain' | 'eox'
  onBasemapChange: (bm: 'satellite' | 'terrain' | 'eox') => void
  layers: LayerState
  onToggleLayer: (layerKey: keyof LayerState) => void
  counts?: {
    calfire?: number
    firms?: number
    counties?: number
    reports?: number
  }
}

export default function GISLayerDrawer({
  isOpen,
  onClose,
  basemap,
  onBasemapChange,
  layers,
  onToggleLayer,
  counts
}: GISLayerDrawerProps) {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-y-0 right-0 z-40 w-full max-w-sm bg-[#08120e]/98 backdrop-blur-md border-l border-[#1b3326] shadow-2xl flex flex-col animate-slideLeft pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="GIS Layer Controls"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#14261c] flex items-center justify-between bg-[#060c09]">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-[#4ade80]" />
          <div>
            <h3 className="font-bold text-sm text-[#f0fdf4]">GIS Layer Controls</h3>
            <p className="text-[10px] text-[#718579] font-mono">California Environmental Spatial Feeds</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#718579] hover:text-[#f0fdf4] hover:bg-[#12241b] transition-colors"
          aria-label="Close layer drawer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Layer Groups Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-[#cbd5d1]">
        {/* GROUP 1: BASEMAP */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-[#14261c]">
            <span className="font-mono text-[10px] font-bold text-[#8b9f94] uppercase tracking-wider flex items-center gap-1.5">
              <Globe2 size={12} className="text-[#38bdf8]" />
              <span>1. Basemap Cartography</span>
            </span>
            <span className="text-[9px] font-mono text-[#5b6f64]">WMTS / REST</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
            <button
              onClick={() => onBasemapChange('satellite')}
              className={`p-2 rounded-lg border text-center transition-all ${
                basemap === 'satellite'
                  ? 'bg-[#153423] text-[#4ade80] border-[#22c55e] font-bold shadow-xs'
                  : 'bg-[#0a1510] text-[#718579] border-[#16271e] hover:text-[#f0fdf4]'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => onBasemapChange('terrain')}
              className={`p-2 rounded-lg border text-center transition-all ${
                basemap === 'terrain'
                  ? 'bg-[#153423] text-[#4ade80] border-[#22c55e] font-bold shadow-xs'
                  : 'bg-[#0a1510] text-[#718579] border-[#16271e] hover:text-[#f0fdf4]'
              }`}
            >
              Terrain
            </button>
            <button
              onClick={() => onBasemapChange('eox')}
              className={`p-2 rounded-lg border text-center transition-all ${
                basemap === 'eox'
                  ? 'bg-[#153423] text-[#4ade80] border-[#22c55e] font-bold shadow-xs'
                  : 'bg-[#0a1510] text-[#718579] border-[#16271e] hover:text-[#f0fdf4]'
              }`}
            >
              Sentinel-2
            </button>
          </div>
          <p className="text-[10px] text-[#5b6f64] leading-relaxed">
            Source: Esri World Imagery, USGS National Topo, &amp; EOX Cloudless WMTS.
          </p>
        </div>

        {/* GROUP 2: FIRE INFORMATION */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-[#14261c]">
            <span className="font-mono text-[10px] font-bold text-[#8b9f94] uppercase tracking-wider flex items-center gap-1.5">
              <Flame size={12} className="text-[#f97316]" />
              <span>2. Active Fire &amp; Detections</span>
            </span>
            <span className="text-[9px] font-mono text-[#4ade80]">OBSERVATIONS</span>
          </div>

          <div className="space-y-1.5">
            {/* CAL FIRE Incidents */}
            <label className="flex items-start justify-between p-2 rounded-lg bg-[#0a1510] border border-[#16271e] cursor-pointer hover:bg-[#0d1a14] transition-colors">
              <div className="space-y-0.5 pr-2">
                <div className="flex items-center gap-1.5 font-semibold text-[#f0fdf4]">
                  <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                  <span>CAL FIRE Official Incidents</span>
                  {counts?.calfire !== undefined && (
                    <span className="text-[10px] font-mono text-[#ef4444]">({counts.calfire})</span>
                  )}
                </div>
                <p className="text-[10px] text-[#718579]">
                  Official emergency perimeters, containment stats, and dispatch records.
                </p>
              </div>
              <input
                type="checkbox"
                checked={layers.officialIncidents}
                onChange={() => onToggleLayer('officialIncidents')}
                className="mt-1 accent-[#22c55e]"
              />
            </label>

            {/* NASA FIRMS Hotspots */}
            <label className="flex items-start justify-between p-2 rounded-lg bg-[#0a1510] border border-[#16271e] cursor-pointer hover:bg-[#0d1a14] transition-colors">
              <div className="space-y-0.5 pr-2">
                <div className="flex items-center gap-1.5 font-semibold text-[#f0fdf4]">
                  <span className="w-2 h-2 rounded-full bg-[#f97316]" />
                  <span>NASA FIRMS Thermal Detections</span>
                  {counts?.firms !== undefined && (
                    <span className="text-[10px] font-mono text-[#4ade80]">({counts.firms})</span>
                  )}
                </div>
                <p className="text-[10px] text-[#718579]">
                  Near-real-time satellite thermal radiation anomalies (VIIRS 375m &amp; MODIS).
                </p>
              </div>
              <input
                type="checkbox"
                checked={layers.activeFires}
                onChange={() => onToggleLayer('activeFires')}
                className="mt-1 accent-[#22c55e]"
              />
            </label>

            {/* Historical Burn Scars */}
            <label className="flex items-start justify-between p-2 rounded-lg bg-[#0a1510] border border-[#16271e] cursor-pointer hover:bg-[#0d1a14] transition-colors">
              <div className="space-y-0.5 pr-2">
                <div className="flex items-center gap-1.5 font-semibold text-[#f0fdf4]">
                  <History size={12} className="text-[#a3e635]" />
                  <span>Historical Fire Scars (FRAP)</span>
                </div>
                <p className="text-[10px] text-[#718579]">
                  Documented fire scars from 2018–2024 used to benchmark fuel regrowth.
                </p>
              </div>
              <input
                type="checkbox"
                checked={layers.historicalScars}
                onChange={() => onToggleLayer('historicalScars')}
                className="mt-1 accent-[#22c55e]"
              />
            </label>

            {/* Community Field Reports */}
            <label className="flex items-start justify-between p-2 rounded-lg bg-[#0a1510] border border-[#16271e] cursor-pointer hover:bg-[#0d1a14] transition-colors">
              <div className="space-y-0.5 pr-2">
                <div className="flex items-center gap-1.5 font-semibold text-[#f0fdf4]">
                  <Users size={12} className="text-[#38bdf8]" />
                  <span>Community Hazard Sightings</span>
                  {counts?.reports !== undefined && (
                    <span className="text-[10px] font-mono text-[#38bdf8]">({counts.reports})</span>
                  )}
                </div>
                <p className="text-[10px] text-[#718579]">
                  Public unverified observations (smoke, tree fall, flood hazards).
                </p>
              </div>
              <input
                type="checkbox"
                checked={layers.communityReports}
                onChange={() => onToggleLayer('communityReports')}
                className="mt-1 accent-[#22c55e]"
              />
            </label>
          </div>
        </div>

        {/* GROUP 3: ENVIRONMENTAL CONTEXT */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-[#14261c]">
            <span className="font-mono text-[10px] font-bold text-[#8b9f94] uppercase tracking-wider flex items-center gap-1.5">
              <Trees size={12} className="text-[#22c55e]" />
              <span>3. Environmental Context</span>
            </span>
            <span className="text-[9px] font-mono text-[#eab308]">DERIVED</span>
          </div>

          <div className="space-y-1.5">
            {/* Weather Telemetry */}
            <label className="flex items-start justify-between p-2 rounded-lg bg-[#0a1510] border border-[#16271e] cursor-pointer hover:bg-[#0d1a14] transition-colors">
              <div className="space-y-0.5 pr-2">
                <div className="flex items-center gap-1.5 font-semibold text-[#f0fdf4]">
                  <Wind size={12} className="text-[#38bdf8]" />
                  <span>Weather Telemetry (Open-Meteo)</span>
                </div>
                <p className="text-[10px] text-[#718579]">
                  Surface wind speed/direction, temperature, and relative humidity.
                </p>
              </div>
              <input
                type="checkbox"
                checked={layers.weatherStations}
                onChange={() => onToggleLayer('weatherStations')}
                className="mt-1 accent-[#22c55e]"
              />
            </label>

            {/* Vegetation Drought Stress / NDVI */}
            <label className="flex items-start justify-between p-2 rounded-lg bg-[#0a1510] border border-[#16271e] cursor-pointer hover:bg-[#0d1a14] transition-colors">
              <div className="space-y-0.5 pr-2">
                <div className="flex items-center gap-1.5 font-semibold text-[#f0fdf4]">
                  <Trees size={12} className="text-[#4ade80]" />
                  <span>Vegetation Stress &amp; NDVI</span>
                </div>
                <p className="text-[10px] text-[#718579]">
                  Satellite greenness desiccation index and NFDRS dead fuel moisture.
                </p>
              </div>
              <input
                type="checkbox"
                checked={layers.vegetationStress}
                onChange={() => onToggleLayer('vegetationStress')}
                className="mt-1 accent-[#22c55e]"
              />
            </label>
          </div>
        </div>

        {/* GROUP 4: ADMINISTRATIVE BOUNDARIES */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-[#14261c]">
            <span className="font-mono text-[10px] font-bold text-[#8b9f94] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert size={12} className="text-[#34d399]" />
              <span>4. Boundaries &amp; Municipalities</span>
            </span>
            <span className="text-[9px] font-mono text-[#718579]">REFERENCE</span>
          </div>

          <div className="space-y-1.5">
            {/* County Boundaries */}
            <label className="flex items-start justify-between p-2 rounded-lg bg-[#0a1510] border border-[#16271e] cursor-pointer hover:bg-[#0d1a14] transition-colors">
              <div className="space-y-0.5 pr-2">
                <div className="flex items-center gap-1.5 font-semibold text-[#f0fdf4]">
                  <span>58 California Counties</span>
                  {counts?.counties !== undefined && (
                    <span className="text-[10px] font-mono text-[#718579]">({counts.counties})</span>
                  )}
                </div>
                <p className="text-[10px] text-[#718579]">
                  Official county jurisdictional borders from US Census Bureau TIGER/Line.
                </p>
              </div>
              <input
                type="checkbox"
                checked={layers.administrativeBoundaries}
                onChange={() => onToggleLayer('administrativeBoundaries')}
                className="mt-1 accent-[#22c55e]"
              />
            </label>

            {/* Incorporated Municipalities */}
            <label className="flex items-start justify-between p-2 rounded-lg bg-[#0a1510] border border-[#16271e] cursor-pointer hover:bg-[#0d1a14] transition-colors">
              <div className="space-y-0.5 pr-2">
                <div className="flex items-center gap-1.5 font-semibold text-[#f0fdf4]">
                  <Building2 size={12} className="text-stone-300" />
                  <span>Incorporated Places &amp; Towns</span>
                </div>
                <p className="text-[10px] text-[#718579]">
                  Populated municipalities, WUI interface communities, and elevation points.
                </p>
              </div>
              <input
                type="checkbox"
                checked={layers.incorporatedPlaces}
                onChange={() => onToggleLayer('incorporatedPlaces')}
                className="mt-1 accent-[#22c55e]"
              />
            </label>
          </div>
        </div>

        {/* Data Honesty Disclaimer */}
        <div className="p-3 rounded-xl bg-[#091510] border border-[#162e21] text-[10px] text-[#718579] space-y-1 leading-relaxed">
          <div className="flex items-center gap-1.5 text-[#38bdf8] font-bold">
            <Info size={12} />
            <span>Telemetry Provenance</span>
          </div>
          <p>
            Observation layers are drawn directly from NASA FIRMS and CAL FIRE public GeoJSON APIs. Layers with unavailable remote coverage are left empty rather than filled with synthetic measurements.
          </p>
        </div>
      </div>
    </div>
  )
}
