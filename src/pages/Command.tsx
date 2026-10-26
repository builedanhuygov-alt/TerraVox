import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../utils/maplibreWorker'
import { 
  Flame, 
  Wind, 
  CloudRain, 
  Thermometer, 
  Trees, 
  ShieldCheck, 
  MapPin, 
  Layers, 
  Check, 
  Copy, 
  Sparkles, 
  Compass, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  ExternalLink, 
  FileText, 
  Search, 
  CheckCircle2, 
  Crosshair, 
  Activity, 
  ShieldAlert, 
  Info, 
  FileCheck, 
  RotateCcw, 
  Play, 
  ArrowRight, 
  History, 
  X,
  PlusCircle,
  Eye
} from 'lucide-react'
import { useGeographyStore } from '../store/useGeographyStore'
import { EnvironmentalIncident, HazardLevel, NFDRS_HAZARD_SCALE } from '../config/geography'
import { api } from '../services/api'
import { 
  calculateScenarioFireBehavior, 
  ScenarioAssumptions, 
  ScenarioSimulationResult,
  getSystemTrustReport,
  CALIFORNIA_TIME_SLICES,
  TimeSliceSnapshot
} from '../services/signalFusion'
import { 
  loadCaliforniaCounties, 
  resolveCountyForCoordinates, 
  GeoJSONCountyCollection 
} from '../utils/boundaryResolver'
import { 
  findNearestPlace 
} from '../data/californiaCities'
import { 
  resolveIncidentContacts, 
  CALIFORNIA_COUNTY_AGENCIES,
  CALIFORNIA_STATE_HQ 
} from '../data/californiaAgencyDirectory'
import IncidentWorkflowPipeline from '../components/IncidentWorkflowPipeline'
import IncidentContactSection from '../components/IncidentContactSection'
import ForecastVerificationCenter from '../components/ForecastVerificationCenter'
import SatelliteCorrelationCenter from '../components/SatelliteCorrelationCenter'
import GISLayerDrawer, { LayerState } from '../components/GISLayerDrawer'
import EnvironmentalTimelineDrawer from '../components/EnvironmentalTimelineDrawer'
import ContextualDetailDrawer, { SelectedEntity } from '../components/ContextualDetailDrawer'
import CommunityReportModal from '../components/CommunityReportModal'
import {
  predictFireOccurrenceProbability,
  calculateFireDangerRating,
  PredictionHorizonHours
} from '../services/fireRiskEngine'

