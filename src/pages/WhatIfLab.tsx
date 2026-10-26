import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { api, API_BASE } from '../services/api'
import ThreeFireReconstruction, { HistoricalFireData } from '../components/ThreeFireReconstruction'
import {
  Beaker,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Sliders,
  Thermometer,
  Wind,
  Droplets,
  Trees,
  Construction,
  ShieldCheck,
  AlertTriangle,
  FileDown,
  Info,
  CheckCircle2,
  MapPin,
  Clock,
  Layers,
  Database,
  Flame,
  GitCompare,
  ExternalLink,
  Calendar,
  Search,
  Building2,
  AlertOctagon,
  Eye,
  Maximize2,
  Activity,
  Upload,
  RefreshCw,
  Copy,
  Trash2,
  Compass,
  Gauge,
  Navigation,
  FileText,
  Radio
} from 'lucide-react'

// ============================================================================
// TYPES & DATA STRUCTURES
// ============================================================================

export type DataMode = 'LIVE_OBSERVATIONS' | 'HISTORICAL_REPLAY' | 'CUSTOM_SCENARIO'

export type SelectionTab = 'location' | 'incident' | 'geojson'

export type LayerMode = 'burn_severity' | 'slope_aspect' | 'vegetation_fuel' | 'natural_imagery'

export interface ScenarioSlot {
  id: 'baseline' | 'scenario_a' | 'scenario_b' | 'scenario_c'
  name: string
  created_at: string
  status: 'READY' | 'COMPUTING' | 'SIMULATED'
  inputs: {
    temp_c: number
    rh_pct: number
    wind_mph: number
    wind_dir_deg: number
    rain_7d_mm: number
    slope_deg: number
    aspect_deg: number
    fuel_category: string
    brush_loss_ha: number
    road_closure_hours: number
    intervention: string
    time_horizon_hours: number
  }
  danger_score?: number
  risk_band?: string
  color?: string
  advisory?: string
  components?: {
    fuel_dryness: number
    weather_stress: number
    wind_hazard: number
    precipitation_deficit: number
    infrastructure_impedance: number
  }
  physical_parameters?: {
    vapor_pressure_deficit_kpa: number
    equilibrium_fuel_moisture_m100_pct: number
    head_rate_of_spread_kmh: number
  }
  comparison_to_baseline?: {
    score_delta: number
    percentage_change: number
    temp_delta_c: number
    rh_delta_pct: number
    wind_delta_mph: number
    vpd_delta_kpa: number
  }
  mitigation_evaluation?: {
    label: string
    danger_score_delta: number
    mitigated_score: number
    estimated_response_time_delta_minutes: number
    feasibility_assessment: string
    operational_advisory: string
  }
  spatial_spread?: any
}

// Interventions catalog
const INTERVENTIONS_LIST = [
  { id: 'No intervention', label: 'Baseline (Standard Initial Attack)', tag: 'Routine Dispatch' },
  { id: 'Pre-position team', label: 'Tactical Pre-Positioning & Staging', tag: 'Forward Ridge Choke-Points' },
  { id: 'Close road + reroute', label: 'Precautionary Road Closure & Evacuation Corridor', tag: 'Canyon Pass Reroute' },
  { id: 'Aerial reconnaissance standby', label: 'Aerial Reconnaissance & Tanker Standby', tag: 'Lead Plane & Retardant Drops' }
]

// Fuel Categories
const FUEL_CATEGORIES = [
  { id: 'chaparral', label: 'Chaparral & Manzanita Thicket (High Flame Height)', ros_mult: 1.35 },
  { id: 'mixed_conifer', label: 'Mixed Conifer & Ponderosa Pine with Brush', ros_mult: 1.15 },
  { id: 'timber_litter', label: 'Dense Timber Litter & Downed Wood', ros_mult: 0.95 },
  { id: 'grassland', label: 'Annual Cured Grassland (Rapid Flash Fuel)', ros_mult: 1.45 },
  { id: 'wui_urban', label: 'Wildland-Urban Interface (High Structure Exposure)', ros_mult: 1.25 }
]

// Fallback Camp Fire 2018 record
const DEFAULT_CAMP_FIRE: HistoricalFireData = {
  id: 'camp-fire-2018',
  name: 'Camp Fire',
  year: 2018,
  county: 'Butte County',
  location_summary: 'Paradise, Concow, Magalia, Pulga, Feather River Canyon',
  center_coordinates: [-121.528, 39.789],
  bounds: [[39.64, -121.72], [39.94, -121.35]],
  acres_burned: 153336,
  hectares_burned: 62053,
  structures_destroyed: 18804,
  structures_damaged: 564,
  fatalities_confirmed: 85,
  injuries_confirmed: 3,
  evacuation_count: 52000,
  official_cause: 'PG&E Caribou-Palermo 115 kV transmission line failure at Poe Dam (CPUC / CAL FIRE Investigation)',
  ignition_point: {
    name: 'Poe Dam (Feather River Canyon)',
    coordinates: [-121.439, 39.814],
    elevation_m: 430,
    timestamp: '2018-11-08T06:33:00-08:00'
  },
  weather_observations: {
    temperature_f: 70.0,
    relative_humidity_pct: 8.0,
    sustained_wind_mph: 35.0,
    wind_gusts_mph: 52.0,
    wind_direction: 'NE (Jarbo Gap Downslope Windstorm)'
  },
  damaged_structure_hotspots: [
    { name: 'Paradise Ridge Town Center', coordinates: [-121.6219, 39.7596], density: 'EXTREME', destroyed_est: 14200 },
    { name: 'Concow Basin', coordinates: [-121.516, 39.734], density: 'SEVERE', destroyed_est: 2100 },
    { name: 'Magalia Pines', coordinates: [-121.598, 39.812], density: 'HIGH', destroyed_est: 1900 },
    { name: 'Centerville / Butte Creek', coordinates: [-121.695, 39.785], density: 'MODERATE', destroyed_est: 604 }
  ],
  timeline_snapshots: [
    {
      step_index: 0,
      timestamp: '2018-11-07T18:00:00-08:00',
      label: 'Pre-Fire Desiccation & Red Flag',
      stage: 'BASELINE_MONITORING',
      acres_estimate: 0,
      structures_affected: 0,
      description: 'NWS issues Red Flag Warning; 100-hr fuel moisture plummets below 4%; Jarbo Gap offshore gusts reach 50 mph.',
      data_quality: 'OFFICIAL_RAWS'
    },
    {
      step_index: 1,
      timestamp: '2018-11-08T06:33:00-08:00',
      label: 'Ignition at Poe Dam / Pulga',
      stage: 'IGNITION',
      acres_estimate: 10,
      structures_affected: 0,
      description: 'PG&E Caribou-Palermo line hook fails in steep Feather River Canyon under violent northeast winds.',
      data_quality: 'CAL_FIRE_INVESTIGATION'
    },
    {
      step_index: 2,
      timestamp: '2018-11-08T09:00:00-08:00',
      label: 'Canyon Funneling & Concow Sweep',
      stage: 'SPREAD',
      acres_estimate: 5000,
      structures_affected: 450,
      description: 'Extreme ember storm jumps Highway 70; fire sweeps into Concow basin; multiple entrapments reported.',
      data_quality: 'SITSTAT_INCIDENT_REPORT'
    },
    {
      step_index: 3,
      timestamp: '2018-11-08T14:00:00-08:00',
      label: 'Paradise WUI Engulfment',
      stage: 'MASS_BURNING',
      acres_estimate: 20000,
      structures_affected: 8500,
      description: 'Catastrophic urban firestorm engulfs Paradise; severe gridlock on Skyway and Clark Road.',
      data_quality: 'NIST_SP_1244'
    },
    {
      step_index: 4,
      timestamp: '2018-11-12T18:00:00-08:00',
      label: 'Perimeter Expansion & Magalia Burn',
      stage: 'CONTAINMENT_EFFORT',
      acres_estimate: 117000,
      structures_affected: 15500,
      description: 'Fire spreads into upper Magalia and toward Lake Oroville; over 5,000 personnel deployed.',
      data_quality: 'CAL_FIRE_GIS_PERIMETER'
    },
    {
      step_index: 5,
      timestamp: '2018-11-25T07:00:00-08:00',
      label: 'Final Containment & Survey',
      stage: 'CONTAINED',
      acres_estimate: 153336,
      structures_affected: 18804,
      description: '100% containment declared following winter rain. Final forensic audit documents 153,336 acres and 18,804 structures destroyed.',
      data_quality: 'CAL_FIRE_FINAL_AUDIT'
    }
  ]
}

