import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import '../utils/maplibreWorker'
// Mandatory: Import MapLibre GL CSS (must be at top of file)
import 'maplibre-gl/dist/maplibre-gl.css'
import { useLocation } from '../hooks/useLocation'
import { API_BASE, api, photoUrl } from '../services/api'
import DemoTour from './DemoTour'
import { getMode } from './ModeSwitch'
import { useGeographyStore } from '../store/useGeographyStore'
import { NFDRS_HAZARD_SCALE, HazardLevel } from '../config/geography'

// California Historic Reference Wildfires — Calibrated forensic benchmarks
const HIST_FIRES = [
  { name: 'Park Fire (429,603 acres)', place: 'Butte / Tehama County · 39.897°N 121.688°W', coords: [-121.688, 39.897] as [number, number], time: 'July-Sept 2024', note: 'Largest California wildfire of 2024 · Extreme rate of spread driven by fine grass/chaparral loading', press: 'CAL FIRE Final Incident Report · InciWeb' },
  { name: 'Mosquito Fire (76,788 acres)', place: 'Placer / El Dorado County · 39.006°N 120.738°W', coords: [-120.738, 39.006] as [number, number], time: 'Sept 2022', note: 'Steep canyon topography · Placer & El Dorado National Forest Units', press: 'CAL FIRE NEU / USFS Tahoe National Forest' },
  { name: 'Dixie Fire (963,309 acres)', place: 'Feather River Canyon, Butte/Plumas · 39.872°N 121.348°W', coords: [-121.348, 39.872] as [number, number], time: 'July-Oct 2021', note: 'Second largest fire in recorded CA history · Extreme pyroCB generation', press: 'CAL FIRE / USFS Incident Forensic Review' },
  { name: 'SCU Lightning Complex (396,624 acres)', place: 'Santa Clara / Alameda / Stanislaus · 37.432°N 121.455°W', coords: [-121.455, 37.432] as [number, number], time: 'Aug-Oct 2020', note: 'Historic dry lightning siege across Diablo Range chaparral', press: 'CAL FIRE SCU Operational Record' },
  { name: 'Camp Fire (153,336 acres)', place: 'Paradise / Concow, Butte County · 39.789°N 121.528°W', coords: [-121.528, 39.789] as [number, number], time: 'Nov 2018', note: 'Jarbo gap downslope offshore windstorm · Complete WUI envelope involvement', press: 'NIST Wildfire Investigation Report (Special Pub 1244)' },
]
// California Critical Infrastructure & Wildland-Urban Interface Assets
const CIV_FIRES = [
  { kind: '⚡', name: 'Caribou-Palermo Power Transmission Path', place: 'Feather River Canyon · 39.88°N 121.35°W', coords: [-121.35, 39.88] as [number, number], time: 'Infrastructure Corridor', note: 'Critical regional power transmission backbone traversing steep rugged timber canyon' },
  { kind: '🏥', name: 'Feather River Health Center Zone', place: 'Paradise WUI · 39.76°N 121.61°W', coords: [-121.61, 39.76] as [number, number], time: 'Healthcare Facility WUI', note: 'WUI designated safety zone and community evacuation staging asset' },
  { kind: '🚒', name: 'CAL FIRE Station 35 (Paradise)', place: 'Butte Unit · 39.77°N 121.59°W', coords: [-121.59, 39.77] as [number, number], time: 'CAL FIRE Headquarters', note: 'Primary engine strike team staging and dispatch node' },
]
// High Fire Danger Zones — High Risk Priority Areas
const RISK_ZONES = [
  { name: 'Priority: Butte Creek Canyon WUI', place: 'Butte County · 39.75°N 121.72°W', coords: [-121.72, 39.75] as [number, number], note: 'Severe slope alignment, heavy chaparral & brush fuel bed, offshore wind funneling', press: 'CAL FIRE Butte County Fire Plan' },
  { name: 'Priority: Middle Fork Feather River', place: 'Plumas County · 39.83°N 121.15°W', coords: [-121.15, 39.83] as [number, number], note: 'Dense mixed-conifer dead timber loading from prolonged drought stress', press: 'USFS Plumas National Forest Assessment' },
  { name: 'Priority: Cohasset Ridge WUI', place: 'Upper Tehama/Butte Line · 39.92°N 121.73°W', coords: [-121.73, 39.92] as [number, number], note: 'Chamise & manzanita chaparral with rapid flame front potential during north wind events', press: 'CAL FIRE Unit Fire Hazard Severity Zone' },
]

// Monitored Tactical Sectors — Real-time telemetry monitoring points
const DEMO_ALERTS = [
  { village: 'Cohasset Ridge', commune: 'Butte County', village_coords: [-121.73, 39.92], fire_coords: [-121.74, 39.93], distance_km: 1.8, acq_date: new Date().toISOString().slice(0, 10), confidence: 'h', level: 'WARNING' },
  { village: 'Paradise East WUI', commune: 'Butte County', village_coords: [-121.59, 39.76], fire_coords: [-121.53, 39.78], distance_km: 4.2, acq_date: new Date().toISOString().slice(0, 10), confidence: 'n', level: 'WATCH' },
  { village: 'Magalia Ridge', commune: 'Butte County', village_coords: [-121.60, 39.81], fire_coords: [-121.57, 39.84], distance_km: 5.1, acq_date: new Date().toISOString().slice(0, 10), confidence: 'n', level: 'WATCH' },
  { village: 'Quincy Perimeter', commune: 'Plumas County', village_coords: [-120.94, 39.93], fire_coords: [-120.90, 39.97], distance_km: 6.8, acq_date: new Date().toISOString().slice(0, 10), confidence: 'n', level: 'WATCH' },
]

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && 
  !((import.meta as any).env?.VITE_API_BASE)
const API = (isLocalhost ? '' : API_BASE).replace(/[\r\n]/g, "").trim().replace(/\/$/, "")
const TILE_FIX = (url: string) => url.replace(/[\r\n]/g, "").trim()

// NFDRS hazard rating vector points — georeferenced, no zoom drift