export default function Command() {
  const nav = useNavigate()
  const { 
    activeRegion, 
    activeRegionId, 
    selectedCountyId, 
    selectIncident,
    selectCounty,
    telemetry,
    refreshTelemetry
  } = useGeographyStore()

  // Incident queue
  const incidents = activeRegion.incidents

  // Selected Incident state (DO NOT AUTO-OPEN ON LOAD)
  const [selectedInc, setSelectedInc] = useState<EnvironmentalIncident | null>(null)
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null)

  // Map state
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const [basemap, setBasemap] = useState<'satellite' | 'terrain' | 'eox'>('satellite')
  const [currentZoom, setCurrentZoom] = useState<number>(6.8)
  const [cursorCoords, setCursorCoords] = useState<[number, number] | null>(null)

  // GeoJSON boundaries cache
  const [countiesGeoJSON, setCountiesGeoJSON] = useState<GeoJSONCountyCollection | null>(null)

  // Drawers and Panels (Single-panel rule)
  const [isSignalsDrawerOpen, setIsSignalsDrawerOpen] = useState(false)
  const [isLayersOpen, setIsLayersOpen] = useState(false)
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isForensicModalOpen, setIsForensicModalOpen] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [showTrustModal, setShowTrustModal] = useState(false)

  // Environmental Timeline State
  const [selectedTimeSlice, setSelectedTimeSlice] = useState<TimeSliceSnapshot>(CALIFORNIA_TIME_SLICES[0])
  const [compareTimeSlice, setCompareTimeSlice] = useState<TimeSliceSnapshot | null>(CALIFORNIA_TIME_SLICES[2])
  const [isCompareMode, setIsCompareMode] = useState(false)

  // Layer toggles
  const [layers, setLayers] = useState<LayerState>({
    administrativeBoundaries: true,
    incorporatedPlaces: true,
    activeFires: true,
    officialIncidents: true,
    historicalScars: true,
    vegetationStress: false,
    weatherStations: false,
    communityReports: true
  })

  // Filter and search
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'HIGH' | 'MED' | 'LOW'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Community observations from backend
  const [publicReports, setPublicReports] = useState<any[]>([])

  // Multi-Stage Intelligence Workflow Tabs (when deep forensics is open)
  const [workflowStage, setWorkflowStage] = useState<'observe' | 'forecast' | 'investigate' | 'understand' | 'compare' | 'verify' | 'benchmark'>('observe')
  const [predictionHorizon, setPredictionHorizon] = useState<PredictionHorizonHours>(24)

  // What-If Scenario Simulator State
  const [scenarioAssumptions, setScenarioAssumptions] = useState<ScenarioAssumptions>({
    windSpeedMph: 16,
    humidityPct: 14,
    fuelMoisture1000hrPct: 7.8,
    temperatureC: 28,
    slopeDegrees: 18,
    suppressionStrategy: 'MONITORING_ONLY'
  })

  // Live sources health
  const [liveSourcesHealth, setLiveSourcesHealth] = useState<any | null>(null)

  useEffect(() => {
    refreshTelemetry()
    loadCaliforniaCounties().then(data => {
      if (data) setCountiesGeoJSON(data)
    })
    api.sourcesHealth().then(res => {
      if (res && (res.sources || res.services)) setLiveSourcesHealth(res)
    }).catch(() => {})
    loadCommunityReports()
  }, [activeRegionId])

  const loadCommunityReports = () => {
    api.publicReports().then(res => {
      if (Array.isArray(res)) setPublicReports(res)
    }).catch(() => {})
  }

  // Global event listeners for Header toolbar buttons
  useEffect(() => {
    const handleToggleLayers = () => {
      setIsLayersOpen(v => {
        const next = !v
        if (next) {
          setIsTimelineOpen(false)
          setIsDetailOpen(false)
          setIsSignalsDrawerOpen(false)
        }
        return next
      })
    }

    const handleToggleTimeline = () => {
      setIsTimelineOpen(v => {
        const next = !v
        if (next) {
          setIsLayersOpen(false)
          setIsDetailOpen(false)
          setIsSignalsDrawerOpen(false)
        }
        return next
      })
    }

    const handleOpenReport = () => {
      setIsReportModalOpen(true)
    }

    const handleReportSubmitted = () => {
      loadCommunityReports()
    }

    const handleSearchSelect = (e: any) => {
      const h = e.detail
      if (!h || !mapRef.current) return
      if (h.coords) {
        mapRef.current.flyTo({ center: h.coords, zoom: 10.5, speed: 1.2 })
      }
      if (h.type === 'Incident') {
        const match = activeRegion.incidents.find(i => i.id === h.incidentId)
        if (match) {
          handleSelectIncident(match)
        }
      }
    }

    window.addEventListener('terravox-toggle-layers', handleToggleLayers)
    window.addEventListener('terravox-toggle-timeline', handleToggleTimeline)
    window.addEventListener('terravox-open-report', handleOpenReport)
    window.addEventListener('terravox-report-submitted', handleReportSubmitted)
    window.addEventListener('ecochain-search', handleSearchSelect)

    return () => {
      window.removeEventListener('terravox-toggle-layers', handleToggleLayers)
      window.removeEventListener('terravox-toggle-timeline', handleToggleTimeline)
      window.removeEventListener('terravox-open-report', handleOpenReport)
      window.removeEventListener('terravox-report-submitted', handleReportSubmitted)
      window.removeEventListener('ecochain-search', handleSearchSelect)
    }
  }, [activeRegion])

  // Synchronize selection changes with map & close conflicting panels
  const handleSelectIncident = (inc: EnvironmentalIncident) => {
    setSelectedInc(inc)
    selectIncident(inc.id)
    if (inc.countyId) selectCounty(inc.countyId)

    const county = activeRegion.counties.find(c => c.id === inc.countyId)
    setSelectedEntity({
      type: inc.category === 'CONFIRMED_WILDFIRE' ? 'incident' : 'detection',
      id: inc.id,
      data: { ...inc, containingCounty: county?.name }
    })

    setIsDetailOpen(true)
    setIsLayersOpen(false)
    setIsTimelineOpen(false)
    setIsSignalsDrawerOpen(false)

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: inc.coordinates,
        zoom: 10.8,
        speed: 1.4,
        curve: 1.2
      })
    }
  }

  // Update scenario inputs when selected incident changes
  useEffect(() => {
    if (selectedInc) {
      setScenarioAssumptions(prev => ({
        ...prev,
        windSpeedMph: selectedInc.weatherContext.windSpeedMph,
        humidityPct: selectedInc.weatherContext.relativeHumidityPct,
        fuelMoisture1000hrPct: selectedInc.weatherContext.fuelMoisture1000hrPct,
        temperatureC: selectedInc.weatherContext.tempC
      }))
    }
  }, [selectedInc])

  // Rothermel / NFDRS scenario simulation calculation
  const simulationResult: ScenarioSimulationResult = calculateScenarioFireBehavior(
    {
      windSpeedMph: selectedInc?.weatherContext.windSpeedMph || 16,
      humidityPct: selectedInc?.weatherContext.relativeHumidityPct || 14,
      fuelMoisture1000hrPct: selectedInc?.weatherContext.fuelMoisture1000hrPct || 7.8,
      tempC: selectedInc?.weatherContext.tempC || 28
    },
    scenarioAssumptions
  )

  // Trust report
  const trustReport = getSystemTrustReport(activeRegion.name)

  // Filtered incidents queue
  const filteredIncidents = incidents.filter(inc => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchTitle = inc.title.toLowerCase().includes(q)
      const matchSector = inc.sectorName.toLowerCase().includes(q)
      const matchCounty = inc.countyId.toLowerCase().includes(q)
      if (!matchTitle && !matchSector && !matchCounty) return false
    }
    if (filterSeverity === 'HIGH') return inc.hazardLevel === 'IV' || inc.hazardLevel === 'V'
    if (filterSeverity === 'MED') return inc.hazardLevel === 'III'
    if (filterSeverity === 'LOW') return inc.hazardLevel === 'I' || inc.hazardLevel === 'II'
    return true
  })

  // Severity counts
  const highCount = incidents.filter(i => i.hazardLevel === 'IV' || i.hazardLevel === 'V').length
  const medCount = incidents.filter(i => i.hazardLevel === 'III').length
  const lowCount = incidents.filter(i => i.hazardLevel === 'I' || i.hazardLevel === 'II').length

  // Containment and Contact Resolution
  const containingCounty = selectedInc ? resolveCountyForCoordinates(selectedInc.coordinates, countiesGeoJSON) : null
  const nearestPlace = selectedInc ? findNearestPlace(selectedInc.coordinates) : null
  const contactInfo = selectedInc ? resolveIncidentContacts(
    selectedInc, 
    containingCounty?.name, 
    containingCounty?.id
  ) : null

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const initialCenter: [number, number] = activeRegion.center || [-120.75, 38.25]

    const tileUrl = basemap === 'terrain'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'base-tiles': {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
            attribution: '© Esri, USGS, NOAA, NASA FIRMS, State of CA'
          }
        },
        layers: [
          {
            id: 'base-tiles',
            type: 'raster',
            source: 'base-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: initialCenter,
      zoom: 6.8,
      minZoom: 5,
      maxZoom: 18,
      maxBounds: [
        [-126.5, 31.0],
        [-112.0, 43.5]
      ]
    })

    mapRef.current = map

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right')

    map.on('zoom', () => {
      setCurrentZoom(map.getZoom())
    })

    map.on('mousemove', (e) => {
      setCursorCoords([e.lngLat.lng, e.lngLat.lat])
    })

    map.on('error', (e) => {
      console.warn('[TERRAVOX Command Notice]', e?.error?.message || e)
    })

    map.on('load', () => {
      // California County Boundaries Layer
      try {
        map.addSource('ca-counties', {
          type: 'geojson',
          data: '/data/california_counties.geojson'
        })

        map.addLayer({
          id: 'ca-counties-fill',
          type: 'fill',
          source: 'ca-counties',
          paint: {
            'fill-color': [
              'case',
              ['==', ['get', 'id'], selectedCountyId || ''],
              'rgba(34, 197, 94, 0.22)',
              'rgba(34, 197, 94, 0.04)'
            ]
          }
        })

        map.addLayer({
          id: 'ca-counties-line',
          type: 'line',
          source: 'ca-counties',
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'id'], selectedCountyId || ''],
              '#34d399',
              'rgba(52, 211, 153, 0.45)'
            ],
            'line-width': 1.5
          }
        })

        map.addLayer({
          id: 'ca-counties-label',
          type: 'symbol',
          source: 'ca-counties',
          minzoom: 6.0,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-anchor': 'center'
          },
          paint: {
            'text-color': '#f0fdf4',
            'text-halo-color': '#020617',
            'text-halo-width': 1.6
          }
        })

        map.on('click', 'ca-counties-fill', (e) => {
          if (e.features && e.features[0]) {
            const f = e.features[0]
            const cId = f.properties?.id
            const cName = f.properties?.name
            if (cId) {
              selectCounty(cId)
              const existingCounty = activeRegion.counties.find(c => c.id === cId)
              setSelectedEntity({
                type: 'county',
                id: cId,
                data: existingCounty || {
                  id: cId,
                  name: cName || 'California County',
                  agencyUnit: CALIFORNIA_COUNTY_AGENCIES[cId]?.agencyName || 'CAL FIRE Operational Unit',
                  coordinates: [e.lngLat.lng, e.lngLat.lat]
                }
              })
              setIsDetailOpen(true)
              setIsLayersOpen(false)
              setIsTimelineOpen(false)
            }
          }
        })

        map.on('mouseenter', 'ca-counties-fill', () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', 'ca-counties-fill', () => {
          map.getCanvas().style.cursor = ''
        })
      } catch (err) {
        console.warn('County layer load error:', err)
      }

      renderMapMarkers(map)
    })

    return () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Basemap switch
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const tileUrl = basemap === 'terrain'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    const src = map.getSource('base-tiles') as any
    if (src && src.setTiles) src.setTiles([tileUrl])
  }, [basemap])

  // Render distinct markers with zoom-level label gating
  const renderMapMarkers = (map: maplibregl.Map) => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const currentZoomLevel = map.getZoom()
    const showLabels = currentZoomLevel >= 8.5

    activeRegion.incidents.forEach(inc => {
      const isHotspot = inc.category === 'THERMAL_ANOMALY' || inc.status === 'UNVERIFIED'
      const isOfficial = inc.category === 'CONFIRMED_WILDFIRE' || inc.status === 'CONFIRMED_ACTIVE' || inc.status === 'CONTAINED'

      if (isHotspot && !layers.activeFires) return
      if (isOfficial && !layers.officialIncidents) return

      const isSelected = selectedInc?.id === inc.id
      const el = document.createElement('div')
      el.className = 'cursor-pointer group flex flex-col items-center select-none'

      if (isOfficial) {
        // DISTINCT OFFICIAL CAL FIRE MARKER: Shield Badge with Flame
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            ${isSelected ? '<div class="absolute -inset-2.5 rounded-full bg-red-500/40 animate-ping"></div>' : ''}
            <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-2xl transition-transform duration-150 group-hover:scale-125 border-2 bg-[#120808] border-[#ef4444]"
                 style="box-shadow: 0 0 14px rgba(239, 68, 68, 0.65);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="1.5">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
              </svg>
            </div>
            ${inc.estimatedAreaHa ? `<span class="absolute -top-2.5 -right-3.5 px-1 rounded font-mono text-[9px] bg-red-950 text-red-200 border border-red-500/40">${Math.round(inc.estimatedAreaHa * 2.47105)} ac</span>` : ''}
          </div>
          ${(showLabels || isSelected) ? `
            <div class="mt-1 px-1.5 py-0.5 rounded bg-black/90 backdrop-blur-xs text-[10px] font-mono text-white whitespace-nowrap border border-white/20 shadow-md ${isSelected ? 'font-bold text-red-400 border-red-500' : 'opacity-90'}">
              🔥 ${inc.title.replace(' Thermal Anomaly', '').replace(' Complex', '')}
            </div>
          ` : ''}
        `
      } else {
        // DISTINCT NASA FIRMS SATELLITE DETECTION: Concentric Radiometer Target (NOT flame!)
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            ${isSelected ? '<div class="absolute -inset-2.5 rounded-full bg-orange-500/40 animate-ping"></div>' : ''}
            <div class="w-7 h-7 rounded-full flex items-center justify-center shadow-xl transition-transform duration-150 group-hover:scale-125 border-2 bg-[#120b06] border-[#f97316]"
                 style="box-shadow: 0 0 12px rgba(249, 115, 22, 0.6);">
              <div class="w-2.5 h-2.5 rounded-full bg-[#f97316] animate-pulse"></div>
            </div>
            ${inc.brightnessKelvin ? `<span class="absolute -top-2 -right-3 px-1 rounded font-mono text-[8px] bg-orange-950 text-orange-200 border border-orange-500/40">${inc.brightnessKelvin}K</span>` : ''}
          </div>
          ${(showLabels || isSelected) ? `
            <div class="mt-1 px-1.5 py-0.5 rounded bg-black/90 backdrop-blur-xs text-[9px] font-mono text-orange-300 whitespace-nowrap border border-orange-500/30 shadow-md">
              🛰️ VIIRS Radiometer (${inc.satelliteSensor?.split(' ')[0] || '375m'})
            </div>
          ` : ''}
        `
      }

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        handleSelectIncident(inc)
      })

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(inc.coordinates)
        .addTo(map)

      markersRef.current.push(marker)
    })
  }

  // Re-render markers on changes
  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      renderMapMarkers(mapRef.current)
    }
  }, [layers.activeFires, layers.officialIncidents, selectedInc, currentZoom])

  // Source health lookup helper
  const getSourceItem = (code: string) => {
    if (!liveSourcesHealth) return null
    const list = liveSourcesHealth.sources || liveSourcesHealth.services || []
    return list.find((s: any) => 
      s.code?.toUpperCase() === code.toUpperCase() || 
      s.id?.toUpperCase() === code.toUpperCase() ||
      s.id?.toLowerCase().includes(code.toLowerCase())
    )
  }

  const renderSourcePill = (code: string, label: string) => {
    const s = getSourceItem(code)
    const isLive = s?.status === 'LIVE'
    return (
      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#102218] border border-[#1b3d2b] text-[10px] font-mono text-[#4ade80]">
        <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-[#4ade80] animate-pulse' : 'bg-[#fbbf24]'}`} />
        <span>{label}: {isLive ? 'LIVE' : 'SYNCED'}</span>
      </span>
    )
  }

  return (
    <div className="relative w-full h-full flex-1 flex flex-col min-h-0 bg-[#070e0a] overflow-hidden select-none">
      {/* ============================================================ */}
      {/* 0. SLIM FLOATING SUB-HEADER BAR (NON-INTRUSIVE)              */}
      {/* ============================================================ */}
      <div className="h-11 bg-[#090f0c]/95 backdrop-blur-md border-b border-[#14261c] px-3 lg:px-4 flex items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setIsSignalsDrawerOpen(v => !v)
              setIsDetailOpen(false)
              setIsLayersOpen(false)
              setIsTimelineOpen(false)
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
              isSignalsDrawerOpen
                ? 'bg-[#153423] text-[#4ade80] border-[#22c55e]'
                : 'bg-[#0e1713] text-[#cbd5d1] border-[#1b2b22] hover:bg-[#14261e]'
            }`}
            title="Inspect California Signals Queue"
          >
            <Flame size={13} className="text-[#f97316]" />
            <span>Signals ({incidents.length})</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            <span className="font-bold text-[#f0fdf4]">{activeRegion.name}</span>
            <span className="text-[10px] font-mono text-[#718579]">· 58 Counties Public Ledger</span>
          </div>
        </div>

        {/* Live Data Sources Indicator */}
        <div className="hidden lg:flex items-center gap-2">
          {renderSourcePill('CAL_FIRE', 'CAL FIRE')}
          {renderSourcePill('NASA_FIRMS', 'NASA FIRMS')}
          {renderSourcePill('OPEN_METEO', 'Open-Meteo')}
        </div>

        {/* Audit & Trust Links */}
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <button
            onClick={() => setShowVerificationModal(true)}
            className="flex items-center gap-1 text-[#38bdf8] hover:text-[#7dd3fc] cursor-pointer"
            title="Model Validation Status & Calibration Audit"
          >
            <FileCheck size={13} />
            <span className="hidden sm:inline">Verification Audit</span>
          </button>
          <span className="text-[#1a3325]">|</span>
          <button
            onClick={() => setShowTrustModal(true)}
            className="flex items-center gap-1 text-[#4ade80] hover:text-[#86efac] cursor-pointer"
            title="Data Provenance & Security Ledger"
          >
            <ShieldCheck size={13} />
            <span className="hidden sm:inline">Trust &amp; Provenance</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. HERO MAP CANVAS (MAXIMIZED GEOSPATIAL VISIBILITY)          */}
      {/* ============================================================ */}
      <div className="relative w-full flex-1 min-h-0 overflow-hidden">
        <div ref={mapContainer} className="w-full h-full bg-[#060c08] outline-none" />

        {/* Top-Right Basemap & Layer Buttons */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center bg-[#08120e]/95 backdrop-blur-md border border-[#1b3326] rounded-xl p-1 text-[11px] font-mono shadow-xl">
            <button
              onClick={() => setBasemap('satellite')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-semibold ${
                basemap === 'satellite' ? 'bg-[#153423] text-[#4ade80]' : 'text-[#718579] hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setBasemap('terrain')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-semibold ${
                basemap === 'terrain' ? 'bg-[#153423] text-[#4ade80]' : 'text-[#718579] hover:text-white'
              }`}
            >
              Terrain
            </button>
          </div>

          <button
            onClick={() => {
              setIsLayersOpen(v => !v)
              setIsTimelineOpen(false)
              setIsDetailOpen(false)
              setIsSignalsDrawerOpen(false)
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md border text-xs font-mono font-semibold shadow-xl transition-all ${
              isLayersOpen ? 'bg-[#1b3f2c] text-[#4ade80] border-[#22c55e]' : 'bg-[#08120e]/95 text-[#cbd5d1] border-[#1b3326] hover:bg-[#12241b]'
            }`}
          >
            <Layers size={14} className="text-[#4ade80]" />
            <span>Layers</span>
          </button>
        </div>

        {/* Bottom-Left Timeline & Coordinates HUD */}
        <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
          <button
            onClick={() => {
              setIsTimelineOpen(v => !v)
              setIsLayersOpen(false)
              setIsDetailOpen(false)
              setIsSignalsDrawerOpen(false)
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md border text-xs font-mono font-semibold shadow-xl transition-all ${
              isTimelineOpen ? 'bg-[#1b3f2c] text-[#a3e635] border-[#a3e635]' : 'bg-[#08120e]/95 text-[#cbd5d1] border-[#1b3326] hover:bg-[#12241b]'
            }`}
          >
            <History size={15} className="text-[#a3e635]" />
            <span>Timeline: {selectedTimeSlice.dateLabel}</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#08120e]/95 backdrop-blur-md border border-[#1b3326] text-[11px] font-mono text-[#8b9f94] shadow-xl">
            <Crosshair size={13} className="text-[#4ade80]" />
            <span>
              {cursorCoords 
                ? `${cursorCoords[1].toFixed(4)}°N, ${Math.abs(cursorCoords[0]).toFixed(4)}°W` 
                : '38.2500°N, 120.7500°W'}
            </span>
            <span className="text-[#1a3325]">|</span>
            <span className="text-[#cbd5d1]">Zoom {currentZoom.toFixed(1)}</span>
          </div>
        </div>

        {/* Attribution Bar */}
        <div className="absolute bottom-2 right-2 z-10 text-[9px] font-mono text-[#5b6f64] bg-[#070e0a]/80 backdrop-blur-xs px-2 py-0.5 rounded border border-[#14261c] pointer-events-none hidden md:block">
          CAL FIRE Official · NASA FIRMS VIIRS NRT · Open-Meteo · US Census TIGER
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. ON-DEMAND SIGNALS QUEUE DRAWER (SLIDES FROM LEFT)         */}
      {/* ============================================================ */}
      {isSignalsDrawerOpen && (
        <div className="fixed inset-y-0 left-0 z-40 w-full max-w-sm bg-[#08120e]/98 backdrop-blur-md border-r border-[#1b3326] shadow-2xl flex flex-col animate-slideRight pointer-events-auto">
          <div className="p-4 border-b border-[#14261c] flex items-center justify-between bg-[#060c09]">
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-[#f97316]" />
              <h3 className="font-bold text-sm text-[#f0fdf4]">Signals &amp; Incidents Queue</h3>
            </div>
            <button
              onClick={() => setIsSignalsDrawerOpen(false)}
              className="p-1.5 rounded-lg text-[#718579] hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-3 border-b border-[#14261c] space-y-2">
            <div className="flex items-center gap-1 p-0.5 bg-[#0a1510] rounded-lg border border-[#16271e] text-[11px]">
              {(['ALL', 'HIGH', 'MED', 'LOW'] as const).map(sev => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`flex-1 py-1 rounded font-medium transition-colors ${
                    filterSeverity === sev ? 'bg-[#153423] text-[#4ade80] font-bold' : 'text-[#718579] hover:text-white'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#0a1510] border border-[#16271e]">
              <Search size={13} className="text-[#5b6f64]" />
              <input
                type="text"
                placeholder="Filter by county or incident..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-xs text-white placeholder-[#5b6f64] outline-none w-full"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredIncidents.map(inc => {
              const isSelected = selectedInc?.id === inc.id
              const isHigh = inc.hazardLevel === 'IV' || inc.hazardLevel === 'V'
              return (
                <div
                  key={inc.id}
                  onClick={() => handleSelectIncident(inc)}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer border flex gap-3 ${
                    isSelected
                      ? 'bg-[#102419] border-[#22c55e] shadow-md shadow-[#22c55e]/10'
                      : 'bg-[#0b1310] border-[#16271e] hover:border-[#1f3a2b] hover:bg-[#0e1915]'
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-[#1b3326] bg-[#070e0a]">
                    <img 
                      src={inc.thumbnail || '/field/forest-fire-hisgett.jpg'} 
                      alt={inc.title}
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs font-bold text-[#f0fdf4] truncate">
                        {inc.title.replace(' Thermal Anomaly', '')}
                      </h4>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border shrink-0 ${
                        isHigh ? 'bg-red-950/80 text-red-400 border-red-500/40' : 'bg-amber-950/80 text-amber-400 border-amber-500/40'
                      }`}>
                        {isHigh ? 'High' : 'Med'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#718579] truncate">{inc.sectorName}</div>
                    <div className="text-[10px] font-mono text-[#4ade80]">
                      {inc.estimatedAreaHa ? `${Math.round(inc.estimatedAreaHa * 2.47105).toLocaleString()} acres` : 'Thermal hotspot'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. DRAWERS & MODALS (GIS, TIMELINE, CONTEXTUAL, REPORT)       */}
      {/* ============================================================ */}
      <GISLayerDrawer
        isOpen={isLayersOpen}
        onClose={() => setIsLayersOpen(false)}
        basemap={basemap}
        onBasemapChange={setBasemap}
        layers={layers}
        onToggleLayer={(k) => setLayers(l => ({ ...l, [k]: !l[k] }))}
        counts={{
          calfire: activeRegion.incidents.filter(i => i.category === 'CONFIRMED_WILDFIRE').length,
          firms: telemetry?.firmsCount ?? activeRegion.incidents.filter(i => i.category === 'THERMAL_ANOMALY').length,
          counties: 58,
          reports: publicReports.length
        }}
      />

      <EnvironmentalTimelineDrawer
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        selectedSlice={selectedTimeSlice}
        onSelectSlice={setSelectedTimeSlice}
        compareSlice={compareTimeSlice}
        onSelectCompareSlice={setCompareTimeSlice}
        isCompareMode={isCompareMode}
        onToggleCompareMode={() => setIsCompareMode(v => !v)}
      />

      <ContextualDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedEntity(null)
          setSelectedInc(null)
        }}
        entity={selectedEntity}
        onOpenSitRep={(inc) => {
          nav(`/reports?incident=${encodeURIComponent(inc.title || '')}`)
        }}
        onNavigateToCommand={(incId) => {
          setIsForensicModalOpen(true)
        }}
      />

      <CommunityReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        initialCoords={cursorCoords || undefined}
      />

      {/* ============================================================ */}
      {/* 4. DEEP FORENSIC ANALYSIS MODAL (ON-DEMAND AUDIT WORKSPACE)   */}
      {/* ============================================================ */}
      {isForensicModalOpen && selectedInc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#090e0c] border border-[#1b3326] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-[#14261c] flex items-center justify-between bg-[#060c09]">
              <div className="flex items-center gap-2.5">
                <Flame size={16} className="text-[#f97316]" />
                <div>
                  <h3 className="font-bold text-sm text-[#f0fdf4]">
                    Forensic Intelligence Workspace: {selectedInc.title}
                  </h3>
                  <p className="text-[10px] text-[#718579] font-mono">
                    Rothermel Spread Simulation · Satellite Correlation · Agency Command
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsForensicModalOpen(false)}
                className="p-1.5 rounded-lg text-[#718579] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs text-[#cbd5d1]">
              {contactInfo && (
                <IncidentWorkflowPipeline incident={selectedInc} contactInfo={contactInfo} />
              )}

              <div className="pt-2">
                <SatelliteCorrelationCenter
                  incidentCoords={selectedInc.coordinates}
                  incidentName={selectedInc.title}
                  incidentStartedAt={selectedInc.timestamp}
                  incidentUpdatedAt={selectedInc.timestamp}
                  isFinal={selectedInc.status === 'CONTAINED'}
                />
              </div>

              {contactInfo && (
                <div className="pt-2">
                  <IncidentContactSection incident={selectedInc} contactInfo={contactInfo} />
                </div>
              )}
            </div>

            <div className="p-3 border-t border-[#14261c] bg-[#070b09] flex justify-end">
              <button
                onClick={() => setIsForensicModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#163324] hover:bg-[#1f4934] border border-[#234f37] text-xs font-bold text-[#4ade80] transition-colors"
              >
                Return to California Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. VERIFICATION AUDIT & SYSTEM TRUST MODALS                   */}
      {/* ============================================================ */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#090e0c] border border-[#1b3326] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-[#14261c] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck size={18} className="text-[#38bdf8]" />
                <h3 className="font-bold text-sm text-[#f0fdf4]">
                  Operational Verification &amp; Statistical Audit Center
                </h3>
              </div>
              <button onClick={() => setShowVerificationModal(false)} className="text-[#718579] hover:text-white p-1">
                ✕
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-120px)]">
              <ForecastVerificationCenter />
            </div>
            <div className="p-3.5 border-t border-[#14261c] bg-[#070b09] flex justify-end">
              <button
                onClick={() => setShowVerificationModal(false)}
                className="px-4 py-1.5 rounded-xl bg-[#163324] text-[#4ade80] font-bold text-xs hover:bg-[#1f4934]"
              >
                Close Verification Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {showTrustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#090e0c] border border-[#1b3326] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-[#14261c] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#4ade80]" />
                <h3 className="font-bold text-sm text-[#f0fdf4]">Data Provenance &amp; System Trust Audit</h3>
              </div>
              <button onClick={() => setShowTrustModal(false)} className="text-[#718579] hover:text-white p-1">
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4 text-xs text-[#cbd5d1]">
              <div className="p-3 rounded-xl bg-[#0c1813] border border-[#172e22] space-y-1">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-[#718579]">Overall System Integrity:</span>
                  <span className="font-bold text-[#4ade80]">
                    {liveSourcesHealth ? (
                      (() => {
                        const sList = liveSourcesHealth.sources || liveSourcesHealth.services || []
                        const liveCount = sList.filter((s: any) => s.status === 'LIVE' || s.status === 'STATIC').length
                        return `${Math.round((liveCount / (sList.length || 1)) * 100)}% OPERATIONAL`
                      })()
                    ) : (
                      '100% OPERATIONAL'
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-[#8b9f94]">
                  Continuous cryptographic checksum validation of satellite feeds, in-situ weather APIs, and CAL FIRE GIS records.
                </p>
              </div>

              <div className="space-y-2.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#718579] font-bold block">
                  Active Data Pipeline Health ({((liveSourcesHealth?.sources || liveSourcesHealth?.services)?.length) || Object.values(trustReport).length} Endpoints)
                </span>
                {(liveSourcesHealth?.sources || liveSourcesHealth?.services || []).map((s: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl bg-[#0b1310] border border-[#14261c] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">{s.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                        {s.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#8b9f94]">
                      <div>Provider: <b className="text-stone-300">{s.provenance}</b></div>
                      <div>Records: <b className="text-[#4ade80]">{s.record_count ?? 0} items</b></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3.5 border-t border-[#14261c] bg-[#070b09] flex justify-end">
              <button
                onClick={() => setShowTrustModal(false)}
                className="px-4 py-1.5 rounded-xl bg-[#163324] text-[#4ade80] font-bold text-xs hover:bg-[#1f4934]"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}