// Initial baseline scenario config
const INITIAL_BASELINE: ScenarioSlot = {
  id: 'baseline',
  name: 'Baseline In-Situ Environment',
  created_at: new Date().toISOString(),
  status: 'READY',
  inputs: {
    temp_c: 28.0,
    rh_pct: 22.0,
    wind_mph: 14.0,
    wind_dir_deg: 45,
    rain_7d_mm: 0.0,
    slope_deg: 18.0,
    aspect_deg: 45,
    fuel_category: 'Chaparral & Manzanita Thicket (High Flame Height)',
    brush_loss_ha: 0.0,
    road_closure_hours: 0.0,
    intervention: 'No intervention',
    time_horizon_hours: 6.0
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WhatIfLab() {
  // Top-Level Data Mode
  const [dataMode, setDataMode] = useState<DataMode>('HISTORICAL_REPLAY')

  // Left Panel Selection Tab: 'location' | 'incident' | 'geojson'
  const [selectionTab, setSelectionTab] = useState<SelectionTab>('incident')

  // Search & Location Selection State
  const [locationQuery, setLocationQuery] = useState<string>('Paradise')
  const [locationSearchResults, setLocationSearchResults] = useState<any[]>([])
  const [selectedLocation, setSelectedLocation] = useState<any | null>({
    id: 'loc-paradise-butte',
    name: 'Paradise (Paradise Ridge)',
    county: 'Butte County',
    region: 'Northern Sierra Nevada Foothills',
    coordinates: [-121.6219, 39.7596],
    elevation_m: 542
  })
  const [analysisRadiusKm, setAnalysisRadiusKm] = useState<number>(15)
  const [locationContext, setLocationContext] = useState<any | null>(null)
  const [loadingContext, setLoadingContext] = useState<boolean>(false)

  // Incident Selection State
  const [historicalFires, setHistoricalFires] = useState<HistoricalFireData[]>([DEFAULT_CAMP_FIRE])
  const [selectedFireId, setSelectedFireId] = useState<string>('camp-fire-2018')
  const [selectedFire, setSelectedFire] = useState<HistoricalFireData>(DEFAULT_CAMP_FIRE)
  const [fireSearch, setFireSearch] = useState<string>('')
  const [incidentStatusFilter, setIncidentStatusFilter] = useState<'ALL' | 'HISTORICAL' | 'ACTIVE'>('ALL')
  const [loadingIncident, setLoadingIncident] = useState<boolean>(false)

  // GeoJSON Import State
  const [customGeoJson, setCustomGeoJson] = useState<any | null>(null)
  const [geoJsonInputText, setGeoJsonInputText] = useState<string>('')
  const [geoJsonError, setGeoJsonError] = useState<string>('')
  const [geoJsonSummary, setGeoJsonSummary] = useState<any | null>(null)

  // Live Observation Polling & Health State
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true)
  const [lastRefreshTime, setLastRefreshTime] = useState<string>(new Date().toLocaleTimeString())
  const [pollingIntervalSec, setPollingIntervalSec] = useState<number>(0) // 0 = off
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 3D Digital Twin Visualization Controls
  const [layerMode, setLayerMode] = useState<LayerMode>('burn_severity')
  const [layerOpacity, setLayerOpacity] = useState<number>(0.9)
  const [elevationScale, setElevationScale] = useState<number>(1.5)
  const [burnSeverityVisible, setBurnSeverityVisible] = useState<boolean>(true)
  const [structuresVisible, setStructuresVisible] = useState<boolean>(true)
  const [infrastructureVisible, setInfrastructureVisible] = useState<boolean>(true)
  const [weatherVectorsVisible, setWeatherVectorsVisible] = useState<boolean>(true)
  const [performanceMode, setPerformanceMode] = useState<boolean>(false)
  const [hoveredCoords, setHoveredCoords] = useState<{ lat: number; lon: number; elevM: number } | null>(null)

  // Timeline Playback (Historical Replay Mode)
  const [currentSnapshotIdx, setCurrentSnapshotIdx] = useState<number>(0)
  const [isPlayingTimeline, setIsPlayingTimeline] = useState<boolean>(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1)
  const timelineTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Multi-Scenario Workspace State (Baseline + Scenario A, B, C)
  const [scenarios, setScenarios] = useState<ScenarioSlot[]>([
    INITIAL_BASELINE,
    {
      id: 'scenario_a',
      name: 'Scenario A · Foehn Wind Surge (+20mph)',
      created_at: new Date().toISOString(),
      status: 'READY',
      inputs: {
        ...INITIAL_BASELINE.inputs,
        temp_c: 32.0,
        rh_pct: 10.0,
        wind_mph: 34.0,
        intervention: 'Pre-position team'
      }
    },
    {
      id: 'scenario_b',
      name: 'Scenario B · Severe Drought & Road Choke-Point',
      created_at: new Date().toISOString(),
      status: 'READY',
      inputs: {
        ...INITIAL_BASELINE.inputs,
        temp_c: 34.0,
        rh_pct: 8.0,
        wind_mph: 26.0,
        road_closure_hours: 24.0,
        brush_loss_ha: 400.0,
        intervention: 'Close road + reroute'
      }
    }
  ])
  const [activeScenarioId, setActiveScenarioId] = useState<ScenarioSlot['id']>('baseline')
  const [simulatingScenarios, setSimulatingScenarios] = useState<boolean>(false)
  const [simulationError, setSimulationError] = useState<string>('')

  // Historical Comparison Modal
  const [compareModalOpen, setCompareModalOpen] = useState<boolean>(false)
  const [compareTargetId, setCompareTargetId] = useState<string>('dixie-fire-2021')
  const [comparisonData, setComparisonData] = useState<any>(null)
  const [loadingComparison, setLoadingComparison] = useState<boolean>(false)

  // Active scenario reference
  const currentScenario = useMemo(() => {
    return scenarios.find(s => s.id === activeScenarioId) || scenarios[0]
  }, [scenarios, activeScenarioId])

  // ==========================================================================
  // 1. INITIAL MOUNT: LOAD CATALOG & INITIAL CONTEXT
  // ==========================================================================
  useEffect(() => {
    let isMounted = true
    const initData = async () => {
      try {
        const fires = await api.historicalFires()
        if (isMounted && Array.isArray(fires) && fires.length > 0) {
          setHistoricalFires(fires)
        }
      } catch (err) {
        console.warn('Using cached historical wildfires catalog:', err)
      }

      // Initial location search
      try {
        const sRes = await api.twinSearchLocations('Paradise')
        if (isMounted && sRes?.results?.length > 0) {
          setLocationSearchResults(sRes.results)
        }
      } catch (err) {
        console.warn('Location search error:', err)
      }
    }
    initData()
    return () => { isMounted = false }
  }, [])

  // ==========================================================================
  // 2. LOAD LOCATION CONTEXT WHEN TARGET LOCATION CHANGES
  // ==========================================================================
  const fetchLocationContext = useCallback(async (lat: number, lon: number, radiusKm: number) => {
    setLoadingContext(true)
    try {
      const ctx = await api.twinLocationContext(lat, lon, radiusKm)
      if (ctx) {
        setLocationContext(ctx)
        setLastRefreshTime(new Date().toLocaleTimeString())
        setIsLiveConnected(ctx.data_readiness?.weather?.status === 'LIVE')

        // Update baseline weather inputs if in Live Observations mode
        if (dataMode === 'LIVE_OBSERVATIONS' && ctx.weather_observations) {
          const w = ctx.weather_observations
          setScenarios(prev => prev.map(s => {
            if (s.id === 'baseline') {
              return {
                ...s,
                inputs: {
                  ...s.inputs,
                  temp_c: w.temperature_c ?? s.inputs.temp_c,
                  rh_pct: w.relative_humidity_pct ?? s.inputs.rh_pct,
                  wind_mph: w.wind_speed_mph ?? s.inputs.wind_mph,
                  wind_dir_deg: w.wind_direction_deg ?? s.inputs.wind_dir_deg,
                  rain_7d_mm: w.rain_7d_mm ?? s.inputs.rain_7d_mm
                }
              }
            }
            return s
          }))
        }
      }
    } catch (err) {
      console.error('Error fetching location context:', err)
      setIsLiveConnected(false)
    } finally {
      setLoadingContext(false)
    }
  }, [dataMode])

  useEffect(() => {
    if (selectedLocation?.coordinates) {
      const [lon, lat] = selectedLocation.coordinates
      fetchLocationContext(lat, lon, analysisRadiusKm)
    }
  }, [selectedLocation, analysisRadiusKm, fetchLocationContext])

  // ==========================================================================
  // 3. LOAD SELECTED HISTORICAL FIRE DETAIL
  // ==========================================================================
  useEffect(() => {
    let isMounted = true
    const loadDetail = async () => {
      setLoadingIncident(true)
      try {
        const detail = await api.historicalFireDetail(selectedFireId)
        if (isMounted && detail && detail.name) {
          setSelectedFire(detail)
          setCurrentSnapshotIdx(0)
          setIsPlayingTimeline(false)

          // Pre-populate Baseline scenario inputs from real historical weather
          if (detail.weather_observations) {
            const w = detail.weather_observations
            const tempC = Math.round(((w.temperature_f - 32) * 5 / 9) * 10) / 10
            setScenarios(prev => prev.map(s => {
              if (s.id === 'baseline') {
                return {
                  ...s,
                  name: `Baseline · ${detail.name} Observations`,
                  inputs: {
                    ...s.inputs,
                    temp_c: tempC,
                    rh_pct: w.relative_humidity_pct,
                    wind_mph: w.sustained_wind_mph,
                    wind_dir_deg: 45
                  }
                }
              }
              return s
            }))
          }
        }
      } catch (err) {
        console.warn('Error loading fire detail, falling back:', err)
      } finally {
        if (isMounted) setLoadingIncident(false)
      }
    }
    loadDetail()
    return () => { isMounted = false }
  }, [selectedFireId])

  // ==========================================================================
  // 4. TIMELINE PLAYBACK ENGINE
  // ==========================================================================
  useEffect(() => {
    if (isPlayingTimeline && dataMode === 'HISTORICAL_REPLAY') {
      const snapshots = selectedFire.timeline_snapshots || []
      if (snapshots.length <= 1) return

      const intervalMs = Math.round(2500 / playbackSpeed)
      timelineTimerRef.current = setInterval(() => {
        setCurrentSnapshotIdx(prev => {
          if (prev >= snapshots.length - 1) {
            setIsPlayingTimeline(false)
            return prev
          }
          return prev + 1
        })
      }, intervalMs)
    } else {
      if (timelineTimerRef.current) clearInterval(timelineTimerRef.current)
    }

    return () => {
      if (timelineTimerRef.current) clearInterval(timelineTimerRef.current)
    }
  }, [isPlayingTimeline, playbackSpeed, selectedFire, dataMode])

  // ==========================================================================
  // 5. LIVE OBSERVATIONS POLLING ENGINE
  // ==========================================================================
  useEffect(() => {
    if (pollingIntervalSec > 0 && dataMode === 'LIVE_OBSERVATIONS' && selectedLocation?.coordinates) {
      const [lon, lat] = selectedLocation.coordinates
      pollingTimerRef.current = setInterval(() => {
        fetchLocationContext(lat, lon, analysisRadiusKm)
      }, pollingIntervalSec * 1000)
    } else {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current)
    }

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current)
    }
  }, [pollingIntervalSec, dataMode, selectedLocation, analysisRadiusKm, fetchLocationContext])

  // ==========================================================================
  // 6. GEOJSON IMPORT HANDLER
  // ==========================================================================
  const handleValidateAndImportGeoJson = async (textToParse?: string) => {
    setGeoJsonError('')
    const input = (textToParse ?? geoJsonInputText).trim()
    if (!input) {
      setGeoJsonError('Please paste or upload a GeoJSON string.')
      return
    }

    try {
      const parsed = JSON.parse(input)
      const res = await api.twinImportGeoJson(parsed)
      if (res && res.status === 'VALIDATED') {
        setCustomGeoJson(res.geojson)
        setGeoJsonSummary(res)
        setSelectedLocation({
          id: 'custom-imported-geojson',
          name: `Custom Analysis Area (${res.estimated_extent?.bbox_area_acres?.toLocaleString()} ac)`,
          county: 'California Custom Bounds',
          coordinates: res.centroid,
          elevation_m: 500
        })
      } else {
        throw new Error('Validation failed.')
      }
    } catch (err: any) {
      setGeoJsonError(String(err.message || err))
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const content = ev.target?.result as string
      setGeoJsonInputText(content)
      handleValidateAndImportGeoJson(content)
    }
    reader.readAsText(file)
  }

  // ==========================================================================
  // 7. LOCATION SEARCH HANDLER
  // ==========================================================================
  const handleSearchLocations = async () => {
    if (!locationQuery.trim()) return
    try {
      const res = await api.twinSearchLocations(locationQuery)
      if (res?.results) {
        setLocationSearchResults(res.results)
        if (res.results.length > 0) {
          setSelectedLocation(res.results[0])
        }
      }
    } catch (err) {
      console.error('Location search failed:', err)
    }
  }

  // ==========================================================================
  // 8. MULTI-SCENARIO SIMULATION EXECUTION
  // ==========================================================================
  const handleRunMultiSimulation = async () => {
    setSimulatingScenarios(true)
    setSimulationError('')

    try {
      const payloadScenarios = scenarios.map(s => ({
        id: s.id,
        name: s.name,
        temp_c: s.inputs.temp_c,
        rh_pct: s.inputs.rh_pct,
        wind_mph: s.inputs.wind_mph,
        wind_dir_deg: s.inputs.wind_dir_deg,
        rain_7d_mm: s.inputs.rain_7d_mm,
        slope_deg: s.inputs.slope_deg,
        brush_loss_ha: s.inputs.brush_loss_ha,
        road_closure_hours: s.inputs.road_closure_hours,
        intervention: s.inputs.intervention,
        fuel_category: s.inputs.fuel_category,
        time_horizon_hours: s.inputs.time_horizon_hours,
        ignition_lon: selectedLocation?.coordinates?.[0] ?? -121.528,
        ignition_lat: selectedLocation?.coordinates?.[1] ?? 39.789
      }))

      const payload = {
        county: selectedLocation?.county || selectedFire?.county || 'Butte County',
        scenarios: payloadScenarios
      }

      const res = await api.twinSimulateMultiScenario(payload)

      if (res && res.scenarios) {
        setScenarios(prev => prev.map((s, idx) => {
          const evaluated = res.scenarios[idx]
          if (evaluated) {
            return {
              ...s,
              status: 'SIMULATED',
              danger_score: evaluated.danger_output?.danger_score,
              risk_band: evaluated.danger_output?.risk_band,
              color: evaluated.danger_output?.color,
              advisory: evaluated.danger_output?.advisory,
              components: evaluated.danger_output?.components,
              physical_parameters: evaluated.physical_parameters,
              comparison_to_baseline: evaluated.comparison_to_baseline,
              mitigation_evaluation: evaluated.mitigation_evaluation,
              spatial_spread: evaluated.spatial_spread_estimate
            }
          }
          return s
        }))
      }
    } catch (err: any) {
      setSimulationError(String(err.message || err))
    } finally {
      setSimulatingScenarios(false)
    }
  }

  // Duplicate scenario into next slot
  const handleDuplicateScenario = (slot: ScenarioSlot) => {
    const availableSlots: ScenarioSlot['id'][] = ['scenario_a', 'scenario_b', 'scenario_c']
    const nextSlotId = availableSlots.find(id => !scenarios.some(s => s.id === id))

    if (!nextSlotId) {
      alert('Maximum of 4 scenarios (Baseline + A, B, C) reached. Delete or reset a slot first.')
      return
    }

    const newSlot: ScenarioSlot = {
      id: nextSlotId,
      name: `${slot.name} (Copy)`,
      created_at: new Date().toISOString(),
      status: 'READY',
      inputs: { ...slot.inputs }
    }

    setScenarios(prev => [...prev, newSlot])
    setActiveScenarioId(nextSlotId)
  }

  // Update input for active scenario without mutating others
  const updateActiveScenarioInput = (field: keyof ScenarioSlot['inputs'], value: any) => {
    setScenarios(prev => prev.map(s => {
      if (s.id === activeScenarioId) {
        return {
          ...s,
          status: 'READY',
          inputs: {
            ...s.inputs,
            [field]: value
          }
        }
      }
      return s
    }))
  }

  // Reset active scenario to baseline inputs
  const handleResetActiveScenario = () => {
    const base = scenarios.find(s => s.id === 'baseline') || INITIAL_BASELINE
    setScenarios(prev => prev.map(s => {
      if (s.id === activeScenarioId) {
        return {
          ...s,
          status: 'READY',
          inputs: { ...base.inputs }
        }
      }
      return s
    }))
  }

  // Delete scenario
  const handleDeleteScenario = (id: ScenarioSlot['id']) => {
    if (id === 'baseline') return
    setScenarios(prev => prev.filter(s => s.id !== id))
    setActiveScenarioId('baseline')
  }

  // Chart data comparing scenarios
  const scenarioChartData = useMemo(() => {
    return scenarios.map(s => ({
      name: s.id === 'baseline' ? 'Baseline' : s.name.split('·')[0].trim(),
      danger: s.danger_score ?? 60,
      fuelDryness: s.components?.fuel_dryness ?? 50,
      windHazard: s.components?.wind_hazard ?? 40
    }))
  }, [scenarios])

  // Active snapshot for timeline
  const activeSnapshot = useMemo(() => {
    const list = selectedFire.timeline_snapshots || []
    return list[currentSnapshotIdx] || list[0] || null
  }, [selectedFire, currentSnapshotIdx])

  // Active spread polygons for 3D overlay
  const activeSpreadSteps = useMemo(() => {
    return currentScenario.spatial_spread?.spread_steps || []
  }, [currentScenario])

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
      {/* ==================================================================== */}
      {/* 1. PROFESSIONAL TOP HEADER & DATA MODE BAR                           */}
      {/* ==================================================================== */}
      <div className="space-y-3 pb-3 border-b border-[#172b22]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#a3e635]">
              <Beaker size={15} />
              <span>TERRAVOX DECISION-SUPPORT & 3D DIGITAL TWIN · CALIFORNIA PILOT</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#f0fdf4] mt-1">
              3D Wildfire Digital Twin & Multi-Scenario Simulation Lab
            </h1>
          </div>

          {/* THREE DATA MODES SELECTOR */}
          <div className="flex items-center p-1 rounded-xl bg-[#08150f] border border-[#1b3d2b] shadow-inner">
            <button
              onClick={() => setDataMode('HISTORICAL_REPLAY')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dataMode === 'HISTORICAL_REPLAY'
                  ? 'bg-[#1b3d2b] text-[#a3e635] shadow-sm border border-[#2e6849]'
                  : 'text-[#8b9f94] hover:text-[#f0fdf4]'
              }`}
            >
              <Clock size={13} />
              <span>HISTORICAL REPLAY</span>
            </button>
            <button
              onClick={() => setDataMode('LIVE_OBSERVATIONS')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dataMode === 'LIVE_OBSERVATIONS'
                  ? 'bg-[#1b3d2b] text-[#38bdf8] shadow-sm border border-[#2e6849]'
                  : 'text-[#8b9f94] hover:text-[#f0fdf4]'
              }`}
            >
              <Radio size={13} className={isLiveConnected ? 'text-[#38bdf8] animate-pulse' : 'text-[#8b9f94]'} />
              <span>LIVE OBSERVATIONS</span>
            </button>
            <button
              onClick={() => setDataMode('CUSTOM_SCENARIO')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dataMode === 'CUSTOM_SCENARIO'
                  ? 'bg-[#1b3d2b] text-[#facc15] shadow-sm border border-[#2e6849]'
                  : 'text-[#8b9f94] hover:text-[#f0fdf4]'
              }`}
            >
              <Sliders size={13} />
              <span>CUSTOM SCENARIO</span>
            </button>
          </div>
        </div>

        {/* Live Status & Data Provenance Bar */}
        <div className="p-3 rounded-xl bg-[#091510] border border-[#14281e] text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 text-[11px]">
            <span className="font-semibold text-[#8b9f94]">Data Readiness:</span>
            {dataMode === 'LIVE_OBSERVATIONS' ? (
              isLiveConnected ? (
                <span className="px-2 py-0.5 rounded bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-ping" />
                  <span>Open-Meteo & FIRMS Live In-Situ Telemetry</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-[#ef4444]/15 text-[#fca5a5] border border-[#ef4444]/30">
                  ⚠️ Live Feed Stale / Unreachable
                </span>
              )
            ) : dataMode === 'HISTORICAL_REPLAY' ? (
              <span className="px-2 py-0.5 rounded bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30">
                CAL FIRE FRAP Perimeters & DINS Verified Audit (No Fake Interpolation)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-[#f59e0b]/15 text-[#fbbf24] border border-[#f59e0b]/30">
                User-Adjusted Counterfactual Parameters (Decoupled from Observations)
              </span>
            )}
            <span className="text-[#55695e]">·</span>
            <span className="text-[#718579] font-mono">Refreshed: {lastRefreshTime}</span>
          </div>

          <div className="flex items-center gap-2">
            {dataMode === 'LIVE_OBSERVATIONS' && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#8b9f94]">
                <span>Poll:</span>
                <select
                  value={pollingIntervalSec}
                  onChange={e => setPollingIntervalSec(Number(e.target.value))}
                  className="px-2 py-0.5 rounded bg-[#070e0a] border border-[#1b3d2b] text-[10px] text-[#f0fdf4] font-mono"
                >
                  <option value={0}>Manual Only</option>
                  <option value={30}>Every 30s</option>
                  <option value={60}>Every 60s</option>
                  <option value={300}>Every 5m</option>
                </select>
              </div>
            )}
            <button
              onClick={() => {
                if (selectedLocation?.coordinates) {
                  const [lon, lat] = selectedLocation.coordinates
                  fetchLocationContext(lat, lon, analysisRadiusKm)
                }
              }}
              disabled={loadingContext}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#12241b] border border-[#1b3d2b] hover:bg-[#183626] text-[11px] text-[#4ade80] transition-colors"
            >
              <RefreshCw size={12} className={loadingContext ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. THREE-PANE PROFESSIONAL LAYOUT                                    */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ================================================================== */}
        {/* LEFT PANEL: LOCATION / INCIDENT / DATASET BROWSER (3 Cols)         */}
        {/* ================================================================== */}
        <div className="lg:col-span-3 space-y-4">
          <div className="tv-card p-3.5 space-y-3.5 border border-[#1b3d2b]">
            {/* 3 Entry Tabs */}
            <div className="flex items-center p-1 rounded-lg bg-[#070e0a] border border-[#14261d]">
              <button
                onClick={() => setSelectionTab('incident')}
                className={`flex-1 py-1 rounded text-[11px] font-bold text-center transition-all ${
                  selectionTab === 'incident'
                    ? 'bg-[#183626] text-[#a3e635] border border-[#22c55e]/40'
                    : 'text-[#8b9f94] hover:text-[#f0fdf4]'
                }`}
              >
                Incidents
              </button>
              <button
                onClick={() => setSelectionTab('location')}
                className={`flex-1 py-1 rounded text-[11px] font-bold text-center transition-all ${
                  selectionTab === 'location'
                    ? 'bg-[#183626] text-[#38bdf8] border border-[#38bdf8]/40'
                    : 'text-[#8b9f94] hover:text-[#f0fdf4]'
                }`}
              >
                Location
              </button>
              <button
                onClick={() => setSelectionTab('geojson')}
                className={`flex-1 py-1 rounded text-[11px] font-bold text-center transition-all ${
                  selectionTab === 'geojson'
                    ? 'bg-[#183626] text-[#facc15] border border-[#facc15]/40'
                    : 'text-[#8b9f94] hover:text-[#f0fdf4]'
                }`}
              >
                GeoJSON
              </button>
            </div>

            {/* TAB 1: INCIDENT SELECTION */}
            {selectionTab === 'incident' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-[#5b6f64]" />
                  <input
                    type="text"
                    value={fireSearch}
                    onChange={e => setFireSearch(e.target.value)}
                    placeholder="Search incident name or county..."
                    className="pl-8 pr-3 py-1.5 rounded-lg bg-[#070e0a] border border-[#1b3d2b] text-xs text-[#f0fdf4] placeholder-[#5b6f64] focus:outline-none focus:border-[#22c55e] w-full"
                  />
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                  {historicalFires
                    .filter(f =>
                      !fireSearch.trim() ||
                      f.name.toLowerCase().includes(fireSearch.toLowerCase()) ||
                      f.county.toLowerCase().includes(fireSearch.toLowerCase())
                    )
                    .map(f => {
                      const isSelected = f.id === selectedFireId
                      return (
                        <button
                          key={f.id}
                          onClick={() => {
                            setSelectedFireId(f.id)
                            setSelectedLocation({
                              id: `loc-${f.id}`,
                              name: `${f.name} Envelope`,
                              county: f.county,
                              coordinates: f.center_coordinates,
                              elevation_m: 540
                            })
                          }}
                          className={`w-full p-2.5 rounded-xl text-left transition-all border ${
                            isSelected
                              ? 'bg-[#0f2418] border-[#22c55e] shadow-md shadow-[#22c55e]/10'
                              : 'bg-[#091510] border-[#14261d] hover:border-[#1e3c2b]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#162e21] text-[#a3e635] font-bold">
                              {f.year}
                            </span>
                            <span className="text-[10px] font-mono text-[#f97316] font-bold">
                              {f.acres_burned?.toLocaleString()} ac
                            </span>
                          </div>
                          <div className="text-xs font-bold text-[#f0fdf4] mt-1">
                            {f.name}
                          </div>
                          <div className="text-[10px] text-[#718579] truncate">
                            {f.county}
                          </div>
                          {f.structures_destroyed > 0 && (
                            <div className="text-[10px] text-[#ef4444] font-mono mt-1">
                              {f.structures_destroyed.toLocaleString()} structures destroyed
                            </div>
                          )}
                        </button>
                      )
                    })}
                </div>
              </div>
            )}

            {/* TAB 2: LOCATION SEARCH & BUFFER RADIUS */}
            {selectionTab === 'location' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="text-[11px] text-[#8b9f94]">Place, City, or Coordinates:</div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={locationQuery}
                      onChange={e => setLocationQuery(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSearchLocations() }}
                      placeholder="e.g. 'Paradise', '39.75, -121.60'"
                      className="tv-input text-xs py-1.5 flex-1"
                    />
                    <button
                      onClick={handleSearchLocations}
                      className="px-3 py-1.5 rounded-lg bg-[#183626] border border-[#22c55e]/40 text-xs text-[#a3e635] font-bold hover:bg-[#1f4732]"
                    >
                      Search
                    </button>
                  </div>
                </div>

                {/* Analysis Buffer Radius Selector */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#8b9f94]">
                    <span>Analysis Radius:</span>
                    <span className="font-mono text-[#38bdf8] font-bold">{analysisRadiusKm} km</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={analysisRadiusKm}
                    onChange={e => setAnalysisRadiusKm(Number(e.target.value))}
                    className="w-full accent-[#38bdf8]"
                  />
                  <div className="flex justify-between text-[9px] text-[#55695e] font-mono">
                    <span>5 km</span>
                    <span>25 km</span>
                    <span>50 km</span>
                  </div>
                </div>

                {/* Search Results */}
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {locationSearchResults.map((loc: any) => (
                    <button
                      key={loc.id}
                      onClick={() => setSelectedLocation(loc)}
                      className={`w-full p-2 rounded-lg text-left transition-all border text-xs ${
                        selectedLocation?.id === loc.id
                          ? 'bg-[#0f2418] border-[#38bdf8] text-[#f0fdf4]'
                          : 'bg-[#070e0a] border-[#14261d] text-[#8b9f94] hover:border-[#1d3c2b]'
                      }`}
                    >
                      <div className="font-bold">{loc.name}</div>
                      <div className="text-[10px] text-[#5b6f64] font-mono">{loc.county} · Elev: {loc.elevation_m}m</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: GEOJSON PERIMETER IMPORTER */}
            {selectionTab === 'geojson' && (
              <div className="space-y-3">
                <div className="text-[11px] text-[#8b9f94]">
                  Upload GeoJSON file or paste polygon:
                </div>
                <input
                  type="file"
                  accept=".geojson,.json"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-[#8b9f94] file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border file:border-[#1b3d2b] file:bg-[#12241b] file:text-[#4ade80] file:text-[10px] file:cursor-pointer"
                />

                <textarea
                  rows={4}
                  value={geoJsonInputText}
                  onChange={e => setGeoJsonInputText(e.target.value)}
                  placeholder="Paste GeoJSON Polygon / Feature here..."
                  className="w-full p-2 rounded-lg bg-[#070e0a] border border-[#1b3d2b] text-[10px] font-mono text-[#cbd5d1] focus:outline-none focus:border-[#facc15]"
                />

                <button
                  onClick={() => handleValidateAndImportGeoJson()}
                  className="w-full py-1.5 rounded-lg bg-[#1b3d2b] border border-[#2e6849] hover:bg-[#255239] text-xs font-bold text-[#facc15] transition-colors"
                >
                  Validate & Overlay Geometry
                </button>

                {geoJsonError && (
                  <div className="p-2 rounded bg-[#ef4444]/15 border border-[#ef4444]/40 text-[10px] text-[#fca5a5]">
                    {geoJsonError}
                  </div>
                )}

                {geoJsonSummary && (
                  <div className="p-2.5 rounded bg-[#070e0a] border border-[#14261d] text-[10px] font-mono space-y-1 text-[#4ade80]">
                    <div>✓ Status: {geoJsonSummary.status}</div>
                    <div>Vertices: {geoJsonSummary.vertex_count}</div>
                    <div>Area: {geoJsonSummary.estimated_extent?.bbox_area_acres?.toLocaleString()} acres</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dataset Availability Checklist */}
          {locationContext?.data_readiness && (
            <div className="tv-card p-3 space-y-2 border border-[#14261d] text-xs">
              <div className="text-[11px] font-bold text-[#f0fdf4] flex items-center gap-1.5">
                <Database size={13} className="text-[#22c55e]" />
                <span>Geospatial Data Health</span>
              </div>
              <div className="space-y-1 font-mono text-[10px]">
                {Object.entries(locationContext.data_readiness).map(([k, v]: [string, any]) => (
                  <div key={k} className="flex items-center justify-between p-1 rounded bg-[#070e0a]">
                    <span className="text-[#8b9f94] capitalize">{k.replace('_', ' ')}</span>
                    <span className={`px-1.5 py-0.2 rounded ${
                      v.status === 'LIVE' ? 'text-[#4ade80] bg-[#162e21]' : 'text-[#facc15] bg-[#2b220d]'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* CENTER VIEWPORT: 3D DIGITAL TWIN CANVAS (6 Cols)                   */}
        {/* ================================================================== */}
        <div className="lg:col-span-6 space-y-3">
          {/* Main 3D Digital Twin Component */}
          <ThreeFireReconstruction
            fire={selectedFire}
            customGeoJson={customGeoJson}
            locationTarget={selectedLocation}
            currentSnapshotIndex={currentSnapshotIdx}
            burnSeverityVisible={burnSeverityVisible}
            structuresVisible={structuresVisible}
            infrastructureVisible={infrastructureVisible}
            weatherVectorsVisible={weatherVectorsVisible}
            windDirectionDeg={currentScenario.inputs.wind_dir_deg}
            windSpeedMph={currentScenario.inputs.wind_mph}
            layerMode={layerMode}
            layerOpacity={layerOpacity}
            elevationScale={elevationScale}
            performanceMode={performanceMode}
            spreadPolygons={activeSpreadSteps}
            onCoordinatesHover={setHoveredCoords}
          />

          {/* 3D Viewport Controls Toolbar */}
          <div className="p-3 rounded-xl bg-[#08150f] border border-[#1b3d2b] flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
            {/* Layer Mode Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#8b9f94]">Layer:</span>
              <select
                value={layerMode}
                onChange={e => setLayerMode(e.target.value as LayerMode)}
                className="px-2 py-1 rounded bg-[#070e0a] border border-[#1b3d2b] text-xs text-[#f0fdf4] font-medium"
              >
                <option value="burn_severity">Burn Severity (dNBR)</option>
                <option value="slope_aspect">Slope & Aspect Gradient</option>
                <option value="vegetation_fuel">Vegetation Fuel Bed</option>
                <option value="natural_imagery">Natural Topography</option>
              </select>
            </div>

            {/* Elevation Exaggeration Slider */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#8b9f94]">Relief:</span>
              <input
                type="range"
                min={0.5}
                max={3.0}
                step={0.5}
                value={elevationScale}
                onChange={e => setElevationScale(Number(e.target.value))}
                className="w-20 accent-[#22c55e]"
              />
              <span className="font-mono text-[10px] text-[#a3e635]">{elevationScale}x</span>
            </div>

            {/* Performance Mode Switch */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPerformanceMode(!performanceMode)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-colors ${
                  performanceMode
                    ? 'bg-[#facc15]/20 border-[#facc15] text-[#facc15]'
                    : 'bg-[#12241b] border-[#1b3d2b] text-[#8b9f94] hover:text-[#f0fdf4]'
                }`}
              >
                {performanceMode ? '⚡ Fast Mode' : 'High-Fi 3D'}
              </button>
            </div>
          </div>

          {/* TIMELINE CONTROLS (Active in Historical Replay Mode) */}
          {dataMode === 'HISTORICAL_REPLAY' && (
            <div className="tv-card p-3.5 space-y-3 border border-[#1b3d2b]">
              <div className="flex items-center justify-between pb-2 border-b border-[#172b22]">
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-[#a3e635]" />
                  <span className="text-xs font-bold text-[#f0fdf4]">
                    Historical Incident Timeline & SITSTAT Briefings
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold ${
                      isPlayingTimeline
                        ? 'bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#fca5a5]'
                        : 'bg-[#22c55e]/20 border border-[#22c55e]/40 text-[#86efac]'
                    }`}
                  >
                    {isPlayingTimeline ? <Pause size={12} /> : <Play size={12} />}
                    <span>{isPlayingTimeline ? 'Pause' : 'Play Timeline'}</span>
                  </button>
                  <button
                    onClick={() => setPlaybackSpeed(prev => (prev === 1 ? 2 : prev === 2 ? 4 : 1))}
                    className="px-2 py-1 rounded bg-[#12241b] border border-[#1b3d2b] text-[10px] font-mono text-[#38bdf8]"
                  >
                    {playbackSpeed}x
                  </button>
                </div>
              </div>

              {/* Timeline Snapshot Steps */}
              {selectedFire.timeline_snapshots && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {selectedFire.timeline_snapshots.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentSnapshotIdx(idx)
                        setIsPlayingTimeline(false)
                      }}
                      className={`p-1.5 rounded text-left transition-all border ${
                        idx === currentSnapshotIdx
                          ? 'bg-[#183626] border-[#22c55e] text-[#f0fdf4]'
                          : 'bg-[#070e0a] border-[#14261d] text-[#6c8275]'
                      }`}
                    >
                      <div className="text-[9px] font-mono text-[#a3e635]">T+{idx}</div>
                      <div className="text-[10px] font-bold truncate">{s.label.split(' ')[0]}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Active Snapshot Description Box */}
              {activeSnapshot && (
                <div className="p-2.5 rounded-lg bg-[#070e0a] border border-[#14261d] text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#f0fdf4]">
                    <span>{activeSnapshot.label}</span>
                    <span className="font-mono text-[#a3e635] text-[10px]">{activeSnapshot.data_quality}</span>
                  </div>
                  <p className="text-[11px] text-[#cbd5d1]">{activeSnapshot.description}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* RIGHT PANEL: MULTI-SCENARIO WORKSPACE & CONTROLS (3 Cols)          */}
        {/* ================================================================== */}
        <div className="lg:col-span-3 space-y-4">
          <div className="tv-card p-3.5 space-y-3.5 border border-[#1b3d2b]">
            <div className="flex items-center justify-between pb-2 border-b border-[#172b22]">
              <div className="flex items-center gap-1.5">
                <Sliders size={15} className="text-[#facc15]" />
                <h3 className="text-xs font-bold text-[#f0fdf4]">
                  Multi-Scenario Workspace
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#718579]">
                {scenarios.length}/4 Slots
              </span>
            </div>

            {/* Scenario Slot Tabs */}
            <div className="grid grid-cols-2 gap-1.5">
              {scenarios.map(s => {
                const isActive = s.id === activeScenarioId
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveScenarioId(s.id)}
                    className={`p-2 rounded-lg text-left transition-all border ${
                      isActive
                        ? 'bg-[#183626] border-[#facc15] text-[#f0fdf4]'
                        : 'bg-[#070e0a] border-[#14261d] text-[#8b9f94] hover:border-[#1e3c2b]'
                    }`}
                  >
                    <div className="text-[10px] font-mono font-bold uppercase text-[#a3e635]">
                      {s.id.replace('_', ' ')}
                    </div>
                    <div className="text-[11px] font-bold truncate mt-0.5">{s.name.split('·')[0]}</div>
                    {s.danger_score !== undefined && (
                      <div className="text-[10px] font-mono font-bold text-[#ef4444] mt-0.5">
                        Score: {s.danger_score}/100
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Scenario Inputs for Active Slot */}
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <div className="text-[10px] text-[#8b9f94] uppercase font-mono">Scenario Name:</div>
                <input
                  type="text"
                  value={currentScenario.name}
                  onChange={e => {
                    const val = e.target.value
                    setScenarios(prev => prev.map(sc => sc.id === activeScenarioId ? { ...sc, name: val } : sc))
                  }}
                  className="tv-input text-xs py-1"
                />
              </div>

              {/* Wind Speed & Direction */}
              <div className="p-2.5 rounded-lg bg-[#070e0a] border border-[#14261d] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#f0fdf4]">
                  <span className="flex items-center gap-1 text-[#38bdf8]">
                    <Wind size={13} />
                    <span>Wind Velocity</span>
                  </span>
                  <span className="font-mono text-[#38bdf8]">{currentScenario.inputs.wind_mph} mph</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={currentScenario.inputs.wind_mph}
                  onChange={e => updateActiveScenarioInput('wind_mph', Number(e.target.value))}
                  className="w-full accent-[#38bdf8]"
                />
                <div className="flex items-center justify-between text-[10px] text-[#718579] font-mono">
                  <span>Direction: {currentScenario.inputs.wind_dir_deg}°</span>
                  <input
                    type="range"
                    min={0}
                    max={359}
                    step={15}
                    value={currentScenario.inputs.wind_dir_deg}
                    onChange={e => updateActiveScenarioInput('wind_dir_deg', Number(e.target.value))}
                    className="w-24 accent-[#38bdf8]"
                  />
                </div>
              </div>

              {/* Temperature & Humidity */}
              <div className="p-2.5 rounded-lg bg-[#070e0a] border border-[#14261d] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#f0fdf4]">
                  <span className="flex items-center gap-1 text-[#ef4444]">
                    <Thermometer size={13} />
                    <span>Air Temp & RH</span>
                  </span>
                  <span className="font-mono text-[#fca5a5]">
                    {currentScenario.inputs.temp_c}°C · {currentScenario.inputs.rh_pct}% RH
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[9px] text-[#6b8073]">Temp (°C):</div>
                    <input
                      type="number"
                      min={10}
                      max={48}
                      value={currentScenario.inputs.temp_c}
                      onChange={e => updateActiveScenarioInput('temp_c', Number(e.target.value))}
                      className="tv-input text-xs py-1"
                    />
                  </div>
                  <div>
                    <div className="text-[9px] text-[#6b8073]">RH (%):</div>
                    <input
                      type="number"
                      min={3}
                      max={90}
                      value={currentScenario.inputs.rh_pct}
                      onChange={e => updateActiveScenarioInput('rh_pct', Number(e.target.value))}
                      className="tv-input text-xs py-1"
                    />
                  </div>
                </div>
              </div>

              {/* Tactical Mitigation Intervention */}
              <div className="space-y-1">
                <div className="text-[10px] text-[#8b9f94] uppercase font-mono">Tactical Intervention:</div>
                <select
                  value={currentScenario.inputs.intervention}
                  onChange={e => updateActiveScenarioInput('intervention', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-[#070e0a] border border-[#1b3d2b] text-xs text-[#f0fdf4]"
                >
                  {INTERVENTIONS_LIST.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Slot Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleDuplicateScenario(currentScenario)}
                  className="flex-1 py-1 rounded bg-[#12241b] border border-[#1b3d2b] hover:bg-[#183626] text-[10px] text-[#4ade80] flex items-center justify-center gap-1"
                >
                  <Copy size={11} />
                  <span>Duplicate Slot</span>
                </button>
                <button
                  onClick={handleResetActiveScenario}
                  className="px-2 py-1 rounded bg-[#12241b] border border-[#1b3d2b] hover:bg-[#183626] text-[10px] text-[#8b9f94]"
                  title="Reset to Baseline"
                >
                  <RotateCcw size={11} />
                </button>
                {activeScenarioId !== 'baseline' && (
                  <button
                    onClick={() => handleDeleteScenario(activeScenarioId)}
                    className="px-2 py-1 rounded bg-[#2b1717] border border-[#3b1d1d] hover:bg-[#3b1d1d] text-[10px] text-[#ef4444]"
                    title="Delete Slot"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>

              {/* Run Multi-Scenario Simulation Button */}
              <button
                onClick={handleRunMultiSimulation}
                disabled={simulatingScenarios}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#183626] to-[#22c55e] hover:from-[#1e4631] hover:to-[#2ee56f] text-xs font-bold text-[#050c09] shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {simulatingScenarios ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Executing Scenarios...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    <span>Simulate All Scenarios ({scenarios.length})</span>
                  </>
                )}
              </button>

              {simulationError && (
                <div className="p-2 rounded bg-[#ef4444]/15 border border-[#ef4444]/40 text-[10px] text-[#fca5a5]">
                  {simulationError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. MULTI-SCENARIO SIDE-BY-SIDE COMPARISON DASHBOARD                 */}
      {/* ==================================================================== */}
      <div className="tv-card space-y-4 border border-[#1b3d2b]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#172b22]">
          <div className="flex items-center gap-2">
            <GitCompare size={17} className="text-[#38bdf8]" />
            <h2 className="text-sm font-bold text-[#f0fdf4]">
              Multi-Scenario Comparative Sensitivity Analysis
            </h2>
          </div>
          {/* Mandatory Non-Forecast Legal Banner */}
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2b1f09] text-[#facc15] border border-[#facc15]/30">
            ILLUSTRATIVE SCENARIO — NOT A VALIDATED FIRE-SPREAD FORECAST
          </span>
        </div>

        {/* Side-by-Side Scenario Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {scenarios.map(s => {
            const isBase = s.id === 'baseline'
            return (
              <div
                key={s.id}
                className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                  s.id === activeScenarioId
                    ? 'bg-[#0e2116] border-[#22c55e]'
                    : 'bg-[#070e0a] border-[#14261d]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#162e21] text-[#a3e635] font-bold uppercase">
                    {s.id.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-mono text-[#718579]">
                    {s.status}
                  </span>
                </div>

                <div className="font-bold text-[#f0fdf4] text-xs truncate">{s.name}</div>

                <div className="p-2 rounded-lg bg-[#050c09] border border-[#14261d] space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#8b9f94]">Danger Score:</span>
                    <b className="text-[#ef4444]">{s.danger_score ?? 60}/100</b>
                  </div>
                  {s.comparison_to_baseline && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[#8b9f94]">Delta vs Base:</span>
                      <span className={s.comparison_to_baseline.score_delta > 0 ? 'text-[#ef4444]' : 'text-[#4ade80]'}>
                        {s.comparison_to_baseline.score_delta > 0 ? '+' : ''}{s.comparison_to_baseline.score_delta} pts
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[#8b9f94]">VPD Atmospheric Suction:</span>
                    <span className="text-[#38bdf8]">{s.physical_parameters?.vapor_pressure_deficit_kpa ?? 2.8} kPa</span>
                  </div>
                </div>

                <div className="text-[10px] text-[#718579] space-y-0.5">
                  <div>Wind: {s.inputs.wind_mph} mph @ {s.inputs.wind_dir_deg}°</div>
                  <div>Temp: {s.inputs.temp_c}°C · RH: {s.inputs.rh_pct}%</div>
                  <div className="truncate">Action: {s.inputs.intervention}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Recharts Bar Chart Comparison */}
        {scenarioChartData.length > 1 && (
          <div className="h-60 w-full bg-[#050c09] p-3 rounded-xl border border-[#14261d]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scenarioChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#14261d" />
                <XAxis dataKey="name" stroke="#6b8073" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#6b8073" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#091510',
                    borderColor: '#1f382c',
                    borderRadius: '8px',
                    color: '#f0fdf4'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#8b9f94' }} />
                <Bar dataKey="danger" name="Danger Index (0-100)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fuelDryness" name="Fuel Dryness" fill="#facc15" radius={[4, 4, 0, 0]} />
                <Bar dataKey="windHazard" name="Wind Hazard" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 4. SCIENTIFIC TRANSPARENCY & METHOD DISCLOSURE                      */}
      {/* ==================================================================== */}
      <div className="p-3.5 rounded-xl bg-[#070e0a] border border-[#14261d] text-xs space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#f0fdf4]">
          <Info size={14} className="text-[#38bdf8]" />
          <span>Scientific Governance & Modeling Transparency</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-[#8b9f94]">
          <div className="p-2.5 rounded bg-[#091510] border border-[#14261d] space-y-1">
            <b className="text-[#a3e635]">Type 1: Environmental Sensitivity</b>
            <p>Tetens (1930) Vapor Pressure Deficit + Simard/Rothermel (1968) 100-hour fuel moisture equilibrium. Evaluates physical fuel dryness & atmospheric stress.</p>
          </div>
          <div className="p-2.5 rounded bg-[#091510] border border-[#14261d] space-y-1">
            <b className="text-[#facc15]">Type 2: Spatial Visualization</b>
            <p>ELLIPTICAL_HEURISTIC_V1 downwind length-to-breadth projection based on wind and slope. Approximate tactical sketch, NOT a full physical FARSITE PDE simulation.</p>
          </div>
          <div className="p-2.5 rounded bg-[#091510] border border-[#14261d] space-y-1">
            <b className="text-[#38bdf8]">Type 3: Validated Spread PDE Adapter</b>
            <p>Huygens wavelet & Rothermel 2D propagation solver interface. Status: Adapter defined (Requires HPC deployment with 30m gridded LANDFIRE fuel rasters).</p>
          </div>
        </div>
      </div>
    </div>
  )
}