export default function MapView({ onSelect }: { onSelect?: (type:string, id:string)=>void }) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  const { 
    activeRegion, 
    activeRegionId, 
    activeCoords, 
    selectCounty, 
    selectSector, 
    selectIncident 
  } = useGeographyStore()

  const [_base] = useState<'streets'|'satellite'>('streets')
  void _base
  // Priority 1: Default Esri World Imagery (highest stability)
  const [baseXyz, setBaseXyz] = useState<string>('esri')
  const [activeSat, setActiveSat] = useState<Record<string, boolean>>({})

  const [dateRange, setDateRange] = useState<'latest'|'7d'|'30d'|'3m'|'custom'>('30d')
  const [cloud, setCloud] = useState(20)
  const [info, setInfo] = useState<any>(null)
  const [pixel] = useState<any>(null)
  void pixel
  const [liveStatus, setLiveStatus] = useState<'LIVE'|'CACHED'|'STALE'|'CONFIGURATION_REQUIRED'|'UNAVAILABLE'|'DEMO'>('UNAVAILABLE')
  const [now, setNow] = useState(new Date())
  const [tickerIdx, setTickerIdx] = useState(0)
  const [showLayers, setShowLayers] = useState(false)
  const [showBounds, setShowBounds] = useState(true)
  // 3D terrain (MapLibre terrain, free Terrarium DEM — no key required)
  const [terrain3d, setTerrain3d] = useState(false)
  useEffect(()=>{
    const map = mapRef.current as any
    if(!map) return
    try{
      if(terrain3d){
        if(!map.getSource('terrain-dem')){
          map.addSource('terrain-dem', { type:'raster-dem', tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], tileSize:256, maxzoom:15, encoding:'terrarium' } as any)
        }
        map.setTerrain({ source:'terrain-dem', exaggeration:1.2 })
        map.easeTo({ pitch: 60, duration: 1200 })
      }else{
        map.setTerrain(null)
        try{ map.easeTo({ pitch: 0, duration: 800 }) }catch{}
      }
    }catch(e){ console.warn('3D terrain failed', e); setTerrain3d(false) }
  },[terrain3d])
  // Fire spread simulation results (polygons + affected sectors)
  const [spreadInfo, setSpreadInfo] = useState<any>(null)
  const runSpread = async (lon:number, lat:number)=>{
    try{
      setSpreadInfo({ loading:true })
      const r = await fetch(TILE_FIX(`${API}/api/fire/spread`), { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ lon, lat, hours:[1,3,6] }) })
      const j = await r.json()
      const map = mapRef.current as any
      if(map){
        try{ if(map.getLayer('spread-fill')) map.removeLayer('spread-fill'); if(map.getSource('spread-src')) map.removeSource('spread-src') }catch{}
        const feats = (j.steps || []).map((s:any)=> ({ type:'Feature', properties:{ hour:s.hour, area_ha:s.area_ha },
          geometry: s.polygon }))
        map.addSource('spread-src', { type:'geojson', data:{ type:'FeatureCollection', features: feats } } as any)
        map.addLayer({ id:'spread-fill', type:'fill', source:'spread-src', paint:{ 'fill-color':'#DC2626', 'fill-opacity':0.35, 'fill-outline-color':'#7F1D1D' } } as any)
      }
      setSpreadInfo(j)
    }catch(e:any){ setSpreadInfo({ error: String(e.message || e).slice(0, 200) }) }
  }
  useEffect(()=>{
    const map = mapRef.current
    if(!map) return
    for(const id of ['boundary-fill','boundary','province-label','communes-fill','communes-casing','communes-line','communes-label']){
      try{ if(map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showBounds ? 'visible' : 'none') }catch{}
    }
  },[showBounds])
  const communesRef = useRef<any>(null)
  const communeFireClickRef = useRef<any>(null)
  const [communesCount, setCommunesCount] = useState<number>(0)
  const [communesError, setCommunesError] = useState<string>('')
  // Fire danger level per sector: 'live' = API returned, 'degraded' = API failed/missing. Never show mock data as real.
  const [levelsState, setLevelsState] = useState<'loading'|'live'|'degraded'>('loading')
  const [search, setSearch] = useState('')
  const [suggests, setSuggests] = useState<any[]>([])
  const { state: locState, request: requestLoc } = useLocation()

  // Static asset URL resolver
  const assetUrl = (f:string)=>{
    const b = ((import.meta as any).env?.BASE_URL || '/') as string
    return (b.endsWith('/') ? b : b + '/') + f
  }
  // Case-insensitive accent-folded search
  const normVi = (s:string)=> (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  // Cache-buster for static GeoJSON
  const GEOJSON_V = 'v4'
  const fetchJson = async (files:string[])=>{
    let last:any = null
    for(const f of files){
      const busted = f.includes('?') ? f : `${f}?v=${GEOJSON_V}`
      for(const u of [assetUrl(busted), busted, '/' + busted]){
        try{ const r = await fetch(u); if(r.ok) return await r.json() }catch(e){ last = e }
      }
    }
    throw last || new Error('fetch failed: ' + files.join(','))
  }
  // Push raster background to bottom — vector layers never obscured
  const lowerBase = (map:any)=>{
    try{
      if(!map.getLayer('base-xyz')) return
      const layers = (map.getStyle()?.layers || []).map((l:any)=> l.id)
      const firstOverlay = layers.find((id:string)=> id !== 'base-xyz' && id !== 'osm')
      if(firstOverlay) map.moveLayer('base-xyz', firstOverlay)
    }catch{}
  }
  // Wait for style load before addSource/addLayer
  const whenLoaded = async (map:any)=>{
    if(map.isStyleLoaded()) return
    await new Promise<void>(res=>{ try{ map.once('load', ()=> res()) }catch{ res() } })
  }
  const isInsideCalifornia = (lon: number, lat: number) => {
    return lat >= 32.5 && lat <= 42.0 && lon >= -124.5 && lon <= -114.1
  }
  const LEVEL_EN: Record<string,string> = { I:'Low', II:'Moderate', III:'High', IV:'Very High', V:'Extreme / Red Flag' }
  const hazardEn = (t:string)=> ({ FIRE:'Wildfire', FLOOD:'Flood', LANDSLIDE:'Landslide', DROUGHT:'Drought', HEAT:'Extreme Heat', STORM:'Severe Storm' } as any)[t] || t
  const LEVEL_COLOR: Record<string,string> = { I:'#0EA5E9', II:'#10B981', III:'#F59E0B', IV:'#F97316', V:'#DC2626' }
  
  // County / Sector Popup + AI multi-spectral diagnostic
  const communePopup = async (f:any, lngLat:any, map:any)=>{
    if (!isInsideCalifornia(lngLat[0], lngLat[1])) return
    const countyName = f.name || f.fullName || f.NAME || f.ten_xa || 'California County'
    const agency = f.agencyUnit || 'CAL FIRE State Responsibility Area'
    const base = `<div style="font-family:Inter,sans-serif"><b>${countyName}</b><br/><span style="font-size:11px;color:#64748B">${agency}</span>`
    const popup = new (maplibregl as any).Popup({ closeButton:true, maxWidth:'320px' }).setLngLat(lngLat).setHTML(base + `<br/>⏳ AI multi-spectral diagnostic in progress...</div>`).addTo(map)
    window.dispatchEvent(new CustomEvent('ecochain-select-area', { detail:{ area: countyName, lat: lngLat[1], lon: lngLat[0] } }))
    onSelectRef.current?.('county', countyName)
    try{
      const [fr, ds] = await Promise.all([
        fetch(TILE_FIX(`${API}/api/fire/risk?administrative_unit_id=${encodeURIComponent(countyName)}&lat=${lngLat[1].toFixed(4)}&lon=${lngLat[0].toFixed(4)}`)).then(r=>r.json()).catch(()=> null),
        fetch(TILE_FIX(`${API}/api/disaster/summary?administrative_unit_id=${encodeURIComponent(countyName)}&lat=${lngLat[1].toFixed(4)}&lon=${lngLat[0].toFixed(4)}`)).then(r=>r.json()).catch(()=> null),
      ])
      if(!fr) throw new Error('unavailable')
      const j = fr
      const lv = j.warning_level || 'I', c = LEVEL_COLOR[lv] || '#64748B'
      const ev = j.evidence || {}
      const n = Array.isArray(ev.hotspots) ? ev.hotspots.length : (ev.hotspots ?? 0)
      const sigs = (ds?.signals || []).filter((s:any)=> s.risk_type !== 'FIRE').slice(0,4)
      const sigHtml = sigs.length ? `<div style="font-size:11px;color:#334155;margin-top:4px">🛡️ Multi-Hazard (DisasterGuard): ${sigs.map((s:any)=> `${hazardEn(s.risk_type)} <b>${s.score}</b>`).join(' · ')}</div>` : ''
      const miss = Array.isArray(j.missing) && j.missing.length ? `<div style="font-size:10px;color:#B45309;margin-top:2px">Missing: ${j.missing.join(', ')} — confidence downgraded</div>` : ''
      popup.setHTML(base + `<br/><div style="margin-top:6px;display:flex;gap:6px;align-items:center"><span style="background:${c};color:#fff;font-weight:800;font-size:12px;padding:2px 10px;border-radius:999">CLASS ${lv} · ${LEVEL_EN[lv]||''}</span><span style="font-size:11px">Risk <b>${j.risk_score ?? '?'}/100</b></span><span style="font-size:10px;background:${j.status==='LIVE'?'#DCFCE7':'#FEF3C7'};padding:2px 6px;border-radius:999">${j.status||''}</span></div><div style="font-size:11px;color:#334155;margin-top:4px">🛰️ NDVI ${ev.satellite?.ndvi ?? '?'} · ${ev.weather?.temperature ?? '?'}°C · FIRMS ${n} detection(s) · Confidence ${j.confidence ?? '?'}%</div>${sigHtml}${miss}<div style="font-size:10px;color:#64748B">${Object.keys(j.factors||{}).join(', ')}</div><div data-brief="1" style="font-size:11px;color:#64748B;margin-top:4px">⏳ Retrieving 14-day antecedent telemetry…</div></div>`)
      // County Intelligence Brief
      fetch(TILE_FIX(`${API}/api/fire/brief?administrative_unit_id=${encodeURIComponent(countyName)}&lat=${lngLat[1].toFixed(4)}&lon=${lngLat[0].toFixed(4)}`)).then(r=> r.ok ? r.json() : null).then((b:any)=>{
        if(!b) return
        const el = popup.getElement()?.querySelector('[data-brief]')
        if(!el) return
        const reasons = (b.reasons || []).map((x:string)=> `<li>${x}</li>`).join('')
        const watch = (b.watch_communes || []).map((w:any)=> w.name).join(' · ')
        el.innerHTML = `📋 <b>Sector Intelligence Brief</b> — 14d Precipitation: <b>${b.rain_14d_mm ?? '?'} mm</b> (${b.dry_days ?? '?'} dry days) · Proximate FIRMS Detections: <b>${b.firms_nearby ?? 0}</b>${reasons ? `<ul style="margin:4px 0 4px 16px;padding:0">${reasons}</ul>` : ''}${watch ? `<div>Watch Corridors: ${watch}</div>` : ''}`
      }).catch(()=> {
        try{ const el = popup.getElement()?.querySelector('[data-brief]'); if(el) el.innerHTML = '' }catch{}
      })
      // Static satellite thumbnail — only if live URL returned
      fetch(TILE_FIX(`${API}/api/forest/satellite/thumbnail?lat=${lngLat[1].toFixed(4)}&lon=${lngLat[0].toFixed(4)}`)).then(r=> r.ok ? r.json() : null).then((t:any)=>{
        const url = t?.thumbnail_url
        if(!url || !String(url).startsWith('http')) return
        const el = popup.getElement()?.querySelector('[data-brief]')
        if(!el) return
        const img = document.createElement('img')
        img.src = url
        img.alt = 'Regional Satellite Imagery'
        img.loading = 'lazy'
        img.style.cssText = 'width:100%;border-radius:8px;margin-top:6px;display:block'
        el.appendChild(img)
      }).catch(()=> {})
    }catch{ popup.setHTML(base + `<br/><span style="font-size:11px;color:#B45309">AI copilot currently unavailable — please retry shortly</span></div>`) }
  }
  const communeBounds = (feat:any)=>{
    let minx=1e9, miny=1e9, maxx=-1e9, maxy=-1e9
    const walk=(c:any)=>{ if(typeof c[0]==='number'){ if(c[0]<minx)minx=c[0]; if(c[0]>maxx)maxx=c[0]; if(c[1]<miny)miny=c[1]; if(c[1]>maxy)maxy=c[1] } else c.forEach(walk) }
    walk(feat.geometry.coordinates)
    return [[minx,miny],[maxx,maxy]]
  }
  const selectCommune = (props:any)=>{
    const map = mapRef.current
    if(!map || !communesRef.current) return
    const targetName = String(props.name || props.fullName || props.NAME || props.ten_xa || '').toLowerCase()
    const feat = communesRef.current.features?.find((f:any)=> {
      const fn = String(f.properties?.name || f.properties?.fullName || f.properties?.NAME || '').toLowerCase()
      return fn === targetName || (targetName && fn.includes(targetName))
    })
    if(!feat || !feat.geometry){
      void new (maplibregl as any).Popup({ closeButton:true, maxWidth:'300px' })
        .setLngLat(map.getCenter() as any)
        .setHTML(`<div style="font-family:Inter,sans-serif"><b>${props.name || props.fullName || ''}</b><br/><span style="font-size:11px;color:#B45309">Boundary polygon not currently loaded on map view.</span></div>`)
        .addTo(map)
      setSuggests([]); setSearch(props.name || props.fullName || '')
      return
    }
    try{
      map.fitBounds(communeBounds(feat) as any, { padding:40, duration:800 })
      const cx=(communeBounds(feat)[0][0]+communeBounds(feat)[1][0])/2, cy=(communeBounds(feat)[0][1]+communeBounds(feat)[1][1])/2
      communePopup(feat.properties, [cx,cy], map)
    }catch{}
    setSuggests([]); setSearch(props.name || props.fullName || '')
  }

  // Tactical Watch on suspected thermal detection
  const watchFire = async (a:any)=>{
    const map = mapRef.current
    const flon = a.fire_coords?.[0], flat = a.fire_coords?.[1]
    if(map && flon && flat && isInsideCalifornia(flon, flat)){
      try{ map.flyTo({ center:[flon, flat], zoom:12, duration:1200 }) }catch{}
      try{
        void new (maplibregl as any).Popup({ closeButton:true, maxWidth:'320px' })
          .setLngLat([flon, flat] as any)
          .setHTML(`<div style="font-family:Inter,sans-serif; min-width:220px"><b>🔥 Thermal Anomaly near ${a.village || a.community_name || ''}</b><br/>${a.commune || a.county || ''} · ${a.distance_km ?? '?'} km away<br/>🕒 Acquired: ${a.acq_date || ''} · Confidence: ${a.confidence || '?'}<br/>📍 ${Number(flat).toFixed(4)}, ${Number(flon).toFixed(4)}</div>`)
          .addTo(map)
      }catch{}
    }
    onSelectRef.current?.('watch', a.village || a.commune || '')
    window.dispatchEvent(new CustomEvent('ecochain-select-area', { detail:{ area: a.village || a.commune, lat: flat, lon: flon } }))
    setInfo({ layer:'watch', status:'ANALYZING', source:'FIRMS + Sentinel-2 + FireRisk', village:a.village, commune:a.commune,
      fire:{ lon:flon, lat:flat, date:a.acq_date, distance_km:a.distance_km, confidence:a.confidence } })
    let sentinel:any = { status:'UNAVAILABLE' }
    try{
      if(flon && flat){
        const d=0.05
        const r=await fetch(TILE_FIX(`${API}/api/v1/satellite/ndvi?bbox=${flon-d},${flat-d},${flon+d},${flat+d}`))
        const j=await r.json()
        sentinel={ status:j.status, source:j.source || 'Sentinel Hub', ndvi:j.ndvi, acquired:j.acquired || j.acquired_at, reason:j.reason }
      }
    }catch(e){ sentinel={ status:'UNAVAILABLE', reason:String(e) } }
    let model:any = { status:'UNAVAILABLE' }
    try{
      const r=await fetch(TILE_FIX(`${API}/api/fire/risk?administrative_unit_id=${encodeURIComponent(a.commune || a.village || '')}&lat=${flat || 39.789}&lon=${flon || -121.528}`))
      const j=await r.json()
      model={ status:j.status, risk_score:j.risk_score, warning_level:j.warning_level, label:j.label, confidence:j.confidence }
    }catch(e){ model={ status:'UNAVAILABLE', reason:String(e) } }
    setInfo((prev:any)=> prev && prev.layer==='watch'
      ? { ...prev, status: model.status && model.status !== 'UNAVAILABLE' ? model.status : 'CACHED', sentinel, model }
      : prev)
  }

  // Header search → fly to county / coords
  useEffect(()=>{
    const h = (e:any)=>{
      const d = e.detail || {}
      const map = mapRef.current
      try{
        const feats = communesRef.current?.features || []
        const q = String(d.name || '').toLowerCase()
        const f = feats.find((x:any)=>{
          const n = String(x.properties?.name || x.properties?.fullName || '').toLowerCase()
          return n && (n.includes(q) || (q && n.startsWith(q.slice(0, 6))))
        })
        if(f && map){ selectCommune(f.properties); return }
      }catch{}
      if(d.lat && d.lng && map && isInsideCalifornia(d.lng, d.lat)){
        try{
          map.flyTo({ center:[d.lng, d.lat], zoom:12, duration:1200 })
          void new (maplibregl as any).Popup({ closeButton:true, maxWidth:'300px' })
            .setLngLat([d.lng, d.lat] as any)
            .setHTML(`<div style="font-family:Inter,sans-serif"><b>${d.name || 'Location'}</b><br/><span style="font-size:11px;color:#64748B">${d.level || d.type || ''} · ${d.lat}, ${d.lng}</span></div>`)
            .addTo(map)
        }catch{}
        window.dispatchEvent(new CustomEvent('ecochain-select-area', { detail:{ area: d.name, lat: d.lat, lon: d.lng } }))
        onSelectRef.current?.('search', d.name || '')
      }
    }
    window.addEventListener('ecochain-search' as any, h)
    return ()=> window.removeEventListener('ecochain-search' as any, h)
  },[])

  // Ticker powered by REAL DATA (authoritative warnings + active alerts).
  // Shows a single connecting state line when not yet loaded, never invented mock alerts.
  const [tickerLines, setTickerLines] = useState<string[]>(['⏳ Connecting to live operational telemetry stream…'])
  useEffect(()=>{
    Promise.all([
      fetch(`${API}/api/fire/warnings`).then(r=> r.ok ? r.json() : []).catch(()=> []),
      api.alertList('ACTIVE').catch(()=> []),
    ]).then(([warns, alerts]: any[])=>{
      const lines: string[] = []
      ;(Array.isArray(warns) ? warns : []).slice(0,3).forEach((w:any)=>{
        const scope = String(w.scope || '').split(';')[0].slice(0, 80)
        lines.push(`🔥 NFDRS CLASS ${w.level || '?'} — ${scope} (${String(w.source || '').slice(0, 32)})`)
      })
      ;(Array.isArray(alerts) ? alerts : []).slice(0,3).forEach((a:any)=>{
        lines.push(`⚠️ ${a.title || 'Priority Alert'} — ${a.administrative_unit_id || ''}`)
      })
      if(lines.length) setTickerLines(lines)
      else setTickerLines(['✓ No active emergency wildfire warnings in California scope — continuous surveillance active'])
    }).catch(()=> {})
  },[])

  useEffect(()=>{
    const id=setInterval(()=> setNow(new Date()), 1000)
    return ()=> clearInterval(id)
  },[])
  useEffect(()=>{
    const id=setInterval(()=> setTickerIdx(i=> (i+1)%tickerLines.length), 3500)
    return ()=> clearInterval(id)
  },[])

  const dateParams = ()=>{
    const d=new Date()
    const fmt=(x:Date)=> x.toISOString().slice(0,10)
    if(dateRange==='latest') return { start: fmt(new Date(d.getTime()-30*24*3600*1000)), end: fmt(d) }
    if(dateRange==='7d') return { start: fmt(new Date(d.getTime()-7*24*3600*1000)), end: fmt(d) }
    if(dateRange==='30d') return { start: fmt(new Date(d.getTime()-30*24*3600*1000)), end: fmt(d) }
    if(dateRange==='3m') return { start: fmt(new Date(d.getTime()-90*24*3600*1000)), end: fmt(d) }
    return { start:'2026-08-01', end:'2026-09-01' }
  }

  // XYZ Tile URLs — Esri default, OSM fallback
  const XYZ_TILES: Record<string, { url: string, attribution: string }> = {
    esri: { url: TILE_FIX('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'), attribution: '© Esri World Imagery' },
    osm: { url: TILE_FIX('https://tile.openstreetmap.org/{z}/{x}/{y}.png'), attribution: '© OpenStreetMap' },
    eox: { url: TILE_FIX('https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg'), attribution: '© EOX Sentinel-2 cloudless' },
  }
  const DEFAULT_TILE_URL = XYZ_TILES.esri.url
  void DEFAULT_TILE_URL
  // Styles requiring no proprietary API key from CARTO/OSM
  const baseStyles: Record<string, string> = {
    streets: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    satellite: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    terrain: 'https://demotiles.maplibre.org/style.json',
  }
  void baseStyles

  const fetchTile = async (layer:string)=>{
    const { start, end } = dateParams()
    const bounds = mapRef.current ? mapRef.current.getBounds() : null
    const params = new URLSearchParams({ layer, lat:'39.75', lon:'-121.60', start, end, cloud: String(cloud) })
    if(bounds){
      params.set('north', String(bounds.getNorth())); params.set('south', String(bounds.getSouth()))
      params.set('east', String(bounds.getEast())); params.set('west', String(bounds.getWest()))
    }
    try{
      const r=await fetch(TILE_FIX(`${API}/api/satellite/tile/${layer}?${params}`))
      if(!r.ok) throw new Error('GEE Service unavailable')
      const j=await r.json()
      if(j.tile_url) j.tile_url = TILE_FIX(j.tile_url)
      return j
    }catch(e){
      console.warn(`Layer ${layer} unavailable (Fallback to BaseMap):`, e)
      return { status:'UNAVAILABLE', error:String(e) }
    }
  }

  // 🛡️ Fallback handling when Backend GEE returns CONFIGURATION_REQUIRED
  const addGEETileLayer = async (layerId: string, tileType: string) => {
    const map = mapRef.current
    if (!map) return
    try {
      const res = await fetch(TILE_FIX(`${API}/api/satellite/tile/${tileType}?layer=${tileType}&lat=39.75&lon=-121.60&start=2026-08-10&end=2026-09-03&cloud=20`))
      if (!res.ok) throw new Error('GEE Service unavailable')
      const data = await res.json()
      if (data.tile_url) {
        const url = TILE_FIX(data.tile_url)
        if (map.getSource(layerId)) {
          (map.getSource(layerId) as maplibregl.RasterTileSource).setTiles([url])
        } else {
          map.addSource(layerId, { type:'raster', tiles:[url], tileSize:256 })
          map.addLayer({ id:layerId, type:'raster', source:layerId, paint:{ 'raster-opacity': 0.8 } })
        }
      }
    } catch (err) {
      console.warn(`Layer ${tileType} unavailable (Fallback to BaseMap):`, err)
    }
  }
  void addGEETileLayer

  const switchBaseXyz = (id: string)=>{
    setBaseXyz(id)
  }

  // Effect 2 — switch basemap without destroying map instance
  useEffect(()=>{
    const map = mapRef.current
    if(!map) return
    if(!map.isStyleLoaded()) {
      map.once('load', ()=> switchBaseXyz(baseXyz))
      return
    }
    const sourceId = "base-xyz"
    const layerId = "base-xyz"
    if(map.getLayer(layerId)) try{ map.removeLayer(layerId)}catch{}
    if(map.getSource(sourceId)) try{ map.removeSource(sourceId)}catch{}
    if(baseXyz==='carto') return
    const tile = XYZ_TILES[baseXyz]
    if(!tile) return
    // Fallback Esri → OSM → static — raster background stays below vector layers
    try{
      map.addSource(sourceId, { type:'raster', tiles:[TILE_FIX(tile.url)], tileSize:256, attribution: tile.attribution } as any)
      map.addLayer({ id: layerId, type:'raster', source: sourceId } as any)
      lowerBase(map)
    }catch(e){
      console.warn('Base tile add failed, fallback OSM', e)
      const osm = XYZ_TILES.osm
      try{
        map.addSource(sourceId, { type:'raster', tiles:[osm.url], tileSize:256, attribution: osm.attribution } as any)
        map.addLayer({ id: layerId, type:'raster', source: sourceId } as any)
        lowerBase(map)
      }catch{}
    }
  }, [baseXyz])

  const hotspotMarkers = useRef<any[]>([])
  const [hotCount, setHotCount] = useState(0)
  const [opacity, setOpacity] = useState(0.85)
  const applyOpacity = (v: number)=>{
    setOpacity(v)
    const map = mapRef.current
    if(!map) return
    for(const id of ['ndvi', 's1', 'gibs_truecolor', 'gibs_burnscar']){
      try{ if(map.getLayer(id)) map.setPaintProperty(id, 'raster-opacity', v) }catch{}
    }
  }
  const fitHotspots = ()=>{
    const map = mapRef.current
    const pts = hotspotMarkers.current
      .map((m:any)=> { try{ const l = m.getLngLat(); return [l.lng, l.lat] }catch{ return null } })
      .filter(Boolean) as [number, number][]
    if(map && pts.length){
      const lons = pts.map(p=> p[0]), lats = pts.map(p=> p[1])
      try{ map.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding:60, duration:1000 }) }catch{}
    }
  }
  const ndviValue = (n: any): number | null =>{
    if(typeof n === 'number') return n
    if(n && typeof n.mean === 'number') return n.mean
    return null
  }
  const toggleSat = async (key:string, geeLayer:string)=>{
    const checked = !activeSat[key]
    setActiveSat(s=> ({...s, [key]: checked}))
    if(!checked){
      if(key==='hotspot'){
        hotspotMarkers.current.forEach((m:any)=>{ try{ m.remove() }catch{} }); hotspotMarkers.current=[]
        setHotCount(0)
        setInfo(null)
        return
      }
      if(mapRef.current?.getLayer(key)) try{ mapRef.current.removeLayer(key) }catch{}
      if(mapRef.current?.getSource(key)) try{ mapRef.current.removeSource(key) }catch{}
      return
    }
    // NASA GIBS Satellite Optical & False-Color Imagery (VIIRS 375m & MODIS 250m)
    if(key==='gibs_truecolor' || key==='gibs_burnscar'){
      const gibsLayer = key==='gibs_truecolor' ? 'VIIRS_NOAA20_CorrectedReflectance_TrueColor' : 'MODIS_Terra_CorrectedReflectance_Bands721'
      // Use latest completed daily global mosaic date (yesterday if early UTC)
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      const gibsDate = (dateParams().end && dateParams().end <= yesterdayStr) ? dateParams().end : yesterdayStr
      const map = mapRef.current
      if(map){
        if(map.getLayer(key)) try{ map.removeLayer(key) }catch{}
        if(map.getSource(key)) try{ map.removeSource(key) }catch{}
        map.addSource(key, {
          type: 'raster',
          tiles: [TILE_FIX(`${API}/api/satellite/gibs-tile/${gibsLayer}/${gibsDate}/{z}/{x}/{y}.jpg`)],
          tileSize: 256,
          minzoom: 1,
          maxzoom: 9,
          attribution: '© NASA GIBS / EOSDIS'
        } as any)
        map.addLayer({
          id: key,
          type: 'raster',
          source: key,
          paint: { 'raster-opacity': opacity }
        } as any)
        lowerBase(map)
        setLiveStatus('LIVE')
        setInfo({
          layer: key,
          status: 'LIVE',
          source: 'NASA GIBS (WMTS)',
          satellite: key==='gibs_truecolor' ? 'NOAA-20 VIIRS (375m)' : 'Terra MODIS (250m)',
          acquired: gibsDate,
          product: key==='gibs_truecolor' ? 'Category B: True-Color Corrected Reflectance' : 'Category C: False-Color Bands 7-2-1 (Burn Scars)'
        })
      }
      return
    }

    // Hotspot: NASA FIRMS Multi-Sensor Live Satellite Radar (VIIRS 375m + MODIS 1km)
    if(key==='hotspot'){
      try{
        const r=await fetch(TILE_FIX(`${API}/api/fire/satellite/detections?day_range=1&t=${Date.now()}`), { cache: 'no-store' })
        const data=await r.json()
        if(data.status==='LIVE' || data.status==='CACHED' || data.status==='DEMO'){
          const fires = data.fires || []
          fires.slice(0, 150).forEach((f:any)=>{
            const lng = f.longitude || f.coordinates?.[0] || -121.528, lat = f.latitude || f.coordinates?.[1] || 39.789
            if (!isInsideCalifornia(lng, lat)) return
            const artificial = f.suspect_artificial
            const el=document.createElement('div')
            el.style.width = artificial ? '12px' : '14px'
            el.style.height = artificial ? '12px' : '14px'
            el.style.borderRadius = '999px'
            el.style.background = artificial ? '#D97706' : '#DC2626'
            el.style.border = '2px solid #fff'
            el.style.boxShadow = artificial ? '0 0 6px rgba(217,119,6,0.8)' : '0 0 8px rgba(220,38,38,0.8)'
            el.style.cursor = 'pointer'
            el.title = `${f.satellite || 'VIIRS'} Thermal Radiance (${f.brightness ?? '?'} K)`

            const m=new (maplibregl as any).Marker({ element: el }).setLngLat([lng, lat] as any).addTo(mapRef.current)
            el.addEventListener('click', ()=>{
              const conf = String(f.confidence || 'nominal').toUpperCase()
              const head = artificial
                ? `<b>🌡️ Suspected Artificial Heat Emitter</b><br/><span style="font-size:11px;color:#92400E">Proximate to ${f.artificial_source?.name || 'industrial emitter'} (${f.artificial_source?.distance_km ?? '?'} km) — <b>filtered from active wildfire list</b></span>`
                : `<b>🔥 Satellite Thermal Hotspot (NASA FIRMS)</b>`
              const ageStr = f.observation_age_hours ? ` (${f.observation_age_hours}h ago)` : ''
              const defaultDate = new Date().toISOString().slice(0, 10)
              const worldViewUrl = `https://worldview.earthdata.nasa.gov/?v=${(lng-0.5).toFixed(3)},${(lat-0.35).toFixed(3)},${(lng+0.5).toFixed(3)},${(lat+0.35).toFixed(3)}&l=VIIRS_NOAA20_CorrectedReflectance_TrueColor,MODIS_Terra_CorrectedReflectance_Bands721,VIIRS_SNPP_Thermal_Anomalies_375m_All&t=${f.acq_date || defaultDate}`

              const pop = new (maplibregl as any).Popup({ closeButton:true, maxWidth:'330px' })
                .setLngLat([lng, lat] as any)
                .setHTML(`<div style="font-family:Inter,sans-serif; min-width:240px">${head}<br/>Platform: <b>${f.satellite || 'VIIRS'}</b> (${f.instrument || 'VIIRS 375m'}) · Confidence: <b>${conf}</b><br/>🌡 Brightness Temp: <b>${f.brightness ?? '?'} K</b>${f.frp ? ` · FRP: <b>${f.frp} MW</b>` : ''}<br/>🕒 Overpass: <b>${f.acq_date || ''} ${f.acq_time || ''} UTC</b><span style="color:#64748B">${ageStr}</span><br/>📍 ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)} · Footprint: ${f.scan || 0.4}x${f.track || 0.38} km<br/><span style="font-size:10px;color:#64748B">Source: ${f.source_product || 'NASA FIRMS NRT'} · Category A Observed Telemetry</span><div style="display:flex;gap:6px;margin-top:6px"><button data-spread="1" style="background:#DC2626;color:#fff;border:0;border-radius:999;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer">🔥 Simulate Spread</button><a href="${worldViewUrl}" target="_blank" rel="noopener noreferrer" style="background:#0F766E;color:#fff;border-radius:999;padding:5px 10px;font-size:11px;font-weight:700;text-decoration:none;display:inline-block">🛰️ NASA Worldview</a></div></div>`)
                .addTo(mapRef.current)
              try{
                const btn = pop.getElement().querySelector('[data-spread]') as HTMLElement | null
                btn?.addEventListener('click', ()=> runSpread(lng, lat))
              }catch{}
              window.dispatchEvent(new CustomEvent('ecochain-select-area', { detail:{ area: `Thermal Hotspot ${Number(lat).toFixed(2)}, ${Number(lng).toFixed(2)}`, lat, lon: lng } }))
              onSelectRef.current?.('hotspot', `${lat},${lng}`)
            })
            hotspotMarkers.current.push(m)
          })
          const displayStatus = data.status
          setHotCount(fires.length)
          setLiveStatus(displayStatus as any)
          setInfo({
            layer: 'hotspot',
            status: displayStatus,
            source: 'NASA FIRMS',
            satellite: 'VIIRS 375m & MODIS 1km',
            acquired: data.latest_observation_utc || data.date || new Date().toISOString().slice(0,10),
            count: fires.length,
            bbox: data.bbox
          })
        } else {
          console.warn('FIRMS unavailable:', data.reason || data.error)
          setInfo({ layer:'hotspot', status: data.status || 'UNAVAILABLE', source:'NASA FIRMS', reason: data.reason || data.error })
        }
      }catch(err){
        console.warn('FIRMS hotspot error:', err)
        setInfo({ layer:'hotspot', status:'UNAVAILABLE', source:'NASA FIRMS', reason:String(err) })
      }
      return
    }
    // NDVI fallback: GEE tile UNAVAILABLE → Sentinel Hub NDVI stats
    if(key==='ndvi'){
      try{
        const res=await fetchTile(geeLayer)
        if(res.status==='LIVE' && res.tile_url && mapRef.current){
          if(mapRef.current?.getLayer(key)) try{ mapRef.current.removeLayer(key) }catch{}
          if(mapRef.current?.getSource(key)) try{ mapRef.current.removeSource(key) }catch{}
          mapRef.current.addSource(key, { type:'raster', tiles:[TILE_FIX(res.tile_url)], tileSize:256 })
          mapRef.current.addLayer({ id:key, type:'raster', source:key, paint:{ 'raster-opacity': 0.85 } } as any)
          setLiveStatus('LIVE'); setInfo({ layer: key, source: res.source || 'Sentinel-2', ...res, acquired: res.acquired || res.metadata?.acquired })
          return
        }
        // Fallback Sentinel Hub NDVI stats for California pilot
        console.warn(`NDVI GEE UNAVAILABLE, fallback Sentinel Hub`, res.reason)
        const r2=await fetch(TILE_FIX(`${API}/api/v1/satellite/ndvi?bbox=-124.48,32.53,-114.13,42.01`))
        const j2=await r2.json()
        setInfo({ layer:'ndvi', status: j2.status || 'DEMO', source: j2.source || 'Sentinel Hub', satellite: j2.satellite, acquired: j2.acquired || j2.acquired_at || new Date().toISOString().slice(0,10), ndvi: j2.ndvi, reason: j2.reason, bbox: j2.bbox })
        return
      }catch(err){
        console.warn('NDVI fallback error:', err)
        setInfo({ layer:'ndvi', status:'UNAVAILABLE', source:'Sentinel Hub', reason:String(err) })
        return
      }
    }
    try{
      const res=await fetchTile(geeLayer)
      if(res.status==='LIVE' && res.tile_url && mapRef.current){
        if(mapRef.current?.getLayer(key)) try{ mapRef.current.removeLayer(key) }catch{}
        if(mapRef.current?.getSource(key)) try{ mapRef.current.removeSource(key) }catch{}
        mapRef.current.addSource(key, { type:'raster', tiles:[TILE_FIX(res.tile_url)], tileSize:256 })
        mapRef.current.addLayer({ id:key, type:'raster', source:key, paint:{ 'raster-opacity': 0.85 } } as any)
        setLiveStatus('LIVE'); setInfo({ layer: key, source: res.source || 'Sentinel-2', ...res, acquired: res.acquired || res.metadata?.acquired })
      } else {
        console.warn(`Layer ${geeLayer} unavailable (Fallback to BaseMap):`, res.reason || res.error)
        setInfo({ layer: key, status: res.status || 'UNAVAILABLE', source: res.source || 'Sentinel-2', reason: res.reason || res.error, acquired: res.acquired || res.metadata?.acquired })
      }
    }catch(err){
      console.warn(`Layer ${geeLayer} error:`, err)
      setInfo({ layer: key, status:'UNAVAILABLE', reason:String(err) })
    }
  }

  const [sourceLive, setSourceLive] = useState<Record<string,string>>({})
  const [health, setHealth] = useState<any>(null)
  void health
  const [villages, setVillages] = useState<any[]>([])
  const [fireAlerts, setFireAlerts] = useState<any[]>([])
  // Reference sector labels shown only at close zoom (>=9) to avoid visual clutter
  const [mapZoom, setMapZoom] = useState(7.8)
  const [mode, setMode] = useState<string>(() => getMode())
  const [tourOpen, setTourOpen] = useState(false)
  const [bannerOff, setBannerOff] = useState<string>('')
  const burning = fireAlerts.filter((a:any)=>a.level==='CRITICAL' || a.level==='WARNING' || a.level==='ACTIVE')
  const suspicious = fireAlerts.filter((a:any)=>a.level!=='CRITICAL' && a.level!=='WARNING' && a.level!=='ACTIVE')
  const burnKey = burning.map((a:any)=>a.village).join('|')
  // Trigger resize after DOM mount
  useEffect(()=>{
    if(!mapRef.current) return
    const t=setTimeout(()=> mapRef.current?.resize(), 300)
    return ()=> clearTimeout(t)
  }, [])
  // Operational assets (watchtowers, cameras, water tanks, fire engines, pumps, crews, stations)
  // Only verified assets rendered — never fabricated markers.
  useEffect(()=>{
    let cancelled = false
    const ICON: Record<string,string> = { watchtower:'🗼', camera:'📷', water:'🌊', firetruck:'🚒', pump:'🔧', team:'⛺', station:'🏕️' }
    const TYPE_EN: Record<string,string> = { watchtower:'Lookout Tower', camera:'Remote Camera', water:'Water Cistern/Tank', firetruck:'Wildland Engine', pump:'Portable Pump', team:'Ranger Crew', station:'Fire Station' }
    const markers: any[] = []
    api.assetsList().then((rows: any)=>{
      if(cancelled || !mapRef.current || !Array.isArray(rows)) return
      // Water infrastructure assets
      try{
        fetch(`${API_BASE}/api/water/assets`).then(r=> r.ok ? r.json() : null).then((w:any)=>{
          const list = Array.isArray(w?.assets) ? w.assets : []
          if(cancelled || !mapRef.current) return
          list.forEach((a:any)=>{
            if(typeof a.latitude !== 'number' || typeof a.longitude !== 'number') return
            if(!isInsideCalifornia(a.longitude, a.latitude)) return
            const el = document.createElement('div')
            el.style.cssText = 'width:26px;height:26px;border-radius:999px;display:grid;place-items:center;background:#0369A1;color:#fff;font-size:14px;border:2px solid #fff;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.3)'
            el.textContent = a.asset_type === 'hydro' ? '⚡' : '🌊'
            el.title = `${a.name} (${a.capacity_m3 ? (a.capacity_m3 / 1e6).toFixed(1) + 'M m³' : 'Unknown capacity'})`
            const m = new (maplibregl as any).Marker({ element: el }).setLngLat([a.longitude, a.latitude] as any).addTo(mapRef.current!)
            markers.push(m)
            el.addEventListener('click', ()=>{
              void new (maplibregl as any).Popup({ closeButton:true, maxWidth:'300px' })
                .setLngLat([a.longitude, a.latitude] as any)
                .setHTML(`<div style="font-family:Inter,sans-serif"><b>🌊 ${a.name}</b><br/><span style="font-size:11px;color:#0369A1;font-weight:700">${a.asset_type} · ${a.status === 'verified' ? 'VERIFIED' : 'PENDING'}</span><br/><span style="font-size:11px;color:#334155">${a.capacity_m3 ? `Capacity: <b>${(a.capacity_m3 / 1e6).toFixed(1)}M m³</b>` : 'Capacity uncalibrated'}${a.water_area_ha ? ` · ${a.water_area_ha} ha` : ''}<br/>${a.manager || 'Agency'} · ${a.commune || 'California'}</span><br/><span style="font-size:10px;color:#64748B">📍 ${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}</span></div>`)
                .addTo(mapRef.current!)
            })
          })
        }).catch(()=> {})
      }catch{}
      rows.filter((a:any)=> a.status === 'active').forEach((a:any)=>{
        if(typeof a.latitude !== 'number' || typeof a.longitude !== 'number') return
        if(!isInsideCalifornia(a.longitude, a.latitude)) return
        const el = document.createElement('div')
        el.style.cssText = 'width:26px;height:26px;border-radius:999px;display:grid;place-items:center;background:#0B1412;color:#fff;font-size:14px;border:2px solid #fff;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.3)'
        el.textContent = ICON[a.asset_type] || '📍'
        el.title = `${a.name} (${TYPE_EN[a.asset_type] || a.asset_type})`
        const m = new (maplibregl as any).Marker({ element: el }).setLngLat([a.longitude, a.latitude] as any).addTo(mapRef.current!)
        markers.push(m)
        el.addEventListener('click', ()=>{
          const extra = [
            a.capacity_liters ? `Capacity: <b>${a.capacity_liters} L</b>` : '',
            a.coverage_radius_m ? `Coverage Radius: <b>${a.coverage_radius_m} m</b>` : '',
            a.note || '',
          ].filter(Boolean).join('<br/>')
          const pano = a.viewer_url ? `<br/><a href="${a.viewer_url}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:6px;background:#0F766E;color:#fff;border-radius:999;padding:6px 12px;font-size:11px;font-weight:700;text-decoration:none">🎥 View 360° Panoramic</a>` : `<br/><span data-assetphotos="1" style="font-size:10px;color:#64748B">Searching nearby field imagery…</span>`
          const pop = new (maplibregl as any).Popup({ closeButton:true, maxWidth:'300px' })
            .setLngLat([a.longitude, a.latitude] as any)
            .setHTML(`<div style="font-family:Inter,sans-serif"><b>${ICON[a.asset_type] || ''} ${a.name}</b><br/><span style="font-size:11px;color:#0F766E;font-weight:700">${TYPE_EN[a.asset_type] || a.asset_type} · ACTIVE</span><br/><span style="font-size:11px;color:#334155">${extra}</span><br/><span style="font-size:10px;color:#64748B">📍 ${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}</span>${pano}</div>`)
            .addTo(mapRef.current!)
          if(!a.viewer_url){
            api.recentPhotos(20).then((d:any)=>{
              const pRows = Array.isArray(d?.photos) ? d.photos : []
              const near = pRows.filter((p:any)=> Array.isArray(p.location) && typeof p.location[0] === 'number' &&
                Math.hypot((p.location[1] - a.longitude) * 100, (p.location[0] - a.latitude) * 100) < 15)
                .slice(0,3)
              const elx = pop.getElement()?.querySelector('[data-assetphotos]')
              if(!elx) return
              if(near.length === 0){ elx.innerHTML = 'No field imagery available nearby.'; return }
              elx.innerHTML = near.map((p:any)=> `<a href="${photoUrl(p.url)}" target="_blank" rel="noreferrer"><img src="${photoUrl(p.thumb_url || p.url)}" style="width:72px;height:54px;object-fit:cover;border-radius:6px;margin:2px;" /></a>`).join('')
            }).catch(()=> {
              try{ const elx = pop.getElement()?.querySelector('[data-assetphotos]'); if(elx) elx.innerHTML = '' }catch{}
            })
          }
        })
      })
      // Ingress / egress access routes (LineString) — rendered as lines, not markers
      try{
        const lines = (rows as any[]).filter((a:any)=> a.status === 'active' && a.geometry && (a.geometry.type === 'LineString' || a.geometry.type === 'MultiLineString'))
        if(lines.length && mapRef.current && !mapRef.current.getSource('asset-routes')){
          mapRef.current.addSource('asset-routes', { type:'geojson', data:{ type:'FeatureCollection', features: lines.map((a:any)=> ({ type:'Feature', properties:{ name:a.name }, geometry:a.geometry })) } } as any)
          mapRef.current.addLayer({ id:'asset-routes', type:'line', source:'asset-routes', paint:{ 'line-color':'#0F766E', 'line-width':3, 'line-dasharray':[2,1.5] } } as any)
        }
      }catch{}
      ;(mapRef.current as any)._assetMarkers = markers
    }).catch(()=> {})
    return ()=>{ cancelled = true; try{ ((mapRef.current as any)?._assetMarkers || []).forEach((m:any)=> m.remove()) }catch{} }
  },[])
  // Render California reference communities + 20km proximity circle
  useEffect(()=>{
    if(!mapRef.current || !villages.length) return
    const existing = (mapRef.current as any)._villageMarkers as any[] || []
    existing.forEach((m:any)=>{ try{ m.remove()}catch{} })
    ;(mapRef.current as any)._villageMarkers = []
    if(mapZoom < 9) return
    const markers:any[]=[]
    villages.forEach((v:any)=>{
      if(!v.coords || !isInsideCalifornia(v.coords[0], v.coords[1])) return
      const alert = fireAlerts.find((a:any)=> a.village===v.village || a.village===v.name || a.community_name===v.name)
      const el=document.createElement('div')
      el.style.padding='4px 6px'; el.style.borderRadius='8px'; el.style.fontSize='10px'; el.style.fontWeight='700'
      const isActive = alert && (alert.level==='ACTIVE' || alert.level==='WARNING' || alert.level==='CRITICAL')
      el.style.background= alert ? (isActive ? '#DC2626' : '#F59E0B') : 'rgba(255,255,255,0.95)'
      el.style.color= alert ? '#fff' : '#334155'; el.style.border= alert ? '2px solid #fff' : '1px solid #E2E8E5'
      el.style.boxShadow='0 2px 6px rgba(0,0,0,0.15)'; el.textContent= v.name || v.village
      if(alert) el.title=`${v.county || v.commune} — ${alert.distance_km} km from thermal anomaly ${alert.fire_coords?.join(',')} — ${alert.level}`
      const m=new (maplibregl as any).Marker({ element: el, anchor:'bottom' }).setLngLat(v.coords as any).addTo(mapRef.current!)
      markers.push(m)
      if(alert && !mapRef.current!.getSource(`circle-${v.id}`)){
        const circle: any = { type:'Feature', geometry:{ type:'Point', coordinates: v.coords }, properties:{ radius: 20 } }
        mapRef.current!.addSource(`circle-${v.id}`, { type:'geojson', data: circle })
        try{
          mapRef.current!.addLayer({ id:`circle-${v.id}`, type:'circle', source:`circle-${v.id}`, paint:{ 'circle-radius': 40, 'circle-color': isActive ? '#DC2626' : '#F59E0B', 'circle-opacity': 0.12, 'circle-stroke-width': 2, 'circle-stroke-color': isActive ? '#DC2626' : '#F59E0B' } })
        }catch{}
      }
    })
    ;(mapRef.current as any)._villageMarkers = markers
  }, [villages, fireAlerts, mapZoom])
  // Effect 1 — initialize map once — uses inline OSM style to avoid CORS issues
  useEffect(()=>{
    if(!mapContainer.current || mapRef.current) return
    const inlineStyle: any = {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.p14',
      sources: {
        osm: { type:'raster', tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize:256, attribution:'© OpenStreetMap' }
      },
      layers: [{ id:'osm', type:'raster', source:'osm' }]
    }
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: inlineStyle as any,
      center: [-120.75, 38.25],
      zoom: 6.8,
      maxBounds: [[-126.0, 31.0], [-113.0, 43.5]],
      attributionControl: false,
    })
    // Fallback if style fails → use Esri Satellite
    map.on('error', (e:any)=>{
      if(e?.error?.message?.includes('style') || e?.styleURL?.includes('cartocdn')){
        console.warn('Style error, fallback Esri Satellite', e)
        if(!map.getSource('base-xyz')){
          map.addSource('base-xyz', { type:'raster', tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize:256, attribution:'© Esri World Imagery' } as any)
          map.addLayer({ id:'base-xyz', type:'raster', source:'base-xyz' } as any)
        }
      }
    })
    mapRef.current = map as any
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.on('zoomend', ()=>{ try{ setMapZoom(map.getZoom()) }catch{} })
    // Initial overview bounds: California state envelope
    map.fitBounds([[-124.48, 32.53], [-114.13, 42.01]], { padding:30, duration:0 })
    map.addControl(new (maplibregl as any).AttributionControl({ compact:true }), 'bottom-left')
    map.on('load', ()=>{
      console.log('✅ California Geospatial MapLibre loaded!')
      map.resize()
      if(baseXyz!=='carto' && !map.getSource('base-xyz')){
        const tile = XYZ_TILES[baseXyz]
        if(tile){
          map.addSource('base-xyz', { type:'raster', tiles:[tile.url], tileSize:256, attribution: tile.attribution } as any)
          map.addLayer({ id:'base-xyz', type:'raster', source:'base-xyz' } as any)
        }
      }

      // Authoritative US Census Bureau TIGER/Line 2024 California County Boundaries
      fetchJson(['/data/california_counties.geojson']).then(async (fc:any)=>{
        await whenLoaded(map)
        const feats = fc.features || []
        communesRef.current = fc
        setCommunesCount(feats.length)
        setCommunesError('')
        if(!map.getSource('ca-counties')){
          map.addSource('ca-counties', { type:'geojson', data: fc })
          map.addLayer({
            id: 'ca-counties-fill',
            type: 'fill',
            source: 'ca-counties',
            paint: {
              'fill-color': '#064e3b',
              'fill-opacity': 0.12
            }
          })
          map.addLayer({
            id: 'ca-counties-line',
            type: 'line',
            source: 'ca-counties',
            paint: {
              'line-color': '#10b981',
              'line-width': 1.6,
              'line-opacity': 0.65
            }
          })
          map.addLayer({
            id: 'ca-counties-label',
            type: 'symbol',
            source: 'ca-counties',
            minzoom: 6.5,
            layout: {
              'text-field': ['get', 'name'],
              'text-size': 11,
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-allow-overlap': false
            } as any,
            paint: {
              'text-color': '#e2e8f0',
              'text-halo-color': '#020617',
              'text-halo-width': 1.5
            }
          })
          lowerBase(map)
          map.on('click', 'ca-counties-fill', (e:any)=>{
            const f = e.features?.[0]?.properties
            if(!f) return
            const cName = f.name || f.NAME || 'California County'
            new (maplibregl as any).Popup({ closeButton:true, maxWidth:'320px' })
              .setLngLat(e.lngLat)
              .setHTML(`<div style="font-family:sans-serif;color:#f0fdf4"><b>${cName}</b><br/><span style="font-size:11px;color:#a3e635">CAL FIRE State Responsibility Area (SRA)</span><br/><span style="font-size:10px;color:#94a3b8">Authoritative US Census TIGER/Line 2024 · EPSG:4326</span></div>`)
              .addTo(map)
            onSelectRef.current?.('county', cName)
          })
        }
      }).catch(err => {
        console.warn('California counties geojson could not be loaded', err)
      })

      // California Monitored Sectors
      activeRegion.counties.forEach(county => {
        county.sectors.forEach(sector => {
          const el = document.createElement('div')
          const hz = NFDRS_HAZARD_SCALE[sector.currentRiskLevel] || NFDRS_HAZARD_SCALE['III']
          el.style.padding = '3px 8px'
          el.style.borderRadius = '6px'
          el.style.display = 'flex'
          el.style.alignItems = 'center'
          el.style.gap = '4px'
          el.style.background = '#070f0b'
          el.style.color = hz.color
          el.style.fontSize = '11px'
          el.style.fontWeight = 'bold'
          el.style.border = `1.5px solid ${hz.color}`
          el.style.cursor = 'pointer'
          el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.6)'
          el.innerHTML = `<span>🌲</span><span>${sector.name.split(' ')[0]}</span>`
          el.title = `${sector.name} — NFDRS Level ${sector.currentRiskLevel}`
          el.addEventListener('click', () => {
            new (maplibregl as any).Popup({ closeButton: true, maxWidth: '320px' })
              .setLngLat(sector.coordinates as any)
              .setHTML(`<div style="font-family:sans-serif;color:#f0fdf4"><b>${sector.name}</b><br/><span style="font-size:11px;color:#a3e635">${county.name} · ${county.agencyUnit}</span><br/><span style="font-size:11px;color:#cbd5d1">Fuel: ${sector.primaryFuelType}</span><br/><span style="font-size:10px;color:#8b9f94">Elevation: ${sector.elevationMeters}m · Risk: Level ${sector.currentRiskLevel}</span></div>`)
              .addTo(map)
            onSelectRef.current?.('sector', sector.id)
            selectCounty(county.id)
            selectSector(sector.id)
          })
          new (maplibregl as any).Marker({ element: el }).setLngLat(sector.coordinates as any).addTo(map)
        })
      })

      // California Incidents & Thermal Anomalies
      activeRegion.incidents.forEach(inc => {
        const el = document.createElement('div')
        el.style.width = '28px'
        el.style.height = '28px'
        el.style.borderRadius = '50%'
        el.style.display = 'grid'
        el.style.placeItems = 'center'
        el.style.background = inc.category === 'THERMAL_ANOMALY' ? '#ef4444' : '#1e293b'
        el.style.color = '#fff'
        el.style.fontSize = '14px'
        el.style.border = '2px solid #fff'
        el.style.cursor = 'pointer'
        el.style.boxShadow = '0 0 14px rgba(239, 68, 68, 0.7)'
        el.textContent = inc.category === 'THERMAL_ANOMALY' ? '🔥' : '📜'
        el.title = `${inc.title} (${inc.category})`
        el.addEventListener('click', () => {
          new (maplibregl as any).Popup({ closeButton: true, maxWidth: '320px' })
            .setLngLat(inc.coordinates as any)
            .setHTML(`<div style="font-family:sans-serif;color:#f0fdf4"><b>${inc.title}</b><br/><span style="font-size:11px;color:#ef4444;font-weight:bold">${inc.status} · Level ${inc.hazardLevel}</span><br/><span style="font-size:11px;color:#cbd5d1">Sensor: ${inc.satelliteSensor || 'VIIRS'}</span><br/><span style="font-size:10px;color:#8b9f94">${inc.officialSource}</span></div>`)
            .addTo(map)
          onSelectRef.current?.('incident', inc.id)
          selectIncident(inc.id)
        })
        new (maplibregl as any).Marker({ element: el }).setLngLat(inc.coordinates as any).addTo(map)
      })

      // High Risk Priority Zones
      RISK_ZONES.forEach(h => {
        const el = document.createElement('div')
        el.style.width = '24px'
        el.style.height = '24px'
        el.style.borderRadius = '999px'
        el.style.display = 'grid'
        el.style.placeItems = 'center'
        el.style.background = '#F59E0B'
        el.style.color = '#fff'
        el.style.fontSize = '13px'
        el.style.border = '2px solid #fff'
        el.style.cursor = 'pointer'
        el.textContent = '⚠'
        el.title = `${h.name} — ${h.place}`
        el.addEventListener('click', () => {
          new (maplibregl as any).Popup({ closeButton: true, maxWidth: '320px' })
            .setLngLat(h.coords as any)
            .setHTML(`<div style="font-family:sans-serif;color:#f0fdf4"><b>${h.name}</b><br/>${h.place}<br/><span style="font-size:11px;color:#f59e0b">🟠 CRITICAL HAZARD — ${h.note}</span><br/><span style="font-size:10px;color:#94a3b8">Source: ${h.press}</span></div>`)
            .addTo(map)
        })
        new (maplibregl as any).Marker({ element: el }).setLngLat(h.coords as any).addTo(map)
      })

      // Forensic Calibration Fire Benchmarks
      HIST_FIRES.forEach(h => {
        const el = document.createElement('div')
        el.style.width = '24px'
        el.style.height = '24px'
        el.style.borderRadius = '999px'
        el.style.display = 'grid'
        el.style.placeItems = 'center'
        el.style.background = '#1F2937'
        el.style.color = '#FBBF24'
        el.style.fontSize = '13px'
        el.style.border = '2px solid #FBBF24'
        el.style.cursor = 'pointer'
        el.textContent = '🔥'
        el.title = `${h.name} (${h.time})`
        el.addEventListener('click', () => {
          new (maplibregl as any).Popup({ closeButton: true, maxWidth: '320px' })
            .setLngLat(h.coords as any)
            .setHTML(`<div style="font-family:sans-serif;color:#f0fdf4"><b>${h.name}</b><br/>${h.place}<br/><span style="font-size:12px;color:#ef4444;font-weight:700">🕒 ${h.time}</span><br/><span style="font-size:11px;color:#f59e0b">${h.note}</span><br/><span style="font-size:10px;color:#94a3b8">Source: ${h.press}</span></div>`)
            .addTo(map)
        })
        new (maplibregl as any).Marker({ element: el }).setLngLat(h.coords as any).addTo(map)
      })
    })
    return () => { map.remove(); (mapRef as any).current = null }
  }, [activeRegionId])

  // Camera fly-to synchronization when activeCoords change
  useEffect(() => {
    if (mapRef.current && activeCoords) {
      mapRef.current.flyTo({
        center: [activeCoords[0], activeCoords[1]],
        zoom: activeRegionId === 'california-us' ? 10.5 : 11,
        duration: 1200
      } as any)
    }
  }, [activeCoords, activeRegionId])


  useEffect(()=>{
    if(locState.status==='granted' && mapRef.current && locState.lon && locState.lat){
      mapRef.current.flyTo({ center:[locState.lon, locState.lat], zoom:11, duration:1200 } as any)
      try{ new (maplibregl as any).Marker({color:'#0F766E'}).setLngLat([locState.lon, locState.lat]).addTo(mapRef.current) }catch{}
    }
  }, [locState])

  useEffect(()=>{
    fetch(`${API}/api/health/geospatial`).then(r=>r.json()).then(j=>{
      setSourceLive({ sentinel2: j.sentinel2?.status || 'UNAVAILABLE', firms: j.firms?.status || 'UNAVAILABLE', gee: j.gee?.status || 'UNAVAILABLE' })
      setHealth(j)
      const overall = j.summary?.all_live ? 'LIVE' : (j.firms?.status==='CONFIGURATION_REQUIRED' ? 'CONFIGURATION_REQUIRED' : 'UNAVAILABLE')
      setLiveStatus(overall as any)
    }).catch(()=> setLiveStatus('UNAVAILABLE'))
    // Communities / sectors delineation
    fetch(`${API}/api/villages`).then(r=>r.json()).then(v=> setVillages(v)).catch(()=>{})
    // DEMO/LIVE mode + tutorial tour
    const onMode=(e:any)=>{
      const m=e.detail?.mode||getMode()
      setMode(m)
      if(m==='demo'){ setFireAlerts(DEMO_ALERTS as any[]); try{ if(!sessionStorage.getItem('ecogl_tour_done')) setTourOpen(true) }catch{ setTourOpen(true) } }
      else { setTourOpen(false); loadAlerts() }
    }
    const onTour=(e:any)=>{
      const a=e.detail?.action
      if(a==='burning' && mapRef.current) mapRef.current.flyTo({ center:[-121.528, 39.789], zoom:11, duration:1000 } as any)
      if(a==='layers') setShowLayers(true)
      if(a==='hotspot') toggleSat('hotspot','VIIRS_SNPP_NRT')
    }
    window.addEventListener('ecochain-mode', onMode)
    window.addEventListener('ecochain-tour', onTour)
    // 20km fire notification — LIVE polls every 60s; DEMO uses scenario preset
    const loadAlerts=()=> fetch(TILE_FIX(`${API}/api/villages/fire-alert?t=${Date.now()}`), { cache:'no-store' }).then(r=>r.json()).then(j=>{
      if(getMode()==='demo'){ setFireAlerts(DEMO_ALERTS as any[]); return }
      setFireAlerts(j.alerts || [])
      if(j.alerts?.length){
        const msg = `🔥 ${j.alerts.length} communities within 20 km of thermal anomalies: ${j.alerts.slice(0,2).map((a:any)=>`${a.village} (${a.distance_km} km)`).join(', ')}`
        console.warn(msg)
        if(Notification && Notification.permission==='granted') new Notification('Wildfire Proximity Alert (20km)', { body: msg })
      }
    }).catch(()=>{ if(getMode()==='demo') setFireAlerts(DEMO_ALERTS as any[]) })
    if(getMode()==='demo'){ setFireAlerts(DEMO_ALERTS as any[]); try{ if(!sessionStorage.getItem('ecogl_tour_done')) setTourOpen(true) }catch{ setTourOpen(true) } }
    else loadAlerts()
    const int=setInterval(()=>{ if(getMode()==='live') loadAlerts() }, 60000)
    if(Notification && Notification.permission==='default') Notification.requestPermission()
    return ()=>{ clearInterval(int); window.removeEventListener('ecochain-mode', onMode); window.removeEventListener('ecochain-tour', onTour) }
  },[])

  return (
    // Map container must have explicit height/width to ensure proper rendering
    <div className="relative w-full h-[calc(100vh-56px)] min-h-[500px] bg-slate-900 relative z-0" style={{position:'relative', height:'calc(100vh - 56px)', borderRadius:0, overflow:'hidden', background:'#0f172a'}}>
      <div ref={mapContainer} className="w-full h-full min-h-[500px] relative z-0 absolute inset-0" style={{ width:'100%', height:'100%', minHeight:'500px' }} />

      {/* Top: compact for full view — search + LIVE dot */}
      <div style={{position:'absolute', top:10, left:60, right:60, display:'flex', gap:8, alignItems:'center', justifyContent:'center', pointerEvents:'none'}}>
        <div style={{position:'relative', pointerEvents:'auto', width:300, maxWidth:'45vw'}}>
        <div style={{background:'rgba(255,255,255,0.92)', backdropFilter:'blur(12px)', borderRadius:999, padding:'6px 12px', display:'flex', gap:6, alignItems:'center', boxShadow:'0 4px 16px rgba(0,0,0,0.08)', width:'100%'}}>
          <span style={{opacity:0.6}}>⌕</span>
          <input value={search} placeholder={`Search county or corridor...${communesCount?` (${communesCount} counties)`:''}`} style={{border:0, outline:'none', flex:1, fontSize:12, background:'transparent', minWidth:0}} onChange={e=>{ const v=e.target.value; setSearch(v); const all=communesRef.current?.features||[]; const q=v.trim().toLowerCase(); setSuggests(!q?[]:all.filter((f:any)=> { const n=(f.properties?.name||f.properties?.fullName||'').toLowerCase(); return n.includes(q) }).slice(0,8).map((f:any)=>f.properties)) }} onKeyDown={e=>{ if(e.key==='Enter' && suggests[0]) selectCommune(suggests[0]) }} />
        </div>
        {suggests.length>0 && <div style={{position:'absolute', top:'100%', left:0, right:0, marginTop:6, background:'#fff', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,0.15)', overflow:'hidden', zIndex:20}}>
          {suggests.map((s:any)=> <button key={s.name||s.fullName||s.id} onClick={()=>selectCommune(s)} style={{display:'block', width:'100%', textAlign:'left', padding:'8px 12px', fontSize:12, border:0, background:'transparent', cursor:'pointer', borderBottom:'1px solid #F1F5F9'}}>{s.name || s.fullName} <span style={{color:'#94A3B8'}}>· {s.agencyUnit || 'California SRA'}</span></button>)}
        </div>}
        </div>
        <div title={`${mode==='demo'?'DEMO mode':liveStatus} · FIRMS ${sourceLive.firms||'…'} · GEE ${sourceLive.gee||'…'} · Sentinel-2 ${sourceLive.sentinel2||'…'} · ${now.toLocaleTimeString('en-US')}`} style={{background:'rgba(15,23,42,0.75)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:999, padding:'6px 10px', fontSize:11, display:'flex', gap:6, alignItems:'center', color:'#fff', pointerEvents:'auto', whiteSpace:'nowrap'}}>
          {(()=>{
            if(mode==='demo') return (<><span style={{width:8, height:8, borderRadius:999, background:'#F59E0B', display:'inline-block'}}/><span style={{fontWeight:800}}>DEMO MODE</span></>)
            const live = [sourceLive.firms, sourceLive.gee, sourceLive.sentinel2].filter(s=> s==='LIVE').length
            const known = [sourceLive.firms, sourceLive.gee, sourceLive.sentinel2].filter(Boolean).length
            if(known > 0 && live === known) return (<><span style={{width:8, height:8, borderRadius:999, background:'#10B981', display:'inline-block'}}/><span style={{fontWeight:800}}>Telemetry: FULL</span></>)
            if(live > 0) return (<><span style={{width:8, height:8, borderRadius:999, background:'#F59E0B', display:'inline-block'}}/><span style={{fontWeight:800}}>Telemetry: PARTIAL</span></>)
            return (<><span style={{width:8, height:8, borderRadius:999, background:'#EF4444', display:'inline-block'}}/><span style={{fontWeight:800}}>Telemetry: OFFLINE</span></>)
          })()}
        </div>
      </div>
      {/* Degraded level notice */}
      {levelsState==='degraded' && (
        <div style={{position:'absolute', top:56, left:'50%', transform:'translateX(-50%)', zIndex:15, background:'rgba(69,26,3,0.92)', color:'#FDE68A', borderRadius:999, padding:'6px 14px', fontSize:11, fontWeight:700, boxShadow:'0 4px 12px rgba(0,0,0,0.2)', maxWidth:'92vw', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>⚠️ NFDRS risk levels loading partially — gray markers signify UNAVAILABLE DATA, not low risk</div>
      )}

      {/* Floating Alert Banners: Active Wildfires / Thermal Anomalies */}
      {burnKey && bannerOff!==burnKey ? (
        <div style={{position:'absolute', top:56, left:'50%', transform:'translateX(-50%)', zIndex:15, background:'#DC2626', color:'#fff', borderRadius:999, padding:'8px 12px 8px 16px', display:'flex', gap:10, alignItems:'center', boxShadow:'0 8px 24px rgba(220,38,38,0.5)', fontSize:12, fontWeight:800, maxWidth:'92vw', animation:'pulse 1.5s infinite'}}>
          <span>🔥 ACTIVE WILDFIRE DETECTED: {burning[0]?.village || burning[0]?.community_name} ({burning[0]?.commune || burning[0]?.county}){burning.length>1?` +${burning.length-1} more`:''} · {burning[0]?.distance_km} km away · {burning[0]?.acq_date||''}</span>
          <button onClick={()=>setBannerOff(burnKey)} title="Dismiss banner" style={{border:0, borderRadius:999, background:'rgba(255,255,255,0.25)', color:'#fff', width:22, height:22, cursor:'pointer', fontWeight:800}}>✕</button>
        </div>
      ) : !burnKey && suspicious.length>0 ? (
        <div style={{position:'absolute', top:56, left:'50%', transform:'translateX(-50%)', zIndex:15, background:'rgba(245,158,11,0.95)', color:'#451A03', borderRadius:999, padding:'6px 14px', fontSize:11, fontWeight:700, boxShadow:'0 4px 12px rgba(0,0,0,0.15)', maxWidth:'92vw', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>⚠️ {suspicious.length} thermal anomalies within 20 km — continuous NASA FIRMS monitoring active</div>
      ) : null}

      {/* Spread Simulation Result Panel */}
      {spreadInfo && (
        <div style={{position:'absolute', left:12, top:112, zIndex:10, width:300, maxWidth:'80vw', background:'rgba(255,255,255,0.97)', borderRadius:12, padding:12, boxShadow:'0 8px 24px rgba(0,0,0,0.2)', border:'1px solid #FECACA'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <b style={{fontSize:12}}>🔥 Wildfire Spread Projection</b>
            <button onClick={()=> { setSpreadInfo(null); try{ const m = mapRef.current as any; if(m?.getLayer('spread-fill')) m.removeLayer('spread-fill'); if(m?.getSource('spread-src')) m.removeSource('spread-src') }catch{} }} style={{border:0, background:'transparent', cursor:'pointer'}}>✕</button>
          </div>
          {spreadInfo.loading && <div style={{fontSize:12, color:'#64748B', marginTop:6}}>Simulating perimeter under current wind vector…</div>}
          {spreadInfo.error && <div style={{fontSize:12, color:'#B91C1C', marginTop:6}}>⚠️ {spreadInfo.error}</div>}
          {spreadInfo.steps && (
            <div style={{marginTop:6, display:'flex', flexDirection:'column', gap:6}}>
              {spreadInfo.steps.map((s:any)=> (
                <div key={s.hour} style={{fontSize:11, background:'#FEF2F2', borderRadius:8, padding:'6px 8px'}}>
                  <b>T+{s.hour}h Projection:</b> {s.length_km} km front · {(s.area_ha * 2.471).toFixed(0)} acres · wind {spreadInfo.inputs?.wind_speed_kmh ?? '?'} km/h
                  {(s.affected_communes?.length > 0) && <div style={{marginTop:2}}>🏘️ Affected corridors: {s.affected_communes.map((c:any)=> c.name).join(' · ')}</div>}
                </div>
              ))}
              <div style={{fontSize:10, color:'#64748B'}}>Huygens rate-of-spread ellipse · wind source: {spreadInfo.wind_source || 'NOAA HRRR'} · {spreadInfo.disclaimer || 'SIMULATION ONLY'}</div>
            </div>
          )}
        </div>
      )}

      {/* Control Panel — Glassmorphism */}
      {!showLayers ? (
        <button onClick={()=>setShowLayers(true)} title="Open layer controls" style={{position:'absolute', top:64, left:12, zIndex:10, width:38, height:38, display:'grid', placeItems:'center', background:'rgba(15,23,42,0.75)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:12, color:'#fff', fontSize:16, cursor:'pointer', boxShadow:'0 8px 24px rgba(0,0,0,0.25)', transition:'transform .25s ease, opacity .25s ease'}}>⚙️</button>
      ) : (
      <div style={{position:'absolute', top:64, left:12, zIndex:10, width:270, maxHeight:'calc(100% - 220px)', overflow:'auto', background:'rgba(15,23,42,0.75)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', borderRadius:12, border:'1px solid rgba(255,255,255,0.15)', boxShadow:'0 8px 24px rgba(0,0,0,0.25)', padding:10, display:'flex', flexDirection:'column', gap:8, color:'#fff', transition:'transform .3s ease, opacity .3s ease', transform:'translateX(0)', opacity:1}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div style={{fontSize:12, fontWeight:800, letterSpacing:.3}}>Map Layers & Telemetry</div>
          <button onClick={()=>setShowLayers(false)} title="Collapse" style={{width:26, height:26, display:'grid', placeItems:'center', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, color:'#fff', fontSize:13, cursor:'pointer'}}>━</button>
        </div>
        <div style={{fontSize:11, fontWeight:700, opacity:.9}}>Basemap Source</div>
        <div style={{display:'flex', background:'rgba(255,255,255,0.1)', borderRadius:999, padding:3, gap:3}}>
          {([['osm','🗺️ Vector'],['esri','🛰️ Satellite']] as [string,string][]).map(([v,label])=>(
            <button key={v} onClick={()=>switchBaseXyz(v)} style={{flex:1, border:0, borderRadius:999, padding:'6px 0', fontSize:12, fontWeight:700, cursor:'pointer', background:baseXyz===v?'#fff':'transparent', color:baseXyz===v?'#0B1412':'#fff'}}>{label}</button>
          ))}
        </div>
        <div style={{height:1, background:'rgba(255,255,255,0.15)'}}/>
        <div style={{fontSize:11, fontWeight:700, opacity:.9}}>Administrative Boundaries</div>
        <label style={{display:'flex', gap:6, alignItems:'center', background: showBounds?'rgba(16,185,129,0.25)':'rgba(255,255,255,0.08)', padding:'6px 8px', borderRadius:8, fontSize:12, border:'1px solid rgba(255,255,255,0.15)', cursor:'pointer', color:'#fff'}}>
          <input type="checkbox" checked={showBounds} onChange={()=> setShowBounds(v=> !v)} /> 🗺️ California 58 Counties & SRA
        </label>
        <label style={{display:'flex', gap:6, alignItems:'center', background: terrain3d?'rgba(16,185,129,0.25)':'rgba(255,255,255,0.08)', padding:'6px 8px', borderRadius:8, fontSize:12, border:'1px solid rgba(255,255,255,0.15)', cursor:'pointer', color:'#fff'}}>
          <input type="checkbox" checked={terrain3d} onChange={()=> setTerrain3d(v=> !v)} /> ⛰️ 3D Terrain Elevation (Right-click & drag)
        </label>
        <div style={{fontSize:11, fontWeight:700, opacity:.9}}>Satellite & Sensor Layers</div>
        {[
          ['hotspot','🔥 NASA FIRMS Multi-Sensor Hotspots (Cat A)', 'hotspot', 'VIIRS_SNPP_NRT'],
          ['gibs_truecolor','🛰️ NASA VIIRS True-Color 375m (Cat B)', 'gibs_truecolor', 'truecolor'],
          ['gibs_burnscar','🔥 NASA MODIS 7-2-1 Burn Scars (Cat C)', 'gibs_burnscar', 'burnscar'],
          ['ndvi','🌿 Sentinel-2 NDVI Canopy', 'ndvi', 'ndvi'],
          ['s1','📡 Sentinel-1 SAR Radar', 's1', 's1'],
        ].map(([k,label, key, geeLayer])=>(
          <label key={k} style={{display:'flex', gap:6, alignItems:'center', background: activeSat[key]?'rgba(16,185,129,0.25)':'rgba(255,255,255,0.08)', padding:'6px 8px', borderRadius:8, fontSize:12, border:'1px solid rgba(255,255,255,0.15)', cursor:'pointer', color:'#fff'}}>
            <input type="checkbox" checked={!!activeSat[key as string]} onChange={()=> toggleSat(key as string, geeLayer as string)} /> {label}
            <span style={{fontSize:10, padding:'1px 6px', borderRadius:999, background: (key.startsWith('gibs_') || sourceLive[key==='hotspot'?'firms': key==='ndvi'?'sentinel2':'sentinel1']==='LIVE')?'#DCFCE7':'#FEF3C7', color:'#000'}}>{key.startsWith('gibs_') ? 'GIBS' : (sourceLive[key==='hotspot'?'firms': key==='ndvi'?'sentinel2':'sentinel1'] || '...')}</span>
          </label>
        ))}
        {(activeSat.ndvi || activeSat.s1 || activeSat.gibs_truecolor || activeSat.gibs_burnscar) && (
          <label style={{display:'block', fontSize:11, background:'rgba(255,255,255,0.08)', padding:'6px 8px', borderRadius:8}}>
            <div style={{display:'flex', justifyContent:'space-between'}}><span>Raster Layer Opacity</span><b>{Math.round(opacity * 100)}%</b></div>
            <input type="range" min={10} max={100} value={Math.round(opacity * 100)} onChange={e=> applyOpacity(Number(e.target.value) / 100)} style={{width:'100%'}} aria-label="Raster opacity" />
          </label>
        )}
        {activeSat.hotspot && (
          <div style={{fontSize:11, background:'rgba(220,38,38,0.25)', padding:'6px 8px', borderRadius:8, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span>🔥 {hotCount} thermal detections rendered</span>
            <button onClick={fitHotspots} style={{border:0, borderRadius:999, padding:'4px 10px', fontSize:11, fontWeight:700, cursor:'pointer'}}>Focus</button>
          </div>
        )}
        {activeSat.ndvi && info?.layer === 'ndvi' && ndviValue(info.ndvi) !== null && (
          <div style={{fontSize:11, background:'rgba(255,255,255,0.08)', padding:'6px 8px', borderRadius:8}}>
            <div style={{display:'flex', justifyContent:'space-between'}}><span>🌿 Regional Canopy NDVI</span><b>{ndviValue(info.ndvi)!.toFixed(2)}</b></div>
            <div style={{position:'relative', height:8, borderRadius:999, marginTop:6, background:'linear-gradient(90deg,#8B5A2B,#F59E0B,#84CC16,#0F766E)'}}>
              <div style={{position:'absolute', left:`${Math.min(100, Math.max(0, (ndviValue(info.ndvi)! + 0.2) / 1.2 * 100))}%`, top:-3, width:2, height:14, background:'#fff'}} />
            </div>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:10, opacity:0.8, marginTop:2}}><span>Barren / Cured</span><span>Dense Canopy</span></div>
          </div>
        )}
        <div style={{fontSize:11, opacity:0.6, color:'#e2e8f0'}}>{communesError ? communesError : `Loaded ${communesCount||'…'} California counties · Pilot BBox [-124.48, 32.53] to [-114.13, 42.01]`}</div>
      </div>)}

      {/* Right controls */}
      <div style={{position:'absolute', top:64, right:12, display:'flex', flexDirection:'column', gap:8, zIndex:10}}>
        <button onClick={requestLoc} title="My Location" style={{width:38, height:38, display:'grid', placeItems:'center', background:'rgba(255,255,255,0.92)', border:0, borderRadius:12, boxShadow:'0 4px 12px rgba(0,0,0,0.08)', fontSize:16}}>📍</button>
        <button onClick={async()=>{
          const bounds = mapRef.current?.getBounds()
          const bbox = bounds ? `${bounds.getWest().toFixed(1)},${bounds.getSouth().toFixed(1)},${bounds.getEast().toFixed(1)},${bounds.getNorth().toFixed(1)}` : '-124.5,32.5,-114.1,42.0'
          const center = mapRef.current?.getCenter()
          const tileUrl = XYZ_TILES[baseXyz]?.url || 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          setInfo({ layer:'smoke', status:'ANALYZING', source:'Gemini Vision' })
          try{
            const r=await fetch(`${API}/api/ai/smoke/detect`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ tile_url: tileUrl, lat: center?.lat || 39.789, lon: center?.lng || -121.528, bbox }) })
            const j=await r.json()
            const isSmoke = j.result?.is_smoke
            setInfo({ layer:'smoke', status: j.status, source:'Gemini Vision', satellite: tileUrl.includes('arcgis')?'Esri':tileUrl.includes('eox')?'Sentinel-2':'Google', acquired: new Date().toISOString().slice(0,10), is_smoke: isSmoke, confidence: j.result?.confidence, reason: j.result?.reason, alert: j.result?.alert, bbox })
            if(isSmoke){
              const el=document.createElement('div'); el.style.width='22px'; el.style.height='22px'; el.style.borderRadius='999px'; el.style.background='#DC2626'; el.style.border='3px solid #fff'; el.style.boxShadow='0 0 12px rgba(220,38,38,1)'; el.style.animation='pulse 1s infinite'
              new (maplibregl as any).Marker({ element: el }).setLngLat([center?.lng || -121.528, center?.lat || 39.789] as any).addTo(mapRef.current)
            }
          }catch(e){ setInfo({ layer:'smoke', status:'UNAVAILABLE', reason:String(e) }) }
        }} style={{background: info?.layer==='smoke' && info?.is_smoke ? '#DC2626':'rgba(255,255,255,0.96)', color: info?.layer==='smoke' && info?.is_smoke ? '#fff':'#0B1412', backdropFilter:'blur(12px)', border:0, borderRadius:12, padding:'10px 12px', boxShadow:'0 4px 12px rgba(0,0,0,0.08)', fontSize:12, fontWeight:700}}>{info?.layer==='smoke' && info?.status==='ANALYZING' ? '⏳ Analyzing imagery...' : '🤖 AI Smoke Detection'}</button>
        <div style={{background:'rgba(255,255,255,0.96)', backdropFilter:'blur(12px)', borderRadius:12, padding:10, fontSize:11, boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}}>
          <div style={{fontWeight:800}}>Legend (NFDRS Fire Danger Class)</div>
          <div><i style={{width:10,height:10,borderRadius:999,background:'#0EA5E9',display:'inline-block',marginRight:6}}/> Class I-II (Low / Moderate)</div>
          <div><i style={{width:10,height:10,borderRadius:999,background:'#F59E0B',display:'inline-block',marginRight:6}}/> Class III-IV (High / Very High)</div>
          <div><i style={{width:10,height:10,borderRadius:999,background:'#DC2626',display:'inline-block',marginRight:6}}/> Class V (Extreme / Red Flag)</div>
          <div><i style={{width:10,height:10,borderRadius:999,background:'#1F2937',border:'2px solid #FBBF24',display:'inline-block',marginRight:6}}/> Calibrated Wildfire Benchmarks</div>
          <div><i style={{width:10,height:10,borderRadius:999,background:'#F59E0B',display:'inline-block',marginRight:6}}/> Priority WUI Hazard Zones</div>
          <div><i style={{width:10,height:10,borderRadius:999,background:'#1E40AF',display:'inline-block',marginRight:6}}/> Critical Infrastructure Node</div>
          {info?.layer==='smoke' && info?.is_smoke && <div style={{marginTop:6, padding:'6px 8px', background:'#FEE2E2', borderRadius:8, color:'#991B1B', fontWeight:700}}>🚨 {info.alert?.message || 'Smoke detected'}<br/><span style={{fontWeight:400, fontSize:10}}>Confidence {(info.confidence*100).toFixed(0)}% · {info.reason}</span></div>}
          {info?.layer==='smoke' && info?.is_smoke===false && <div style={{marginTop:6, padding:'6px 8px', background:'#DCFCE7', borderRadius:8, color:'#065F46'}}>✓ No smoke detected — perimeter clear</div>}
        </div>
      </div>

      {/* Bottom ticker + timeline */}
      <div style={{position:'absolute', bottom:0, left:0, right:0, background:'rgba(11,20,18,0.94)', color:'#fff', padding:'8px 12px', display:'flex', flexDirection:'column', gap:6}}>
        <div style={{display:'flex', gap:10, alignItems:'center', overflow:'hidden', whiteSpace:'nowrap'}}>
          <span style={{background: liveStatus==='LIVE'?'#10B981': liveStatus==='DEMO'?'#F59E0B':'#B45309', padding:'2px 8px', borderRadius:999, fontSize:11, fontWeight:700}}>{liveStatus==='LIVE'?'● LIVE': liveStatus==='DEMO'?'● DEMO':'● DEGRADED'}</span>
          <span style={{fontSize:12, animation:'marquee 18s linear infinite'}}>{tickerLines[tickerIdx]}</span>
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center', background:'rgba(255,255,255,0.08)', borderRadius:10, padding:'6px 10px'}}>
          <span style={{fontSize:11, fontWeight:700}}>Observation Window:</span>
          <select value={dateRange} onChange={e=> setDateRange(e.target.value as any)} style={{padding:'4px 8px', borderRadius:8, border:0, fontSize:12}}>
            <option value="latest">Latest</option><option value="7d">7 Days</option><option value="30d">30 Days</option><option value="3m">90 Days</option>
          </select>
          <span style={{fontSize:11, opacity:0.8}}>Cloud Cover &lt; <select value={cloud} onChange={e=> setCloud(Number(e.target.value))} style={{padding:'2px 6px', borderRadius:6, border:0, fontSize:11}}><option value={20}>20%</option><option value={40}>40%</option></select></span>
        </div>
      </div>

      {/* Active fire & thermal alert panel */}
      {fireAlerts.length>0 && (
        <div className="fire-panel" style={{position:'absolute', bottom:80, left:12, background:'rgba(255,255,255,0.98)', backdropFilter:'blur(12px)', borderRadius:12, padding:12, minWidth:280, maxWidth:360, boxShadow:'0 8px 24px rgba(0,0,0,0.15)', border: burning.length ? '2px solid #DC2626' : '1px solid #F59E0B'}}>
          {burning.length>0 && <div style={{fontWeight:800, fontSize:12, color:'#DC2626'}}>🔥 ACTIVE WILDFIRE ≤5 km ({burning.length})</div>}
          {burning.length>0 && <div style={{maxHeight:110, overflow:'auto', marginTop:6, display:'flex', flexDirection:'column', gap:6}}>
            {burning.map((a:any, i:number)=>(
              <div key={'b'+i} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'#FEE2E2', padding:'6px 8px', borderRadius:8, fontSize:11}}>
                <div><b>{a.village || a.community_name}</b> <span style={{color:'#64748B'}}>({a.commune || a.county})</span><br/><span style={{fontSize:10, color:'#334155'}}>{a.distance_km} km from active fire · {a.acq_date || ''}</span></div>
                <button onClick={()=> watchFire(a)} style={{fontSize:10, padding:'2px 6px', borderRadius:999, background:'#DC2626', color:'#fff', border:0, cursor:'pointer'}}>VIEW</button>
              </div>
            ))}
          </div>}
          {suspicious.length>0 && <div style={{fontWeight:800, fontSize:12, color:'#92400E', marginTop:burning.length?8:0}}>⚠️ THERMAL ANOMALIES ≤20 km ({suspicious.length})</div>}
          {suspicious.length>0 && <div style={{maxHeight:100, overflow:'auto', marginTop:6, display:'flex', flexDirection:'column', gap:6}}>
            {suspicious.map((a:any, i:number)=>(
              <div key={'s'+i} style={{display:'flex', justifyContent:'space-between', alignItems:'center', background:'#FEF3C7', padding:'6px 8px', borderRadius:8, fontSize:11}}>
                <div><b>{a.village || a.community_name}</b> <span style={{color:'#64748B'}}>({a.commune || a.county})</span><br/><span style={{fontSize:10, color:'#334155'}}>{a.distance_km} km from anomaly · {a.acq_date || ''}</span></div>
                <button onClick={()=> watchFire(a)} style={{fontSize:10, padding:'2px 6px', borderRadius:999, background:'#F59E0B', color:'#fff', border:0, cursor:'pointer'}}>MONITOR</button>
              </div>
            ))}
          </div>}
          <div style={{fontSize:10, color:'#64748B', marginTop:6}}>CAL FIRE & NASA FIRMS 375m Telemetry · California Pilot Scope</div>
        </div>
      )}
      {fireAlerts.length===0 && villages.length>0 && (
        <div style={{position:'absolute', bottom:80, left:12, background:'rgba(255,255,255,0.9)', backdropFilter:'blur(12px)', borderRadius:12, padding:'10px 12px', fontSize:11, boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}>
          ✓ {villages.length} reference communities monitored — no active fire detections within 20 km
        </div>
      )}
      {(info || pixel) && (
        <div className="info-panel" style={{position:'absolute', bottom:80, right:12, background:'rgba(255,255,255,0.96)', backdropFilter:'blur(12px)', borderRadius:12, padding:12, minWidth:280, maxWidth:360, boxShadow:'0 8px 24px rgba(0,0,0,0.12)'}}>
          {info && info.layer==='watch' && <><div style={{fontWeight:700, fontSize:12}}>👁 TACTICAL WATCH — {info.village} <span style={{fontSize:10, padding:'2px 6px', borderRadius:999, background: info.status==='ANALYZING' ? '#FEF3C7' : '#DCFCE7'}}>{info.status === 'ANALYZING' ? 'VERIFYING...' : info.status}</span></div><div style={{fontSize:12, marginTop:6, color:'#334155'}}>📍 Coordinates: {info.fire?.lat?.toFixed(4)}, {info.fire?.lon?.toFixed(4)} · {info.fire?.distance_km}km from perimeter · {info.fire?.date} · confidence {info.fire?.confidence}</div><div style={{fontSize:12, marginTop:6}}>🛰️ Sentinel-2: {info.sentinel ? <><b>{info.sentinel.status}</b> · NDVI <b>{info.sentinel.ndvi ?? '—'}</b> · {info.sentinel.source}{info.sentinel.acquired ? ` · ${info.sentinel.acquired}` : ''}</> : 'Checking...'}</div><div style={{fontSize:12, marginTop:4}}>🤖 FireRisk Engine: {info.model ? <><b>{info.model.status === 'UNAVAILABLE' ? 'CALCULATING' : info.model.status}</b>{info.model.risk_score !== undefined && <> · Risk Score <b>{info.model.risk_score}/100</b> · Level <b>{info.model.warning_level}</b> · conf {info.model.confidence}%</>}</> : 'Evaluating...'}</div></>}
          {info && info.layer!=='watch' && <><div style={{fontWeight:700, fontSize:12}}>SATELLITE TELEMETRY — {info.layer} <span style={{fontSize:10, padding:'2px 6px', borderRadius:999, background: info.status==='LIVE'?'#DCFCE7': info.status==='DEMO'?'#FEF3C7': info.status==='CONFIGURATION_REQUIRED'?'#FEF3C7':'#FEE2E2'}}>{info.status==='CONFIGURATION_REQUIRED' ? 'DEMO · California Satellite Cache' : info.status}</span></div><div style={{fontSize:12, marginTop:6, color:'#334155'}}>Source: {info.status==='CONFIGURATION_REQUIRED' ? 'Esri / Sentinel Static Tile · DEMO Cache' : (info.source || 'Sentinel-2')} · Date: {info.acquired || info.date || '—'} {info.status==='CONFIGURATION_REQUIRED' && <span style={{color:'#F59E0B'}}>· Fallback BaseMap</span>}</div>
          {info.layer==='smoke' && info.is_smoke && <div style={{marginTop:6, padding:'6px 8px', background:'#FEE2E2', borderRadius:8, color:'#991B1B', fontSize:11, fontWeight:700}}>🚨 {info.alert?.message}<br/><span style={{fontWeight:400}}>Confidence {(info.confidence*100).toFixed(0)}% · {info.reason}</span></div>}
          </>}
          {pixel && <><div style={{height:1, background:'#E2E8E5', margin:'8px 0'}}/><div style={{fontSize:12}}>NDVI: <b>{pixel.ndvi}</b></div></>}
        </div>
      )}

      {mode==='demo' && !tourOpen && <button onClick={()=>setTourOpen(true)} style={{position:'absolute', bottom:76, right:12, zIndex:20, border:0, borderRadius:999, background:'#F59E0B', color:'#000', fontWeight:800, fontSize:12, padding:'8px 14px', cursor:'pointer', boxShadow:'0 4px 12px rgba(0,0,0,0.2)'}}>▶ Tutorial DEMO</button>}
      {mode==='demo' && tourOpen && <DemoTour onDone={()=>setTourOpen(false)} />}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} @keyframes marquee{0%{transform:translateX(100%)}100%{transform:translateX(-100%)}}
      @media (max-width: 640px){
        .fire-panel{ top:108px !important; bottom:auto !important; left:12px !important; right:12px !important; min-width:0 !important; max-width:none !important; max-height:30vh; overflow:auto; }
        .info-panel{ left:12px !important; right:12px !important; min-width:0 !important; max-width:none !important; max-height:28vh; overflow:auto; }
      }`}</style>
    </div>
  )
}
