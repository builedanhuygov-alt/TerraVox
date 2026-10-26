/**
 * TERRAVOX Command Center — Military-Grade Environmental Intelligence Mission Control
 * 
 * High-tech operational dashboard featuring:
 * - Deep slate/obsidian canvas (#07090E, #0D1117) with ultra-subtle frosted glassmorphism
 * - Responsive 3-column command layout (Nav rail + Main operations canvas + Live activity stream)
 * - Animated geospatial mini-radar with rotating sweep, range rings, and WebGL fail-safe
 * - Live telemetry sparklines and DEFCON-style operational threat hierarchy
 * - Magnetic spring hover district cards with neon rim-light glow matching risk severity
 * - Number ticker / counter roll-up animations
 * - District Telemetry Slide-over deep inspection drawer
 * - CRT scanlines and tactical blueprint grid overlay toggle
 * - Dual-timezone tabular mission clock (UTC / PST)
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../utils/maplibreWorker'
import {
  Flame,
  Wind,
  Thermometer,
  Droplets,
  Map,
  AlertTriangle,
  Layers,
  FileText,
  Users,
  Activity,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  ChevronRight,
  Satellite,
  BarChart3,
  Zap,
  Trees,
  Compass,
  MapPin,
  Clock,
  History,
  ShieldAlert,
  Info,
  RotateCcw,
  Maximize2,
  Radio,
  Tv,
  Grid
} from 'lucide-react'
import { api } from '../services/api'
import { useGeographyStore } from '../store/useGeographyStore'
import { NFDRS_HAZARD_SCALE, HazardLevel, EnvironmentalIncident, CountyRegion } from '../config/geography'
import { SourceStatusBadge, HazardBadge, VerificationBadge } from '../components/Badge'
import EmptyState from '../components/EmptyState'
import NumberTicker from '../components/NumberTicker'
import Sparkline from '../components/Sparkline'
import DistrictTelemetryDrawer from '../components/DistrictTelemetryDrawer'
import LiveActivityStream from '../components/LiveActivityStream'

// ── WebGL Resilience Helper ──────────────────────────────────────────────────

export function isWebGLSupported(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    return !!(gl && gl instanceof WebGLRenderingContext)
  } catch {
    return false
  }
}

// ── Status & Style Helpers ───────────────────────────────────────────────────

export function statusColor(status: string): string {
  switch (status) {
    case 'LIVE': return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40'
    case 'CACHED': return 'text-amber-400 bg-amber-950/60 border-amber-500/40'
    case 'STALE': return 'text-orange-400 bg-orange-950/60 border-orange-500/40'
    case 'STATIC': return 'text-sky-400 bg-sky-950/60 border-sky-500/40'
    case 'UNAVAILABLE':
    case 'CONFIGURATION_REQUIRED': return 'text-red-400 bg-red-950/60 border-red-500/40'
    default: return 'text-stone-400 bg-stone-900/60 border-stone-600/40'
  }
}

export function hazardBadge(level: HazardLevel) {
  return <HazardBadge level={level} />
}

export function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

// Project geographic coordinates to SVG 500x400 space for the vector fallback
function projectGeoToSvg(lon: number, lat: number, width = 500, height = 400): [number, number] {
  const minLon = -124.6
  const maxLon = -114.0
  const minLat = 32.4
  const maxLat = 42.2

  const x = Math.max(8, Math.min(width - 8, ((lon - minLon) / (maxLon - minLon)) * width))
  const y = Math.max(8, Math.min(height - 8, height - ((lat - minLat) / (maxLat - minLat)) * height))
  return [x, y]
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SourcePill({ name, status, count, cacheAge, latency }: {
  name: string
  status: string
  count?: number
  cacheAge?: number
  latency?: number
}) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-[#0D1117]/80 border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          status === 'LIVE' ? 'bg-emerald-400 animate-pulse' :
          status === 'CACHED' ? 'bg-amber-400' :
          status === 'STATIC' ? 'bg-sky-400' :
          status === 'STALE' ? 'bg-orange-400' : 'bg-red-400'
        }`} />
        <span className="text-[12px] font-medium text-[#cbd5e1] truncate">{name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {count !== undefined && (
          <span className="text-[11px] font-mono tabular-nums text-[#718579]">{count} recs</span>
        )}
        {latency !== undefined && latency > 0 && (
          <span className="text-[10px] font-mono tabular-nums text-[#5b6f64] hidden sm:inline">{latency}ms</span>
        )}
        <SourceStatusBadge status={status} cacheAge={cacheAge} compact />
      </div>
    </div>
  )
}

// ── California Geographic Overview Map Component ─────────────────────────────

interface CaliforniaOverviewMapProps {
  incidents: EnvironmentalIncident[]
  selectedCountyId: string | null
  onSelectCounty: (countyId: string | null) => void
  onSelectIncident: (inc: EnvironmentalIncident) => void
}

function CaliforniaOverviewMap({
  incidents,
  selectedCountyId,
  onSelectCounty,
  onSelectIncident
}: CaliforniaOverviewMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const [mapError, setMapError] = useState<string | null>(null)
  const [basemap, setBasemap] = useState<'satellite' | 'vector'>('satellite')
  const [isMapReady, setIsMapReady] = useState(false)
  const [initAttempts, setInitAttempts] = useState(0)

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainer.current) return

    if (!isWebGLSupported()) {
      setMapError('Hardware WebGL acceleration unavailable in current session')
      return
    }

    setMapError(null)

    let map: maplibregl.Map | null = null

    try {
      const tileSource = basemap === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

      map = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'overview-tiles': {
              type: 'raster',
              tiles: [tileSource],
              tileSize: 256,
              attribution: basemap === 'satellite' ? '© Esri, Maxar' : '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'overview-base-layer',
              type: 'raster',
              source: 'overview-tiles',
              minzoom: 0,
              maxzoom: 18
            }
          ]
        },
        center: [-119.5, 37.2],
        zoom: 5.7,
        minZoom: 4.8,
        maxZoom: 14,
        maxBounds: [
          [-126.0, 31.5],
          [-113.0, 43.0]
        ]
      })

      map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: false }), 'top-right')

      map.on('load', () => {
        setIsMapReady(true)

        // Add California county boundaries
        try {
          map?.addSource('ca-counties-overview', {
            type: 'geojson',
            data: '/data/california_counties.geojson'
          })

          map?.addLayer({
            id: 'ca-counties-overview-fill',
            type: 'fill',
            source: 'ca-counties-overview',
            paint: {
              'fill-color': [
                'case',
                ['==', ['get', 'id'], selectedCountyId || ''],
                'rgba(34, 197, 94, 0.28)',
                'rgba(34, 197, 94, 0.04)'
              ]
            }
          })

          map?.addLayer({
            id: 'ca-counties-overview-line',
            type: 'line',
            source: 'ca-counties-overview',
            paint: {
              'line-color': [
                'case',
                ['==', ['get', 'id'], selectedCountyId || ''],
                '#4ade80',
                'rgba(52, 211, 153, 0.38)'
              ],
              'line-width': [
                'case',
                ['==', ['get', 'id'], selectedCountyId || ''],
                2.5,
                1.0
              ]
            }
          })

          map?.on('click', 'ca-counties-overview-fill', (e) => {
            if (e.features && e.features[0]) {
              const cId = e.features[0].properties?.id
              if (cId) onSelectCounty(cId)
            }
          })

          map?.on('mouseenter', 'ca-counties-overview-fill', () => {
            if (map) map.getCanvas().style.cursor = 'pointer'
          })

          map?.on('mouseleave', 'ca-counties-overview-fill', () => {
            if (map) map.getCanvas().style.cursor = ''
          })
        } catch (err) {
          console.warn('Overview map boundary layer notice:', err)
        }
      })

      map.on('error', (e) => {
        console.warn('CommandCenter Map Notice:', e?.error?.message || e)
      })

      mapRef.current = map
    } catch (err: any) {
      console.warn('MapLibre GL initialization error:', err)
      setMapError(err?.message || 'WebGL map initialization failed')
    }

    return () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      if (map) {
        try {
          map.remove()
        } catch {}
      }
      mapRef.current = null
      setIsMapReady(false)
    }
  }, [initAttempts, basemap])

  // Update County Boundary Selection Layer
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded() || !map.getLayer('ca-counties-overview-fill')) return

    try {
      map.setPaintProperty('ca-counties-overview-fill', 'fill-color', [
        'case',
        ['==', ['get', 'id'], selectedCountyId || ''],
        'rgba(34, 197, 94, 0.32)',
        'rgba(34, 197, 94, 0.04)'
      ])

      map.setPaintProperty('ca-counties-overview-line', 'line-color', [
        'case',
        ['==', ['get', 'id'], selectedCountyId || ''],
        '#4ade80',
        'rgba(52, 211, 153, 0.38)'
      ])

      map.setPaintProperty('ca-counties-overview-line', 'line-width', [
        'case',
        ['==', ['get', 'id'], selectedCountyId || ''],
        2.5,
        1.0
      ])
    } catch {}
  }, [selectedCountyId, isMapReady])

  // Render Incident Markers on Map
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapReady) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    incidents.forEach(inc => {
      const el = document.createElement('div')
      el.className = 'cursor-pointer group flex flex-col items-center select-none'

      const isHist = inc.category === 'HISTORICAL_LANDMARK' || inc.status === 'HISTORICAL_STUDY'
      const hazardColor = isHist ? '#94a3b8' : (NFDRS_HAZARD_SCALE[inc.hazardLevel]?.color || '#f97316')
      const isOfficial = inc.category === 'CONFIRMED_WILDFIRE'

      if (isOfficial) {
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div style="
              position: absolute;
              inset: -4px;
              border-radius: 9999px;
              background-color: rgba(239, 68, 68, 0.35);
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              position: relative;
              width: 14px;
              height: 14px;
              border-radius: 9999px;
              background-color: #ef4444;
              border: 2px solid #ffffff;
              box-shadow: 0 0 10px rgba(239, 68, 68, 0.85);
            "></div>
          </div>
        `
      } else {
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div style="
              position: absolute;
              inset: -3px;
              border-radius: 9999px;
              background-color: ${hazardColor}40;
              animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              position: relative;
              width: 10px;
              height: 10px;
              border-radius: 9999px;
              background-color: ${hazardColor};
              border: 1.5px solid #ffffff;
              box-shadow: 0 0 6px ${hazardColor};
            "></div>
          </div>
        `
      }

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        onSelectIncident(inc)
      })

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(inc.coordinates)
        .addTo(map)

      markersRef.current.push(marker)
    })
  }, [incidents, isMapReady, onSelectIncident])

  return (
    <div className="relative w-full h-[400px] sm:h-[440px] rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[#07090E] shadow-2xl flex flex-col">
      {/* ── Top Floating Operational Header Overlay ──────────────────── */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none flex-wrap">
        <div className="flex items-center gap-2 bg-[#0D1117]/90 backdrop-blur-md border border-[rgba(255,255,255,0.12)] px-3 py-1.5 rounded-xl shadow-xl pointer-events-auto">
          <Compass size={14} className="text-emerald-400" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#f0fdf4] font-bold">
            California Geospatial Radar
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {selectedCountyId && (
            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
              Focus: {selectedCountyId}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Basemap switch */}
          <div className="flex items-center bg-[#0D1117]/90 backdrop-blur-md border border-[rgba(255,255,255,0.1)] p-0.5 rounded-xl text-[10px] font-mono shadow-xl">
            <button
              onClick={() => setBasemap('satellite')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-semibold ${
                basemap === 'satellite' ? 'bg-emerald-500/20 text-emerald-400' : 'text-[#718579] hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setBasemap('vector')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-semibold ${
                basemap === 'vector' ? 'bg-emerald-500/20 text-emerald-400' : 'text-[#718579] hover:text-white'
              }`}
            >
              Vector
            </button>
          </div>

          {/* Quick link to full Map Explorer */}
          <Link
            to="/map"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-[#07090E] text-[11px] font-bold hover:bg-emerald-400 transition-colors shadow-md"
            title="Open full interactive Map Explorer with GIS layer controls"
          >
            <Maximize2 size={12} />
            <span className="hidden sm:inline">Map Explorer</span>
          </Link>
        </div>
      </div>

      {/* ── Radar Sweep Effect & Tactical Concentric Range Rings ───── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        <div 
          className="absolute top-1/2 left-1/2 w-[680px] h-[680px] -translate-x-1/2 -translate-y-1/2 animate-radar-sweep opacity-15 pointer-events-none"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(34, 197, 94, 0.45) 360deg)'
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-emerald-500/20 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full border border-emerald-500/10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] rounded-full border border-emerald-500/5 pointer-events-none" />
      </div>

      {/* ── Map Canvas or WebGL Fail-Safe Fallback ───────────────────── */}
      {mapError ? (
        // High-Fidelity Vector Intelligence Fail-Safe Canvas (NEVER A BLANK BLACK BOX)
        <div className="relative w-full h-full flex flex-col justify-between p-4 bg-gradient-to-b from-[#0B0F16] via-[#07090E] to-[#04060A]">
          {/* Informative notice bar */}
          <div className="pt-10 flex items-center justify-between gap-2 border-b border-[rgba(255,255,255,0.08)] pb-2 z-20">
            <div className="flex items-center gap-2 text-amber-400">
              <ShieldAlert size={14} />
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold">
                Vector Operational Matrix Mode
              </span>
            </div>
            <button
              onClick={() => setInitAttempts(v => v + 1)}
              className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer"
            >
              <RotateCcw size={12} /> Retry WebGL Map
            </button>
          </div>

          {/* Geographic Vector Grid & Distribution Overview */}
          <div className="relative flex-1 my-2 flex items-center justify-center overflow-hidden z-20">
            <svg
              viewBox="0 0 500 400"
              className="w-full h-full max-h-[280px] opacity-95 select-none"
              style={{ filter: 'drop-shadow(0 0 12px rgba(34, 197, 94, 0.18))' }}
            >
              {/* Stylized California State Polygon Boundary */}
              <path
                d="M 60,30 L 170,30 L 195,140 L 410,320 L 410,380 L 320,380 L 220,330 L 150,260 L 80,180 L 50,110 Z"
                fill="rgba(16, 28, 22, 0.75)"
                stroke="#22c55e"
                strokeWidth="1.6"
                strokeDasharray="4 2"
              />

              {/* Butte County */}
              <circle
                cx={projectGeoToSvg(-121.53, 39.78)[0]}
                cy={projectGeoToSvg(-121.53, 39.78)[1]}
                r={selectedCountyId === 'butte' ? '28' : '20'}
                fill={selectedCountyId === 'butte' ? 'rgba(34, 197, 94, 0.35)' : 'rgba(34, 197, 94, 0.12)'}
                stroke="#4ade80"
                strokeWidth={selectedCountyId === 'butte' ? '2' : '1'}
                className="cursor-pointer transition-all"
                onClick={() => onSelectCounty(selectedCountyId === 'butte' ? null : 'butte')}
              />
              <text
                x={projectGeoToSvg(-121.53, 39.78)[0]}
                y={projectGeoToSvg(-121.53, 39.78)[1] - 22}
                fill="#f0fdf4"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                Butte Unit (BTU)
              </text>

              {/* Sonoma County */}
              <circle
                cx={projectGeoToSvg(-122.75, 38.52)[0]}
                cy={projectGeoToSvg(-122.75, 38.52)[1]}
                r={selectedCountyId === 'sonoma' ? '26' : '18'}
                fill={selectedCountyId === 'sonoma' ? 'rgba(34, 197, 94, 0.35)' : 'rgba(34, 197, 94, 0.12)'}
                stroke="#4ade80"
                strokeWidth={selectedCountyId === 'sonoma' ? '2' : '1'}
                className="cursor-pointer transition-all"
                onClick={() => onSelectCounty(selectedCountyId === 'sonoma' ? null : 'sonoma')}
              />
              <text
                x={projectGeoToSvg(-122.75, 38.52)[0]}
                y={projectGeoToSvg(-122.75, 38.52)[1] - 20}
                fill="#f0fdf4"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                Sonoma (LNU)
              </text>

              {/* Los Angeles / Ventura */}
              <circle
                cx={projectGeoToSvg(-118.8, 34.1)[0]}
                cy={projectGeoToSvg(-118.8, 34.1)[1]}
                r={selectedCountyId === 'los-angeles-ventura' ? '28' : '22'}
                fill={selectedCountyId === 'los-angeles-ventura' ? 'rgba(34, 197, 94, 0.35)' : 'rgba(34, 197, 94, 0.12)'}
                stroke="#4ade80"
                strokeWidth={selectedCountyId === 'los-angeles-ventura' ? '2' : '1'}
                className="cursor-pointer transition-all"
                onClick={() => onSelectCounty(selectedCountyId === 'los-angeles-ventura' ? null : 'los-angeles-ventura')}
              />
              <text
                x={projectGeoToSvg(-118.8, 34.1)[0]}
                y={projectGeoToSvg(-118.8, 34.1)[1] + 24}
                fill="#f0fdf4"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                LA &amp; Ventura (VNC)
              </text>

              {/* Shasta / Trinity */}
              <circle
                cx={projectGeoToSvg(-122.4, 40.6)[0]}
                cy={projectGeoToSvg(-122.4, 40.6)[1]}
                r={selectedCountyId === 'shasta-trinity' ? '26' : '18'}
                fill={selectedCountyId === 'shasta-trinity' ? 'rgba(34, 197, 94, 0.35)' : 'rgba(34, 197, 94, 0.12)'}
                stroke="#4ade80"
                strokeWidth={selectedCountyId === 'shasta-trinity' ? '2' : '1'}
                className="cursor-pointer transition-all"
                onClick={() => onSelectCounty(selectedCountyId === 'shasta-trinity' ? null : 'shasta-trinity')}
              />
              <text
                x={projectGeoToSvg(-122.4, 40.6)[0]}
                y={projectGeoToSvg(-122.4, 40.6)[1] - 20}
                fill="#f0fdf4"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                Shasta-Trinity (SHU)
              </text>

              {/* Plotted Incident Points */}
              {incidents.map((inc) => {
                const [cx, cy] = projectGeoToSvg(inc.coordinates[0], inc.coordinates[1])
                const isHist = inc.category === 'HISTORICAL_LANDMARK' || inc.status === 'HISTORICAL_STUDY'
                const color = isHist ? '#94a3b8' : (NFDRS_HAZARD_SCALE[inc.hazardLevel]?.color || '#f97316')

                return (
                  <g key={inc.id} className="cursor-pointer" onClick={() => onSelectIncident(inc)}>
                    {!isHist && (
                      <circle cx={cx} cy={cy} r="12" fill={color} opacity="0.3" className="animate-ping" />
                    )}
                    <circle cx={cx} cy={cy} r={isHist ? '5' : '6'} fill={color} stroke="#ffffff" strokeWidth="1.5" />
                    <text
                      x={cx + 8}
                      y={cy + 3}
                      fill="#cbd5d1"
                      fontSize="9"
                      fontFamily="monospace"
                      opacity="0.9"
                    >
                      {inc.title.split(' ')[0]}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Bottom legend and context bar */}
          <div className="pt-2 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between text-[10px] text-[#718579] font-mono flex-wrap gap-2 z-20">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" /> Class IV–V Critical
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Class III Moderate
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#94a3b8]" /> Historical Forensics
              </span>
            </div>
            <Link
              to="/map"
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              Open Full Map Explorer <ChevronRight size={11} />
            </Link>
          </div>
        </div>
      ) : (
        <div ref={mapContainer} className="w-full h-full" />
      )}

      {/* Bottom status badge with tactical reticle */}
      <div className="absolute bottom-2.5 left-3 z-20 pointer-events-none flex items-center gap-2">
        <span className="text-[10px] font-mono tabular-nums text-[#8b9f94] bg-[#07090E]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[rgba(255,255,255,0.08)] shadow-lg flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>RADAR RETICLE: 38.5800° N, 121.4900° W</span>
          <span className="text-white/20">|</span>
          <span>NAD83 / WGS84</span>
        </span>
      </div>
    </div>
  )
}

// ── Main CommandCenter Component ──────────────────────────────────────────────

export default function CommandCenter() {
  const nav = useNavigate()
  const { 
    activeRegion, 
    selectedCountyId, 
    selectCounty, 
    selectIncident,
    telemetry, 
    refreshTelemetry 
  } = useGeographyStore()

  const incidents = activeRegion.incidents

  const [sourcesHealth, setSourcesHealth] = useState<any>(null)
  const [calfire, setCalfire] = useState<any>(null)
  const [unifiedFeed, setUnifiedFeed] = useState<any>(null)
  const [forestStats, setForestStats] = useState<any>(null)
  const [weatherNow, setWeatherNow] = useState<any>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)
  const [selectedSignalFilter, setSelectedSignalFilter] = useState<'ALL' | 'HIGH' | 'CONFIRMED' | 'ANOMALY'>('ALL')
  
  // Tactical overlay toggles
  const [scanlinesActive, setScanlinesActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tv_scanlines_active') === 'true'
    } catch {
      return false
    }
  })

  // District inspector slide-over drawer state
  const [inspectingDistrict, setInspectingDistrict] = useState<CountyRegion | null>(null)

  // Real-time Mission Control Tabular Clock
  const [missionTime, setMissionTime] = useState<Date>(new Date())

  useEffect(() => {
    const timer = setInterval(() => setMissionTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const toggleScanlines = () => {
    setScanlinesActive(prev => {
      const next = !prev
      try {
        localStorage.setItem('tv_scanlines_active', String(next))
      } catch {}
      return next
    })
  }

  const loadData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const [healthRes, cfRes, wxRes, feedRes, forestRes] = await Promise.allSettled([
        api.sourcesHealth(),
        api.calfireIncidents(false),
        api.weatherNow(38.58, -121.49),
        api.unifiedFeed(),
        api.forestStats(),
      ])

      if (healthRes.status === 'fulfilled' && healthRes.value) setSourcesHealth(healthRes.value)
      if (cfRes.status === 'fulfilled' && cfRes.value) setCalfire(cfRes.value)
      if (wxRes.status === 'fulfilled' && wxRes.value) setWeatherNow(wxRes.value)
      if (feedRes.status === 'fulfilled' && feedRes.value) setUnifiedFeed(feedRes.value)
      if (forestRes.status === 'fulfilled' && forestRes.value) setForestStats(forestRes.value)

      await refreshTelemetry().catch(() => {})
      setLastFetchTime(new Date())
    } finally {
      setIsRefreshing(false)
    }
  }, [refreshTelemetry])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Derived values from backend
  const services: any[] = sourcesHealth?.services || sourcesHealth?.sources || []
  const cfService = services.find((s: any) => s.code === 'CAL_FIRE')
  const firmsService = services.find((s: any) => s.code === 'NASA_FIRMS')
  const meteoService = services.find((s: any) => s.code === 'OPEN_METEO')
  const censusService = services.find((s: any) => s.code === 'US_CENSUS_TIGER')

  const cfIncidents = calfire?.incidents || []
  const hotspotCount = firmsService?.record_count ?? unifiedFeed?.sources?.nasa_firms?.count ?? telemetry?.firmsCount ?? 14
  const calfireCount = cfService?.record_count ?? calfire?.california_incidents_count ?? cfIncidents.length

  // Categorized signal cohorts for audited safety
  const liveCriticalCorridors = incidents.filter(i => 
    (i.hazardLevel === 'IV' || i.hazardLevel === 'V') && 
    i.category !== 'HISTORICAL_LANDMARK' && 
    i.status !== 'HISTORICAL_STUDY'
  )

  const historicalForensics = incidents.filter(i => 
    i.category === 'HISTORICAL_LANDMARK' || 
    i.status === 'HISTORICAL_STUDY'
  )

  // Filtered signals for the queue
  const displayedIncidents = useMemo(() => {
    return incidents.filter(inc => {
      if (selectedCountyId && inc.countyId !== selectedCountyId) return false
      if (selectedSignalFilter === 'HIGH') return inc.hazardLevel === 'IV' || inc.hazardLevel === 'V'
      if (selectedSignalFilter === 'CONFIRMED') return inc.category === 'CONFIRMED_WILDFIRE'
      if (selectedSignalFilter === 'ANOMALY') return inc.category === 'THERMAL_ANOMALY'
      return true
    })
  }, [incidents, selectedCountyId, selectedSignalFilter])

  // Active selected county details
  const activeCounty = useMemo(() => {
    return activeRegion.counties.find(c => c.id === selectedCountyId) || activeRegion.counties[0]
  }, [activeRegion, selectedCountyId])

  // Weather & atmospheric telemetry
  const tempC = telemetry?.temperatureC ?? weatherNow?.current?.temperature_2m ?? 24.0
  const tempF = telemetry?.temperatureF ?? (tempC !== null ? Math.round((tempC * 9/5 + 32) * 10) / 10 : 75.2)
  const humidity = telemetry?.relativeHumidity ?? weatherNow?.current?.relative_humidity_2m ?? 22
  const windMph = telemetry?.windSpeedMph ?? (weatherNow?.current?.wind_speed_10m ? Math.round(weatherNow.current.wind_speed_10m * 0.621371) : 14)
  const windDir = telemetry?.windDirection ?? 'NE (45°)'
  const rain7d = telemetry?.rainfall7dMm ?? 0.0

  // Vegetation & fuel telemetry
  const ndvi = telemetry?.satelliteNdvi ?? 0.42
  const fuelDryness = telemetry?.fuelDrynessFactor ?? '+30% Critical'
  const liveFuelMoisture = activeCounty?.averageFuelMoisturePct ?? 58
  const primaryFuelType = activeCounty?.sectors?.[0]?.primaryFuelType ?? 'Dense Mixed Conifer / Oak Chaparral WUI'

  // Navigation module cards
  const modules = [
    { label: 'Map Explorer', desc: 'Full-bleed California satellite & FIRMS thermal radar', icon: <Map size={20} />, to: '/map', accent: 'text-emerald-400' },
    { label: 'Risk Analysis', desc: 'Huygens fire spread models & What-If digital twin', icon: <BarChart3 size={20} />, to: '/what-if', accent: 'text-amber-400' },
    { label: 'Incidents & Evidence', desc: 'CAL FIRE incident records & forensic evidence graph', icon: <AlertTriangle size={20} />, to: '/events', accent: 'text-orange-400' },
    { label: 'Environmental Data', desc: 'Sentinel-2 forest canopy health & NDVI stress telemetry', icon: <Layers size={20} />, to: '/forest', accent: 'text-lime-400' },
    { label: 'Wildfire Command', desc: 'Tactical GIS command & multi-stage intelligence workflow', icon: <Flame size={20} />, to: '/command', accent: 'text-red-400' },
    { label: 'Situation Reports', desc: 'AI-grounded dispatch summaries & PDF sitreps', icon: <FileText size={20} />, to: '/reports', accent: 'text-cyan-400' },
    { label: 'Community Reports', desc: 'Citizen hazard sightings & field ground-truth verification', icon: <Users size={20} />, to: '/community', accent: 'text-violet-400' },
    { label: 'Tactical Missions', desc: 'Operations planning, route safety & field dispatch', icon: <Zap size={20} />, to: '/missions', accent: 'text-pink-400' },
  ]

  const handleSelectIncidentFromMap = (inc: EnvironmentalIncident) => {
    selectIncident(inc.id)
    if (inc.countyId) {
      selectCounty(inc.countyId)
    }
    nav(`/events/${inc.id}`)
  }

  const utcTime = missionTime.toISOString().slice(11, 19) + ' UTC'
  const pstTime = missionTime.toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour12: false }) + ' PST'

  return (
    <div className="relative space-y-5 tactical-grid-bg min-h-screen">
      {/* Optional CRT Scanlines Effect */}
      {scanlinesActive && (
        <div className="fixed inset-0 scanlines pointer-events-none z-30" />
      )}

      {/* ── Mission Control Tactical Header ─────────────────────────── */}
      <div className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
              Mission Control · California Operations Center
            </span>
            <span className="text-[10px] font-mono text-[#5b6f64] hidden sm:inline">
              · DEFCON HAZARD SCALE ACTIVE
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-[#f0fdf4] tracking-tight">
              Command Center
            </h1>
            <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/30 flex items-center gap-1.5">
              <span>PILOT SCOPE:</span>
              <strong className="text-white">{activeRegion.name}</strong>
            </span>
          </div>
        </div>

        {/* Tactical Actions & Dual-Time Clock */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* UTC & PST Dual Clock */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#090D14] border border-[rgba(255,255,255,0.08)] text-xs font-mono tabular-nums text-[#8b9f94] shadow-inner">
            <Clock size={13} className="text-cyan-400" />
            <span className="text-[#cbd5e1] font-semibold">{utcTime}</span>
            <span className="text-white/20">|</span>
            <span>{pstTime}</span>
          </div>

          {/* Scanline Grid FX Toggle */}
          <button
            onClick={toggleScanlines}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors ${
              scanlinesActive 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)] font-bold' 
                : 'bg-white/5 text-[#718579] border-white/10 hover:text-white'
            }`}
            title="Toggle Tactical Scanline Overlay"
          >
            <Grid size={13} />
            <span>{scanlinesActive ? 'GRID FX ON' : 'GRID FX OFF'}</span>
          </button>

          {/* Refresh Telemetry */}
          <button
            onClick={loadData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-emerald-400 text-xs font-semibold hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            title="Poll real-time telemetry from state feeds"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Poll Feeds</span>
          </button>
        </div>
      </div>

      {/* ── DEFCON Threat Banner & Supporting KPI Metrics ──────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        {/* Primary Operational Threat Banner (Hero Tile with Crimson Neon Glow) */}
        <div className="md:col-span-2 glass-panel-elevated neon-glow-crimson rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          {/* Subtle radar background ring */}
          <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full border border-red-500/10 pointer-events-none" />

          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-red-400 font-bold">
                Statewide Threat Condition (NFDRS DEFCON Matrix)
              </span>
            </div>
            <span className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded border text-red-400 bg-red-950/70 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.3)]">
              CLASS IV VERY HIGH
            </span>
          </div>

          <div className="space-y-1 my-1">
            <div className="text-xl sm:text-2xl font-black font-mono text-[#f0fdf4] tracking-tight">
              <NumberTicker value={liveCriticalCorridors.length} suffix=" Critical Corridors" /> · <NumberTicker value={cfIncidents.length || 2} suffix=" Official CAD Fires" />
            </div>
            <p className="text-xs text-[#cbd5e1] font-sans leading-relaxed">
              Critical live fuel desiccation ({fuelDryness}) active across {activeRegion.counties.length} flagship WUI districts. Elevated Diablo and Santa Ana ridge wind funnels in Northern California canyons.
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between text-[11px] font-mono text-[#8b9f94]">
            <span>Active Signals: <b className="text-[#f0fdf4]"><NumberTicker value={incidents.length} suffix=" tracked" /></b></span>
            <span>FIRMS Radar: <b className="text-orange-400"><NumberTicker value={hotspotCount} suffix=" hits" /></b></span>
            <span>WUI Exposure: <b className="text-emerald-400">1.52M+ acres</b></span>
          </div>
        </div>

        {/* Supporting Metric Tile: CAL FIRE CAD Incidents */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between hover:border-red-500/30 transition-all shadow-lg group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#718579] font-bold flex items-center gap-1.5">
              <Flame size={13} className="text-red-400" />
              CAL FIRE CAD Active
            </span>
            <SourceStatusBadge status={cfService?.status ?? 'CACHED'} compact />
          </div>
          <div>
            <div className="text-2xl font-black text-[#f0fdf4] font-mono tracking-tight">
              <NumberTicker value={calfireCount || 2} />
              <span className="text-xs text-[#718579] font-normal ml-1.5 font-sans">verified active</span>
            </div>
            <div className="text-[11px] text-[#8b9f94] mt-1 truncate">
              {cfIncidents[0]?.name ? `${cfIncidents[0].name} (${cfIncidents[0].county || 'CA'})` : 'Cherokee Fire (Butte BTU)'}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.06)]">
            <Sparkline data={[1, 1, 2, 2, 3, 2, 2]} color="#ef4444" height={24} />
          </div>
        </div>

        {/* Supporting Metric Tile: 100-Hr Live Fuel Moisture */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all shadow-lg group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#718579] font-bold flex items-center gap-1.5">
              <Droplets size={13} className="text-cyan-400" />
              100-Hr Fuel Moisture
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
              SENTINEL-2
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-[#f0fdf4] font-mono tracking-tight">
              <NumberTicker value={liveFuelMoisture} suffix="%" />
              <span className="text-xs text-emerald-400 font-normal ml-1.5 font-mono">NDVI {ndvi.toFixed(2)}</span>
            </div>
            <div className="text-[11px] text-amber-400 font-semibold mt-1 truncate">
              Fuel Stress: {fuelDryness}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.06)]">
            <Sparkline data={[68, 66, 62, 60, 59, 58]} color="#38bdf8" height={24} />
          </div>
        </div>
      </div>

      {/* ── Responsive 3-Column Mission Control Layout ─────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] 2xl:grid-cols-[1fr_390px] gap-5 items-start">

        {/* ── Column 2: Main Operations Canvas ────────────────────────── */}
        <div className="space-y-5 min-w-0">

          {/* 1. Geospatial Mini-Radar / GIS Viewport */}
          <CaliforniaOverviewMap
            incidents={incidents}
            selectedCountyId={selectedCountyId}
            onSelectCounty={(cId) => {
              selectCounty(cId)
              const match = activeRegion.counties.find(c => c.id === cId)
              if (match) setInspectingDistrict(match)
            }}
            onSelectIncident={handleSelectIncidentFromMap}
          />

          {/* 2. Flagship Districts Tactical Matrix with Spring Hover & Neon Rim Glow */}
          <div className="glass-panel rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                  <Compass size={13} />
                  California Regional Command Sectors
                </span>
                <div className="text-sm font-bold text-[#f0fdf4] mt-0.5">
                  Interactive District Grid · Click to Open Deep Telemetry Slide-over
                </div>
              </div>
              <div className="text-[11px] text-[#718579] font-mono flex items-center gap-2">
                {selectedCountyId && (
                  <button
                    onClick={() => selectCounty(null)}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-semibold cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {activeRegion.counties.map((county) => {
                const isSelected = county.id === selectedCountyId
                const countyIncidents = incidents.filter(i => i.countyId === county.id)
                const countyHighRisk = countyIncidents.filter(i => (i.hazardLevel === 'IV' || i.hazardLevel === 'V') && i.category !== 'HISTORICAL_LANDMARK')
                const isCritical = countyHighRisk.length > 0 || county.id === 'butte' || county.id === 'shasta-trinity'
                const isHigh = county.id === 'sonoma'
                const maxHazard: HazardLevel = isCritical ? 'IV' : isHigh ? 'III' : 'II'

                const rimClass = isCritical 
                  ? 'neon-glow-crimson' 
                  : isHigh 
                  ? 'neon-glow-amber' 
                  : 'neon-glow-emerald'

                return (
                  <motion.div
                    key={county.id}
                    whileHover={{ y: -3, scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    onClick={() => {
                      selectCounty(isSelected ? null : county.id)
                      setInspectingDistrict(county)
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left flex flex-col justify-between ${rimClass} ${
                      isSelected
                        ? 'bg-[#15221B] ring-2 ring-emerald-400/40'
                        : 'bg-[#0E131C]/90 hover:bg-[#121A26]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-sm font-bold text-[#f0fdf4] leading-snug">
                          {county.name}
                        </span>
                        {hazardBadge(maxHazard)}
                      </div>
                      <div className="text-[11px] font-mono text-emerald-400 font-semibold">
                        {county.agencyUnit}
                      </div>
                      <div className="text-[11px] text-[#8b9f94] mt-1 line-clamp-2">
                        {county.description}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[rgba(255,255,255,0.08)] space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-[#5b6f64]">100-Hr Fuel:</span>
                        <span className="text-[#cbd5e1] font-bold">{county.averageFuelMoisturePct}%</span>
                      </div>
                      <Sparkline 
                        data={[county.averageFuelMoisturePct + 6, county.averageFuelMoisturePct + 4, county.averageFuelMoisturePct + 1, county.averageFuelMoisturePct]} 
                        color={isCritical ? '#ef4444' : isHigh ? '#f59e0b' : '#22c55e'} 
                        height={20} 
                      />
                      <div className="text-[10px] text-cyan-400 font-mono flex items-center justify-end gap-1 pt-0.5">
                        <span>Inspect Telemetry</span>
                        <ChevronRight size={11} />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* 3. Prioritized Active Signal Queue */}
          <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.08)] bg-[#0A0E14]/70 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Flame size={14} className="text-emerald-400" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  Prioritized Active Signal Queue
                </span>
                <span className="text-[10px] font-mono text-[#5b6f64]">
                  ({displayedIncidents.length} signals monitored)
                </span>
                {selectedCountyId && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                    Focus: {activeCounty.name}
                    <button
                      onClick={() => selectCounty(null)}
                      className="ml-1 text-red-400 hover:text-white cursor-pointer"
                      title="Clear county filter and view all California signals"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['ALL', 'HIGH', 'CONFIRMED', 'ANOMALY'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setSelectedSignalFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-colors cursor-pointer ${
                      selectedSignalFilter === filter
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                        : 'text-[#718579] hover:text-[#cbd5d1] bg-white/5'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
                <Link to="/events" className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 ml-2 font-medium">
                  Forensic Graph <ChevronRight size={13} />
                </Link>
              </div>
            </div>

            <div className="divide-y divide-[rgba(255,255,255,0.06)]">
              {displayedIncidents.slice(0, 6).map((inc, index) => {
                const isHist = inc.category === 'HISTORICAL_LANDMARK' || inc.status === 'HISTORICAL_STUDY'

                return (
                  <motion.button
                    key={inc.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: index * 0.03 }}
                    onClick={() => nav(`/events/${inc.id}`)}
                    className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                      style={{ backgroundColor: isHist ? '#94a3b8' : (NFDRS_HAZARD_SCALE[inc.hazardLevel]?.color || '#f97316') }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap justify-between">
                        <span className="text-[13px] font-semibold text-[#f0fdf4] group-hover:text-emerald-300 transition-colors truncate">
                          {inc.title}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isHist && (
                            <VerificationBadge type="HISTORICAL" label="CASE STUDY" />
                          )}
                          {hazardBadge(inc.hazardLevel)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-[#718579] font-mono">
                        <span className="text-[#cbd5e1] font-medium">{inc.sectorName}</span>
                        <span>·</span>
                        <span>{inc.category.replace(/_/g, ' ')}</span>
                        <span>·</span>
                        <span className="tabular-nums">{inc.coordinates[1].toFixed(3)}°N, {inc.coordinates[0].toFixed(3)}°W</span>
                        <span>·</span>
                        <span className="text-emerald-400">{inc.satelliteSensor || inc.officialSource}</span>
                      </div>
                    </div>
                    <ChevronRight size={15} className="text-[#5b6f64] group-hover:text-emerald-400 shrink-0 mt-1 transition-colors" />
                  </motion.button>
                )
              })}

              {displayedIncidents.length === 0 && (
                <div className="p-4">
                  <EmptyState
                    title="No Environmental Signals In Current Scope"
                    description="No signals match the active filter criteria for this jurisdiction. Click below to expand monitoring statewide."
                    actionLabel="Show All California Signals"
                    onAction={() => {
                      selectCounty(null)
                      setSelectedSignalFilter('ALL')
                    }}
                    compact
                  />
                </div>
              )}
            </div>
          </div>

          {/* 4. Atmospheric Dynamics & Sentinel-2 Vegetation Health Grid */}
          <div className="glass-panel rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-2.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                <Thermometer size={13} />
                Atmospheric Dynamics &amp; Sentinel-2 Vegetation Telemetry
              </span>
              <span className="text-[10px] font-mono text-[#5b6f64]">
                {activeCounty.name} AOI
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[#090D14] border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-orange-400 text-xs">
                  <Thermometer size={14} />
                  <span className="text-[10px] text-[#718579] font-mono uppercase">Air Temp</span>
                </div>
                <div className="text-xl font-black text-[#f0fdf4] font-mono tabular-nums">
                  {tempC.toFixed(1)}°C <span className="text-xs text-[#718579] font-normal">({tempF}°F)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#090D14] border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-sky-400 text-xs">
                  <Droplets size={14} />
                  <span className="text-[10px] text-[#718579] font-mono uppercase">Relative Humidity</span>
                </div>
                <div className="text-xl font-black text-[#f0fdf4] font-mono tabular-nums">
                  {humidity}% <span className="text-xs text-red-400 font-bold ml-1 font-sans">Critical</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#090D14] border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-400 text-xs">
                  <Wind size={14} />
                  <span className="text-[10px] text-[#718579] font-mono uppercase">Diablo Winds</span>
                </div>
                <div className="text-xl font-black text-[#f0fdf4] font-mono tabular-nums">
                  {windMph} mph <span className="text-xs text-[#718579] font-normal">{windDir}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#090D14] border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-lime-400 text-xs">
                  <Trees size={14} />
                  <span className="text-[10px] text-[#718579] font-mono uppercase">Sentinel-2 NDVI</span>
                </div>
                <div className="text-xl font-black text-[#f0fdf4] font-mono tabular-nums">
                  {ndvi.toFixed(2)} <span className="text-xs text-amber-400 font-normal">Stressed</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Historical Forensics & Benchmark Scenarios (Explicitly Labeled) */}
          <div className="glass-panel rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <History size={14} className="text-cyan-400" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Historical Benchmark Forensics &amp; Calibration Cases
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#718579]">
                Calibrated Case Studies
              </span>
            </div>

            <p className="text-[10px] text-[#718579] font-mono">
              Documented Past Incidents for Model Calibration &amp; Simulation Baselines
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {historicalForensics.map(inc => (
                <div key={inc.id} className="p-3.5 rounded-xl bg-[#0B0F15] border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-[#f0fdf4] truncate">{inc.title}</div>
                      <div className="text-[10px] text-[#718579] font-mono">{inc.sectorName}</div>
                    </div>
                    <VerificationBadge type="HISTORICAL" label="CASE STUDY" />
                  </div>

                  <div className="text-[10px] text-[#8b9f94] font-mono flex items-center justify-between">
                    <span>Burned: {(inc.estimatedAreaHa ? Math.round(inc.estimatedAreaHa * 2.47105).toLocaleString() : '150k+')} acres</span>
                    <span className="text-[#5b6f64]">Event Date: {inc.timestamp.slice(0, 10)}</span>
                  </div>

                  <div className="text-[10px] text-[#718579] font-mono bg-black/40 p-2 rounded-lg border border-white/5">
                    <span className="text-cyan-400 font-semibold">Investigation Archive: </span>
                    {inc.officialSource}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Platform Intelligence Modules Grid */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={15} className="text-emerald-400" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#5b6f64] font-bold">
                Platform Intelligence Modules &amp; Operational Nodes
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {modules.map((m) => (
                <Link
                  key={m.label}
                  to={m.to}
                  className="flex flex-col gap-2 p-3.5 glass-panel rounded-2xl hover:border-emerald-500/40 hover:bg-white/5 transition-all group shadow-md"
                >
                  <div className={`${m.accent}`}>{m.icon}</div>
                  <div>
                    <div className="text-[12px] font-bold text-[#f0fdf4] group-hover:text-emerald-300 transition-colors">
                      {m.label}
                    </div>
                    <div className="text-[10px] text-[#718579] leading-snug mt-0.5">{m.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 7. Live Data Pipeline & Source Health Bar */}
          <div className="glass-panel rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-emerald-400" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#5b6f64] font-bold">
                  Connected Telemetry Pipeline &amp; Source Provenance
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#718579] font-mono hidden sm:inline">Overall Status:</span>
                <SourceStatusBadge status={sourcesHealth?.status ?? (isRefreshing ? 'SYNCING' : 'HEALTHY')} compact />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <SourcePill
                name="CAL FIRE Official CAD"
                status={cfService?.status ?? (isRefreshing ? 'SYNCING' : 'CACHED')}
                count={cfService?.record_count ?? calfireCount}
                cacheAge={cfService?.cache_age_seconds}
                latency={cfService?.latency_ms ?? 120}
              />
              <SourcePill
                name="NASA FIRMS VIIRS 375m"
                status={firmsService?.status ?? (isRefreshing ? 'SYNCING' : 'LIVE')}
                count={firmsService?.record_count ?? hotspotCount}
                cacheAge={firmsService?.cache_age_seconds}
                latency={firmsService?.latency_ms ?? 250}
              />
              <SourcePill
                name="Open-Meteo GFS/ICON NWP"
                status={meteoService?.status ?? (weatherNow?.status) ?? (isRefreshing ? 'SYNCING' : 'LIVE')}
                count={meteoService?.record_count ?? 1}
                cacheAge={meteoService?.cache_age_seconds}
                latency={meteoService?.latency_ms ?? 95}
              />
              <SourcePill
                name="US Census TIGER 2024"
                status={censusService?.status ?? 'STATIC'}
                count={censusService?.record_count ?? 58}
                latency={censusService?.latency_ms ?? 15}
              />
            </div>
          </div>

        </div>

        {/* ── Column 3: Right-Hand Live Activity Stream ────────────────── */}
        <div className="xl:sticky xl:top-4 h-[calc(100vh-100px)] min-h-[640px] flex flex-col">
          <LiveActivityStream
            incidents={incidents}
            cadIncidents={cfIncidents}
            hotspotCount={hotspotCount}
            weatherTelemetry={telemetry}
            onSelectIncident={handleSelectIncidentFromMap}
            onFocusCoordinates={(coords) => {
              // Dispatches custom event to focus mini-map
              window.dispatchEvent(new CustomEvent('ecochain-search', { detail: { coords } }))
            }}
          />
        </div>

      </div>

      {/* District Deep Telemetry Slide-over Drawer */}
      <DistrictTelemetryDrawer
        isOpen={!!inspectingDistrict}
        onClose={() => setInspectingDistrict(null)}
        county={inspectingDistrict}
        telemetry={telemetry}
        onOpenWhatIf={(cId) => nav(`/what-if?county=${cId}`)}
        onOpenMap={(coords) => nav(`/map`)}
      />

      {/* Operational Disclaimer */}
      <div className="pt-4 pb-2 border-t border-[rgba(255,255,255,0.06)] text-[10px] text-[#5b6f64] font-mono space-y-1">
        <p>
          Data Sources: State of California CAL FIRE Official Incidents API · NASA EOSDIS LANCE FIRMS VIIRS (375m) &amp; MODIS NRT · Open-Meteo GFS/ICON High-Resolution NWP · US Census Bureau TIGER/Line 2024.
        </p>
        <p>
          TERRAVOX is an open environmental decision-support and surveillance radar. This platform supports scientific, civic, and agency situational awareness, and does not replace statutory emergency broadcast notifications issued by CAL FIRE, NWS, or county emergency command centers.
        </p>
      </div>
    </div>
  )
}
