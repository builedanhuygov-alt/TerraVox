import React, { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../utils/maplibreWorker'
import { useNavigate } from 'react-router-dom'
import { useGeographyStore } from '../store/useGeographyStore'
import { 
  NFDRS_HAZARD_SCALE, 
  EnvironmentalIncident, 
  MonitoredSector,
  CountyRegion 
} from '../config/geography'
import { 
  CALIFORNIA_TIME_SLICES, 
  TimeSliceSnapshot 
} from '../services/signalFusion'
import { 
  loadCaliforniaCounties, 
  GeoJSONCountyCollection 
} from '../utils/boundaryResolver'
import { 
  CALIFORNIA_PLACES, 
  CaliforniaPlace 
} from '../data/californiaCities'
import { 
  CALIFORNIA_COUNTY_AGENCIES 
} from '../data/californiaAgencyDirectory'
import { api } from '../services/api'
import GISLayerDrawer, { LayerState } from '../components/GISLayerDrawer'
import EnvironmentalTimelineDrawer from '../components/EnvironmentalTimelineDrawer'
import ContextualDetailDrawer, { SelectedEntity } from '../components/ContextualDetailDrawer'
import CommunityReportModal from '../components/CommunityReportModal'
import { isWebGLSupported } from './CommandCenter'
import { 
  Layers, 
  History, 
  PlusCircle, 
  ShieldAlert, 
  Navigation, 
  Crosshair, 
  Info,
  RotateCcw,
  Compass,
  Flame,
  Radio
} from 'lucide-react'

// Geographic projection helper for the SVG vector map fallback (600x500 space)
function projectGeoToSvgMap(lon: number, lat: number, width = 600, height = 500): [number, number] {
  const minLon = -124.6
  const maxLon = -114.0
  const minLat = 32.4
  const maxLat = 42.2

  const x = Math.max(12, Math.min(width - 12, ((lon - minLon) / (maxLon - minLon)) * width))
  const y = Math.max(12, Math.min(height - 12, height - ((lat - minLat) / (maxLat - minLat)) * height))
  return [x, y]
}

export default function EcoMap() {
  const nav = useNavigate()
  const { 
    activeRegion, 
    selectedCountyId, 
    activeCoords, 
    telemetry,
    selectCounty,
    selectIncident,
    refreshTelemetry
  } = useGeographyStore()

  // Map refs
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const scarMarkersRef = useRef<maplibregl.Marker[]>([])
  const communityMarkersRef = useRef<maplibregl.Marker[]>([])

  // GeoJSON counties cache
  const [countiesGeoJSON, setCountiesGeoJSON] = useState<GeoJSONCountyCollection | null>(null)

  // Map Cartography State
  const [basemap, setBasemap] = useState<'satellite' | 'terrain' | 'eox'>('satellite')
  const [currentZoom, setCurrentZoom] = useState<number>(6.8)
  const [cursorCoords, setCursorCoords] = useState<[number, number] | null>(null)
  const [hoveredCounty, setHoveredCounty] = useState<{ id: string; name: string; agency?: string } | null>(null)

  // Drawers & Modals (Single-panel rule: only one open at a time)
  const [isLayersOpen, setIsLayersOpen] = useState(false)
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)

  // Hardware WebGL Fallback State
  const [mapError, setMapError] = useState<string | null>(null)
  const [initAttempts, setInitAttempts] = useState(0)

  // Selected Entity (DO NOT AUTO-OPEN ON LOAD)
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null)

  // Environmental Timeline State
  const [selectedTimeSlice, setSelectedTimeSlice] = useState<TimeSliceSnapshot>(CALIFORNIA_TIME_SLICES[0])
  const [compareTimeSlice, setCompareTimeSlice] = useState<TimeSliceSnapshot | null>(CALIFORNIA_TIME_SLICES[2])
  const [isCompareMode, setIsCompareMode] = useState(false)

  // Layer Toggles
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

  // Community observations from backend
  const [publicReports, setPublicReports] = useState<any[]>([])

  // Load telemetry & boundaries
  useEffect(() => {
    refreshTelemetry()
    loadCaliforniaCounties().then(data => {
      if (data) setCountiesGeoJSON(data)
    })
    loadCommunityReports()
  }, [])

  const loadCommunityReports = () => {
    api.publicReports().then(res => {
      if (Array.isArray(res)) setPublicReports(res)
    }).catch(() => {})
  }

  // Global event listeners for Header toolbar triggers
  useEffect(() => {
    const handleToggleLayers = () => {
      setIsLayersOpen(prev => {
        const next = !prev
        if (next) {
          setIsTimelineOpen(false)
          setIsDetailOpen(false)
        }
        return next
      })
    }

    const handleToggleTimeline = () => {
      setIsTimelineOpen(prev => {
        const next = !prev
        if (next) {
          setIsLayersOpen(false)
          setIsDetailOpen(false)
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
          setSelectedEntity({
            type: 'incident',
            id: match.id,
            data: match
          })
          setIsDetailOpen(true)
          setIsLayersOpen(false)
          setIsTimelineOpen(false)
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

  // Tile endpoints
  const TILE_SOURCES = {
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    terrain: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    eox: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg'
  }

  // Initialize California MapLibre GL
  useEffect(() => {
    if (!mapContainer.current) return

    if (!isWebGLSupported()) {
      setMapError('Hardware WebGL acceleration unavailable in current session')
      return
    }

    setMapError(null)

    // Clean up any existing map instance before re-initializing
    if (mapRef.current) {
      try {
        mapRef.current.remove()
      } catch {}
      mapRef.current = null
    }

    const initialCenter: [number, number] = activeCoords || activeRegion.center || [-120.75, 38.25]

    let map: maplibregl.Map | null = null

    try {
      map = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'base-tiles': {
              type: 'raster',
              tiles: [TILE_SOURCES[basemap]],
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
    } catch (err: any) {
      console.warn('MapLibre GL initialization error:', err)
      setMapError(err?.message || 'WebGL map initialization failed')
      return
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right')

    map.on('zoom', () => {
      if (mapRef.current) setCurrentZoom(mapRef.current.getZoom())
    })

    map.on('mousemove', (e) => {
      setCursorCoords([e.lngLat.lng, e.lngLat.lat])
    })

    map.on('error', (e) => {
      console.warn('[TERRAVOX EcoMap Notice]', e?.error?.message || e)
    })

    map.on('load', () => {
      // 1. California County Boundaries Layer
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
            'line-width': [
              'case',
              ['==', ['get', 'id'], selectedCountyId || ''],
              2.5,
              1.2
            ]
          }
        })

        map.addLayer({
          id: 'ca-counties-hover',
          type: 'line',
          source: 'ca-counties',
          filter: ['==', ['get', 'id'], ''],
          paint: {
            'line-color': '#4ade80',
            'line-width': 2.8,
            'line-opacity': 0.95
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

        // County click selection
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
        map.on('mousemove', 'ca-counties-fill', (e) => {
          if (e.features && e.features[0]) {
            const f = e.features[0]
            const cId = f.properties?.id
            const cName = f.properties?.name
            if (cId) {
              map.setFilter('ca-counties-hover', ['==', ['get', 'id'], cId])
              setHoveredCounty({
                id: cId,
                name: cName || 'California County',
                agency: CALIFORNIA_COUNTY_AGENCIES[cId]?.agencyName
              })
            }
          }
        })
        map.on('mouseleave', 'ca-counties-fill', () => {
          map.getCanvas().style.cursor = ''
          map.setFilter('ca-counties-hover', ['==', ['get', 'id'], ''])
          setHoveredCounty(null)
        })
      } catch (err) {
        console.warn('County boundary layer init error:', err)
      }

      // 2. California Incorporated Cities & Places Layer
      try {
        const placesGeoJSON = {
          type: 'FeatureCollection',
          features: CALIFORNIA_PLACES.map(p => ({
            type: 'Feature',
            id: p.id,
            properties: {
              id: p.id,
              name: p.name,
              countyName: p.countyName,
              countyId: p.countyId,
              population: p.population,
              elevation: p.elevationMeters,
              isIncorporated: p.isIncorporated
            },
            geometry: {
              type: 'Point',
              coordinates: p.coordinates
            }
          }))
        }

        map.addSource('ca-places', {
          type: 'geojson',
          data: placesGeoJSON as any
        })

        map.addLayer({
          id: 'ca-places-circle',
          type: 'circle',
          source: 'ca-places',
          minzoom: 8.5,
          paint: {
            'circle-radius': 4.5,
            'circle-color': '#38bdf8',
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#020617'
          }
        })

        map.addLayer({
          id: 'ca-places-label',
          type: 'symbol',
          source: 'ca-places',
          minzoom: 8.5,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 10,
            'text-offset': [0, 1.2],
            'text-anchor': 'top'
          },
          paint: {
            'text-color': '#bae6fd',
            'text-halo-color': '#020617',
            'text-halo-width': 1.4
          }
        })

        map.on('click', 'ca-places-circle', (e) => {
          if (e.features && e.features[0]) {
            const f = e.features[0]
            const pId = f.properties?.id
            const place = CALIFORNIA_PLACES.find(p => p.id === pId)
            if (place) {
              setSelectedEntity({
                type: 'place',
                id: place.id,
                data: place
              })
              setIsDetailOpen(true)
              setIsLayersOpen(false)
              setIsTimelineOpen(false)
              map.flyTo({ center: place.coordinates, zoom: 11.2, speed: 1.2 })
            }
          }
        })

        map.on('mouseenter', 'ca-places-circle', () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', 'ca-places-circle', () => {
          map.getCanvas().style.cursor = ''
        })
      } catch (err) {
        console.warn('Places layer init error:', err)
      }

      renderMapMarkers(map)
    })

    return () => {
      markersRef.current.forEach(m => m.remove())
      scarMarkersRef.current.forEach(m => m.remove())
      communityMarkersRef.current.forEach(m => m.remove())
      markersRef.current = []
      scarMarkersRef.current = []
      communityMarkersRef.current = []
      if (map) {
        try {
          map.remove()
        } catch {}
      }
      mapRef.current = null
    }
  }, [initAttempts])

  // Basemap switch
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    try {
      const src = map.getSource('base-tiles') as any
      if (src && src.setTiles) {
        src.setTiles([TILE_SOURCES[basemap]])
      }
    } catch (e) {
      console.warn('Basemap swap exception:', e)
    }
  }, [basemap])

  // Sync boundary and places layer visibility
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    try {
      if (map.getLayer('ca-counties-fill')) {
        map.setLayoutProperty('ca-counties-fill', 'visibility', layers.administrativeBoundaries ? 'visible' : 'none')
      }
      if (map.getLayer('ca-counties-line')) {
        map.setLayoutProperty('ca-counties-line', 'visibility', layers.administrativeBoundaries ? 'visible' : 'none')
      }
      if (map.getLayer('ca-counties-label')) {
        map.setLayoutProperty('ca-counties-label', 'visibility', layers.administrativeBoundaries ? 'visible' : 'none')
      }
      if (map.getLayer('ca-places-circle')) {
        map.setLayoutProperty('ca-places-circle', 'visibility', layers.incorporatedPlaces ? 'visible' : 'none')
      }
      if (map.getLayer('ca-places-label')) {
        map.setLayoutProperty('ca-places-label', 'visibility', layers.incorporatedPlaces ? 'visible' : 'none')
      }
    } catch {}
  }, [layers.administrativeBoundaries, layers.incorporatedPlaces])

  // RENDER SEPARATE, VISUALLY DISTINCT MARKERS
  const renderMapMarkers = (map: maplibregl.Map) => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    scarMarkersRef.current.forEach(m => m.remove())
    scarMarkersRef.current = []
    communityMarkersRef.current.forEach(m => m.remove())
    communityMarkersRef.current = []

    const currentZoomLevel = map.getZoom()
    const isLowZoom = currentZoomLevel < 7.8
    const showLabels = currentZoomLevel >= 8.5

    // 1. CAL FIRE Official Incidents vs NASA FIRMS Satellite Hotspots
    activeRegion.incidents.forEach(inc => {
      const isHotspot = inc.category === 'THERMAL_ANOMALY' || inc.status === 'UNVERIFIED'
      const isOfficial = inc.category === 'CONFIRMED_WILDFIRE' || inc.status === 'CONFIRMED_ACTIVE' || inc.status === 'CONTAINED'

      if (isHotspot && !layers.activeFires) return
      if (isOfficial && !layers.officialIncidents) return

      const isSelected = selectedEntity?.id === inc.id
      const el = document.createElement('div')
      el.className = 'cursor-pointer group flex flex-col items-center select-none'

      if (isOfficial) {
        // DISTINCT OFFICIAL CAL FIRE MARKER: Shield Badge with Flame
        const markerSize = isLowZoom ? 'w-6 h-6' : 'w-8 h-8'
        const iconSize = isLowZoom ? 12 : 15
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            ${isSelected ? '<div class="absolute -inset-2.5 rounded-full bg-red-500/40 animate-ping"></div>' : ''}
            <div class="${markerSize} rounded-full flex items-center justify-center shadow-2xl transition-transform duration-150 group-hover:scale-125 border-2 bg-[#120808] border-[#ef4444]"
                 style="box-shadow: 0 0 14px rgba(239, 68, 68, 0.65);"
                 title="CAL FIRE Official: ${inc.title}">
              <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="1.5">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
              </svg>
            </div>
            ${inc.estimatedAreaHa && !isLowZoom ? `<span class="absolute -top-2.5 -right-3.5 px-1 rounded font-mono text-[9px] bg-red-950 text-red-200 border border-red-500/40">${Math.round(inc.estimatedAreaHa * 2.47105)} ac</span>` : ''}
          </div>
          ${(showLabels || isSelected) ? `
            <div class="mt-1 px-1.5 py-0.5 rounded bg-black/90 backdrop-blur-xs text-[10px] font-mono text-white whitespace-nowrap border border-white/20 shadow-md ${isSelected ? 'font-bold text-red-400 border-red-500' : 'opacity-90'}">
              🔥 ${inc.title.replace(' Thermal Anomaly', '').replace(' Complex', '')}
            </div>
          ` : ''}
        `
      } else {
        // DISTINCT NASA FIRMS SATELLITE DETECTION: Concentric Radiometer Target (NOT flame!)
        const markerSize = isLowZoom ? 'w-5 h-5' : 'w-7 h-7'
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            ${isSelected ? '<div class="absolute -inset-2 rounded-full bg-orange-500/40 animate-ping"></div>' : ''}
            <div class="${markerSize} rounded-full flex items-center justify-center shadow-xl transition-transform duration-150 group-hover:scale-125 border-2 bg-[#120b06] border-[#f97316]"
                 style="box-shadow: 0 0 10px rgba(249, 115, 22, 0.6);"
                 title="NASA FIRMS Detection (${inc.brightnessKelvin || 320}K)">
              <div class="w-2 h-2 rounded-full bg-[#f97316] animate-pulse"></div>
            </div>
            ${inc.brightnessKelvin && !isLowZoom ? `<span class="absolute -top-2 -right-3 px-1 rounded font-mono text-[8px] bg-orange-950 text-orange-200 border border-orange-500/40">${inc.brightnessKelvin}K</span>` : ''}
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
        selectIncident(inc.id)
        const county = activeRegion.counties.find(c => c.id === inc.countyId)
        setSelectedEntity({
          type: isOfficial ? 'incident' : 'detection',
          id: inc.id,
          data: { ...inc, containingCounty: county?.name }
        })
        setIsDetailOpen(true)
        setIsLayersOpen(false)
        setIsTimelineOpen(false)
        map.flyTo({ center: inc.coordinates, zoom: 10.8, speed: 1.2 })
      })

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(inc.coordinates)
        .addTo(map)

      markersRef.current.push(marker)
    })

    // 2. Historical Fire Scars (FRAP)
    if (layers.historicalScars && selectedTimeSlice.historicalBurnScarsVisible) {
      selectedTimeSlice.historicalBurnScarsVisible.forEach(scar => {
        const el = document.createElement('div')
        el.className = 'cursor-pointer group flex flex-col items-center select-none'
        el.innerHTML = `
          <div class="px-2 py-0.5 rounded-md flex items-center gap-1 border shadow-lg transition-transform group-hover:scale-110 bg-[#140d0a] border-[#eab308] text-[#fef08a]">
            <span class="text-[9px] font-mono font-bold">${scar.name.split(' ')[0]} '${String(scar.year).slice(2)}</span>
            <span class="text-[8px] font-mono text-stone-300">(${(scar.areaAcres / 1000).toFixed(0)}k ac)</span>
          </div>
        `

        el.addEventListener('click', (e) => {
          e.stopPropagation()
          setSelectedEntity({
            type: 'scar',
            id: scar.name,
            data: scar
          })
          setIsDetailOpen(true)
          setIsLayersOpen(false)
          setIsTimelineOpen(false)
          map.flyTo({ center: scar.center, zoom: 10.2, speed: 1.2 })
        })

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(scar.center)
          .addTo(map)

        scarMarkersRef.current.push(marker)
      })
    }

    // 3. Community Hazard Sightings
    if (layers.communityReports && publicReports.length > 0) {
      publicReports.forEach(rep => {
        if (!rep.latitude || !rep.longitude) return

        const el = document.createElement('div')
        el.className = 'cursor-pointer group flex flex-col items-center select-none'
        el.innerHTML = `
          <div class="w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-125 border-2 bg-[#08131a] border-[#38bdf8]"
               style="box-shadow: 0 0 10px rgba(56, 189, 248, 0.5);">
            <span class="text-[10px]">📍</span>
          </div>
          ${showLabels ? `
            <div class="mt-0.5 px-1 py-0.2 rounded bg-black/90 text-[8px] font-mono text-sky-300 border border-sky-500/30 truncate max-w-[90px]">
              ${rep.category}
            </div>
          ` : ''}
        `

        el.addEventListener('click', (e) => {
          e.stopPropagation()
          setSelectedEntity({
            type: 'report',
            id: String(rep.id),
            data: rep
          })
          setIsDetailOpen(true)
          setIsLayersOpen(false)
          setIsTimelineOpen(false)
          map.flyTo({ center: [rep.longitude, rep.latitude], zoom: 11.0, speed: 1.2 })
        })

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([rep.longitude, rep.latitude])
          .addTo(map)

        communityMarkersRef.current.push(marker)
      })
    }
  }

  // Re-render markers on layer or zoom changes
  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      renderMapMarkers(mapRef.current)
    }
  }, [
    layers.activeFires, 
    layers.officialIncidents, 
    layers.historicalScars, 
    layers.communityReports,
    selectedTimeSlice, 
    publicReports, 
    currentZoom
  ])

  // Toggle single layer helper
  const handleToggleLayer = (k: keyof LayerState) => {
    setLayers(l => ({ ...l, [k]: !l[k] }))
  }

  return (
    <div className="relative w-full h-full flex-1 flex flex-col min-h-0 bg-[#070e0a] overflow-hidden select-none">
      {/* MAP CANVAS OR VECTOR INTELLIGENCE FALLBACK */}
      {mapError ? (
        <div className="relative w-full h-full flex-1 flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-b from-[#09140f] via-[#070e0a] to-[#040806] overflow-hidden select-none">
          {/* Top Status & Fail-Safe Notice Bar */}
          <div className="pt-12 sm:pt-14 pb-2 border-b border-[#14261c] flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                Vector Operational Matrix Mode (Fallback)
              </span>
              <span className="text-[10px] font-mono text-[#718579] hidden md:inline">
                {mapError}
              </span>
            </div>
            <button
              onClick={() => setInitAttempts(v => v + 1)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#14281e] text-[#38bdf8] border border-[#1e4231] hover:bg-[#1a3829] text-xs font-mono transition-colors cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Retry WebGL Engine</span>
            </button>
          </div>

          {/* Interactive SVG California Geographic Matrix */}
          <div className="relative flex-1 my-3 flex items-center justify-center overflow-hidden">
            <svg
              viewBox="0 0 600 500"
              className="w-full h-full max-h-[520px] select-none"
              style={{ filter: 'drop-shadow(0 0 16px rgba(34, 197, 94, 0.12))' }}
            >
              {/* Latitude / Longitude Grid */}
              <line x1="50" y1="120" x2="550" y2="120" stroke="#13241b" strokeDasharray="3 3" strokeWidth="0.8" />
              <text x="555" y="123" fill="#3b5245" fontSize="8" fontFamily="monospace">40°N</text>
              <line x1="50" y1="240" x2="550" y2="240" stroke="#13241b" strokeDasharray="3 3" strokeWidth="0.8" />
              <text x="555" y="243" fill="#3b5245" fontSize="8" fontFamily="monospace">38°N</text>
              <line x1="50" y1="360" x2="550" y2="360" stroke="#13241b" strokeDasharray="3 3" strokeWidth="0.8" />
              <text x="555" y="363" fill="#3b5245" fontSize="8" fontFamily="monospace">36°N</text>

              {/* Stylized California State Polygon Boundary */}
              <path
                d="M 80,40 L 220,40 L 250,170 L 510,390 L 510,470 L 400,470 L 270,410 L 180,320 L 100,220 L 70,130 Z"
                fill="rgba(12, 28, 20, 0.7)"
                stroke="#22c55e"
                strokeWidth="1.6"
                strokeDasharray="4 2"
              />

              {/* Major California Counties (Clickable) */}
              {[
                { id: 'butte', name: 'Butte Unit (BTU)', lon: -121.53, lat: 39.78 },
                { id: 'sonoma', name: 'Sonoma / Lake / Napa (LNU)', lon: -122.75, lat: 38.52 },
                { id: 'shasta', name: 'Shasta-Trinity (SHU)', lon: -122.39, lat: 40.58 },
                { id: 'los-angeles', name: 'Los Angeles County (LAC)', lon: -118.24, lat: 34.05 },
                { id: 'san-diego', name: 'San Diego County (MVU)', lon: -116.90, lat: 32.80 },
                { id: 'ventura', name: 'Ventura County (VNC)', lon: -119.10, lat: 34.35 },
                { id: 'fresno', name: 'Fresno-Kings (FKU)', lon: -119.78, lat: 36.74 },
                { id: 'monterey', name: 'San Benito-Monterey (BEU)', lon: -121.45, lat: 36.30 }
              ].map(c => {
                const [cx, cy] = projectGeoToSvgMap(c.lon, c.lat)
                const isSelected = selectedCountyId === c.id
                return (
                  <g key={c.id} className="cursor-pointer group" onClick={() => {
                    selectCounty(c.id)
                    const existingCounty = activeRegion.counties.find(item => item.id === c.id)
                    setSelectedEntity({
                      type: 'county',
                      id: c.id,
                      data: existingCounty || {
                        id: c.id,
                        name: c.name,
                        agencyUnit: CALIFORNIA_COUNTY_AGENCIES[c.id]?.agencyName || 'CAL FIRE Operational Unit',
                        coordinates: [c.lon, c.lat]
                      }
                    })
                    setIsDetailOpen(true)
                    setIsLayersOpen(false)
                    setIsTimelineOpen(false)
                  }}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 24 : 16}
                      fill={isSelected ? 'rgba(34, 197, 94, 0.35)' : 'rgba(34, 197, 94, 0.10)'}
                      stroke={isSelected ? '#4ade80' : '#22c55e'}
                      strokeWidth={isSelected ? 2 : 1}
                      className="transition-all"
                    />
                    <text
                      x={cx}
                      y={cy - (isSelected ? 28 : 20)}
                      fill={isSelected ? '#4ade80' : '#9ca3af'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      textAnchor="middle"
                    >
                      {c.name.split(' (')[0]}
                    </text>
                  </g>
                )
              })}

              {/* Real-time CAL FIRE & NASA FIRMS Incidents */}
              {activeRegion.incidents.map(inc => {
                const [ix, iy] = projectGeoToSvgMap(inc.coordinates[0], inc.coordinates[1])
                const isOfficial = inc.category === 'CONFIRMED_WILDFIRE' || inc.status === 'CONFIRMED_ACTIVE' || inc.status === 'CONTAINED'
                const isSelected = selectedEntity?.id === inc.id

                if (isOfficial && !layers.officialIncidents) return null
                if (!isOfficial && !layers.activeFires) return null

                return (
                  <g key={inc.id} className="cursor-pointer" onClick={() => {
                    selectIncident(inc.id)
                    const county = activeRegion.counties.find(c => c.id === inc.countyId)
                    setSelectedEntity({
                      type: isOfficial ? 'incident' : 'detection',
                      id: inc.id,
                      data: { ...inc, containingCounty: county?.name }
                    })
                    setIsDetailOpen(true)
                    setIsLayersOpen(false)
                    setIsTimelineOpen(false)
                  }}>
                    {isSelected && (
                      <circle cx={ix} cy={iy} r={18} fill="none" stroke={isOfficial ? '#ef4444' : '#f97316'} strokeWidth="2" opacity="0.8" />
                    )}
                    <circle
                      cx={ix}
                      cy={iy}
                      r={isOfficial ? 9 : 6}
                      fill={isOfficial ? '#ef4444' : '#f97316'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <text
                      x={ix}
                      y={iy + (isOfficial ? 18 : 14)}
                      fill={isOfficial ? '#fca5a5' : '#fed7aa'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {isOfficial ? `🔥 ${inc.title.replace(' Fire', '').slice(0, 14)}` : `🛰️ ${inc.title.slice(0, 10)}`}
                    </text>
                  </g>
                )
              })}

              {/* Public Community Hazard Reports */}
              {layers.communityReports && publicReports.map(rep => {
                if (!rep.longitude || !rep.latitude) return null
                const [rx, ry] = projectGeoToSvgMap(rep.longitude, rep.latitude)
                const isSelected = selectedEntity?.id === String(rep.id)
                return (
                  <g key={rep.id} className="cursor-pointer" onClick={() => {
                    setSelectedEntity({
                      type: 'report',
                      id: String(rep.id),
                      data: rep
                    })
                    setIsDetailOpen(true)
                    setIsLayersOpen(false)
                    setIsTimelineOpen(false)
                  }}>
                    <circle cx={rx} cy={ry} r={5} fill="#38bdf8" stroke="#08131a" strokeWidth="1.5" />
                    <text x={rx} y={ry - 8} fill="#7dd3fc" fontSize="8" fontFamily="monospace" textAnchor="middle">
                      📍 {rep.category}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Bottom attribution */}
          <div className="pt-2 border-t border-[#14261c] flex items-center justify-between text-[10px] font-mono text-[#718579]">
            <span>California Spatial Reference: WGS84 EPSG:4326</span>
            <span>CAL FIRE Official · NASA FIRMS VIIRS NRT</span>
          </div>
        </div>
      ) : (
        <div 
          ref={mapContainer} 
          className="w-full h-full flex-1 bg-[#060c08] outline-none" 
        />
      )}

      {/* FLOATING TOP-RIGHT QUICK CONTROLS */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        {/* Basemap Switcher Pill */}
        <div className="flex items-center bg-[#08120e]/95 backdrop-blur-md border border-[#1b3326] rounded-xl p-1 text-[10px] sm:text-[11px] font-mono shadow-xl">
          <button
            onClick={() => setBasemap('satellite')}
            className={`px-2 sm:px-2.5 py-1 rounded-lg transition-colors font-semibold ${
              basemap === 'satellite'
                ? 'bg-[#153423] text-[#4ade80] shadow-xs'
                : 'text-[#718579] hover:text-[#f0fdf4]'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setBasemap('terrain')}
            className={`px-2 sm:px-2.5 py-1 rounded-lg transition-colors font-semibold ${
              basemap === 'terrain'
                ? 'bg-[#153423] text-[#4ade80] shadow-xs'
                : 'text-[#718579] hover:text-[#f0fdf4]'
            }`}
          >
            Terrain
          </button>
        </div>

        {/* GIS Layers Button */}
        <button
          onClick={() => {
            setIsLayersOpen(v => {
              const next = !v
              if (next) {
                setIsTimelineOpen(false)
                setIsDetailOpen(false)
              }
              return next
            })
          }}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl backdrop-blur-md border text-xs font-mono font-semibold shadow-xl transition-all ${
            isLayersOpen
              ? 'bg-[#1b3f2c] text-[#4ade80] border-[#22c55e]'
              : 'bg-[#08120e]/95 text-[#cbd5d1] border-[#1b3326] hover:bg-[#12241b]'
          }`}
          title="Open GIS Layer Controls"
        >
          <Layers size={14} className="text-[#4ade80]" />
          <span>Layers</span>
        </button>
      </div>

      {/* FLOATING BOTTOM-LEFT TIMELINE & COORDINATES HUD */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 flex flex-wrap items-center gap-1.5 sm:gap-2 pointer-events-auto">
        {/* Environmental Timeline Button */}
        <button
          onClick={() => {
            setIsTimelineOpen(v => {
              const next = !v
              if (next) {
                setIsLayersOpen(false)
                setIsDetailOpen(false)
              }
              return next
            })
          }}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl backdrop-blur-md border text-[11px] sm:text-xs font-mono font-semibold shadow-xl transition-all ${
            isTimelineOpen
              ? 'bg-[#1b3f2c] text-[#a3e635] border-[#a3e635]'
              : 'bg-[#08120e]/95 text-[#cbd5d1] border-[#1b3326] hover:bg-[#12241b]'
          }`}
          title="Explore Environmental Time Machine"
        >
          <History size={14} className="text-[#a3e635]" />
          <span className="hidden sm:inline">Timeline: {selectedTimeSlice.dateLabel}</span>
          <span className="sm:hidden">Timeline</span>
        </button>

        {/* Real-time Cursor Coordinates & Zoom HUD */}
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

      {/* FLOATING COUNTY HOVER BADGE */}
      {hoveredCounty && layers.administrativeBoundaries && (
        <div className="absolute top-4 left-4 z-20 pointer-events-none bg-[#08120e]/95 backdrop-blur-md border border-[#22c55e]/50 rounded-xl px-3 py-2 shadow-2xl space-y-0.5 animate-fadeIn">
          <div className="flex items-center gap-1.5">
            <ShieldAlert size={13} className="text-[#34d399]" />
            <span className="text-xs font-bold text-[#f0fdf4] font-mono">{hoveredCounty.name} County</span>
            <span className="text-[9px] font-mono text-[#4ade80] px-1 rounded bg-[#132a1e] border border-[#22c55e]/30">Active</span>
          </div>
          {hoveredCounty.agency && (
            <div className="text-[10px] font-mono text-[#8b9f94]">
              Lead: <span className="text-stone-300">{hoveredCounty.agency}</span>
            </div>
          )}
        </div>
      )}

      {/* SOURCE ATTRIBUTION BAR (BOTTOM-RIGHT) */}
      <div className="absolute bottom-2 right-2 z-10 text-[9px] font-mono text-[#5b6f64] bg-[#070e0a]/80 backdrop-blur-xs px-2 py-0.5 rounded border border-[#14261c] pointer-events-none hidden md:block">
        CAL FIRE Official · NASA FIRMS VIIRS NRT · Open-Meteo · US Census TIGER
      </div>

      {/* GIS LAYER DRAWER (OPENS ON DEMAND) */}
      <GISLayerDrawer
        isOpen={isLayersOpen}
        onClose={() => setIsLayersOpen(false)}
        basemap={basemap}
        onBasemapChange={setBasemap}
        layers={layers}
        onToggleLayer={handleToggleLayer}
        counts={{
          calfire: activeRegion.incidents.filter(i => i.category === 'CONFIRMED_WILDFIRE').length,
          firms: telemetry?.firmsCount ?? activeRegion.incidents.filter(i => i.category === 'THERMAL_ANOMALY').length,
          counties: 58,
          reports: publicReports.length
        }}
      />

      {/* ENVIRONMENTAL TIMELINE DRAWER (OPENS ON DEMAND) */}
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

      {/* CONTEXTUAL DETAIL DRAWER (OPENS ONLY ON SELECTION) */}
      <ContextualDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedEntity(null)
        }}
        entity={selectedEntity}
        onOpenSitRep={(inc) => {
          nav(`/reports?incident=${encodeURIComponent(inc.title || '')}`)
        }}
        onNavigateToCommand={(incId) => {
          selectIncident(incId)
          nav(`/events`)
        }}
      />

      {/* COMMUNITY HAZARD REPORTING MODAL */}
      <CommunityReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        initialCoords={cursorCoords || undefined}
        initialLocationName={hoveredCounty ? `${hoveredCounty.name} County` : undefined}
      />

      {/* MOBILE BACKDROP OVERLAY WHEN ANY DRAWER IS OPEN */}
      {(isLayersOpen || isTimelineOpen || isDetailOpen) && (
        <div 
          onClick={() => {
            setIsLayersOpen(false)
            setIsTimelineOpen(false)
            setIsDetailOpen(false)
            setSelectedEntity(null)
          }}
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}
    </div>
  )
}
