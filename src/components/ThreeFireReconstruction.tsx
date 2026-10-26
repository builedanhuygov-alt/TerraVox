import { useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import {
  RotateCcw,
  Eye,
  Layers,
  Compass,
  Zap,
  Home,
  Wind,
  Flame,
  Gauge,
  Sliders,
  MapPin,
  CheckCircle2,
  AlertOctagon,
  Maximize2
} from 'lucide-react'

export interface HistoricalFireData {
  id: string
  name: string
  year: number
  county: string
  location_summary: string
  center_coordinates: [number, number]
  bounds: [[number, number], [number, number]]
  acres_burned: number
  structures_destroyed: number
  structures_damaged: number
  fatalities_confirmed: number
  official_cause: string
  duration_days?: number
  hectares_burned?: number
  structures_destroyed_breakdown?: {
    residences?: number
    commercial?: number
    outbuildings?: number
  }
  injuries_confirmed?: number
  evacuation_count?: number
  data_completeness?: Record<string, string>
  official_sources?: Array<{
    name: string
    agency: string
    url: string
    document_type?: string
  }>
  ignition_point?: {
    name: string
    coordinates: [number, number]
    elevation_m?: number
    timestamp?: string
  }
  weather_observations?: {
    temperature_f: number
    relative_humidity_pct: number
    sustained_wind_mph: number
    wind_gusts_mph: number
    wind_direction: string
  }
  perimeter_geojson?: {
    type: string
    geometry: {
      type: string
      coordinates: number[][][]
    }
  }
  damaged_structure_hotspots?: Array<{
    name: string
    coordinates: [number, number]
    density: string
    destroyed_est: number
  }>
  timeline_snapshots?: Array<{
    step_index: number
    timestamp: string
    label: string
    stage: string
    acres_estimate: number
    structures_affected: number
    description: string
    data_quality: string
  }>
}

export interface ThreeProps {
  fire?: HistoricalFireData | null
  customGeoJson?: any
  locationTarget?: {
    name: string
    coordinates: [number, number]
    elevation_m?: number
  } | null
  currentSnapshotIndex?: number
  burnSeverityVisible?: boolean
  structuresVisible?: boolean
  infrastructureVisible?: boolean
  weatherVectorsVisible?: boolean
  windDirectionDeg?: number
  windSpeedMph?: number
  layerMode?: 'burn_severity' | 'slope_aspect' | 'vegetation_fuel' | 'natural_imagery'
  layerOpacity?: number
  elevationScale?: number
  performanceMode?: boolean
  spreadPolygons?: any[]
  onCoordinatesHover?: (coords: { lat: number; lon: number; elevM: number } | null) => void
}

export default function ThreeFireReconstruction({
  fire,
  customGeoJson,
  locationTarget,
  currentSnapshotIndex = 0,
  burnSeverityVisible = true,
  structuresVisible = true,
  infrastructureVisible = true,
  weatherVectorsVisible = true,
  windDirectionDeg = 45,
  windSpeedMph = 25,
  layerMode = 'burn_severity',
  layerOpacity = 0.9,
  elevationScale = 1.5,
  performanceMode = false,
  spreadPolygons = [],
  onCoordinatesHover
}: ThreeProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraView, setCameraView] = useState<'orbit' | 'canyon' | 'wui' | 'top'>('orbit')
  const [wireframe, setWireframe] = useState<boolean>(false)
  const [hoveredCoord, setHoveredCoord] = useState<{ lat: number; lon: number; elevM: number } | null>(null)

  // Three.js Scene References
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const animFrameId = useRef<number | null>(null)
  const terrainMeshRef = useRef<THREE.Mesh | null>(null)
  const perimeterLineRef = useRef<THREE.LineLoop | null>(null)
  const spreadMeshesRef = useRef<THREE.Group | null>(null)
  const windVectorsRef = useRef<THREE.Group | null>(null)
  const structureGroupRef = useRef<THREE.Group | null>(null)
  const infraGroupRef = useRef<THREE.Group | null>(null)
  const emberParticlesRef = useRef<THREE.Points | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())

  // Orbit control tracking variables
  const isDragging = useRef(false)
  const isRightDragging = useRef(false)
  const previousMousePosition = useRef({ x: 0, y: 0 })
  const cameraAngles = useRef({ theta: Math.PI / 4, phi: Math.PI / 3, radius: 48, targetX: 0, targetZ: 0 })

  // Determine geographic center coordinates
  const [centerLon, centerLat] = useMemo(() => {
    if (locationTarget?.coordinates) return locationTarget.coordinates
    if (fire?.center_coordinates) return fire.center_coordinates
    return [-121.528, 39.789] // Default Butte County / Feather River
  }, [fire, locationTarget])

  // Coordinate projection from [lon, lat] to 3D scene units
  const geoToWorld = (lon: number, lat: number, elevScale = 1.0): [number, number, number] => {
    // 1 deg lon at ~39.8°N ≈ 85.5 km; 1 deg lat ≈ 111.0 km
    const dx = (lon - centerLon) * 85.5 * 0.4
    const dz = -(lat - centerLat) * 111.0 * 0.4
    // Topographic height based on distance from canyon axis
    const canyonFactor = Math.sin(dx * 0.22) * Math.cos(dz * 0.18) * 3.6
    const ridgeElevation = Math.max(-2.5, canyonFactor + (Math.cos(dx * 0.14 + dz * 0.12) * 2.4))
    return [dx, ridgeElevation * elevScale, dz]
  }

  // World to Geo conversion for coordinate hover readout
  const worldToGeo = (wx: number, wz: number): [number, number] => {
    const lon = centerLon + wx / (85.5 * 0.4)
    const lat = centerLat - wz / (111.0 * 0.4)
    return [Number(lon.toFixed(5)), Number(lat.toFixed(5))]
  }

  // Camera preset updater
  const setCameraPreset = (preset: 'orbit' | 'canyon' | 'wui' | 'top') => {
    setCameraView(preset)
    if (!cameraRef.current) return

    if (preset === 'top') {
      cameraAngles.current = { ...cameraAngles.current, theta: 0, phi: 0.05, radius: 56 }
    } else if (preset === 'canyon') {
      cameraAngles.current = { ...cameraAngles.current, theta: 1.15, phi: 1.25, radius: 26 }
    } else if (preset === 'wui') {
      cameraAngles.current = { ...cameraAngles.current, theta: 0.45, phi: 1.05, radius: 30 }
    } else {
      cameraAngles.current = { ...cameraAngles.current, theta: Math.PI / 4, phi: Math.PI / 3, radius: 48 }
    }

    const { theta, phi, radius, targetX, targetZ } = cameraAngles.current
    cameraRef.current.position.x = targetX + radius * Math.sin(phi) * Math.sin(theta)
    cameraRef.current.position.y = radius * Math.cos(phi)
    cameraRef.current.position.z = targetZ + radius * Math.sin(phi) * Math.cos(theta)
    cameraRef.current.lookAt(targetX, 0, targetZ)
  }

  // Render 2D Minimap
  useEffect(() => {
    const canvas = minimapCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    // Background terrain representation
    ctx.fillStyle = '#081711'
    ctx.fillRect(0, 0, w, h)

    // Grid lines
    ctx.strokeStyle = '#142c20'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x < w; x += 16) { ctx.moveTo(x, 0); ctx.lineTo(x, h) }
    for (let y = 0; y < h; y += 16) { ctx.moveTo(0, y); ctx.lineTo(w, y) }
    ctx.stroke()

    // Bounding circle
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(w / 2, h / 2, 28, 0, Math.PI * 2)
    ctx.stroke()

    // Incident Center Beacon
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2)
    ctx.fill()

    // Camera heading vector
    const heading = cameraAngles.current.theta
    const camX = (w / 2) + Math.sin(heading) * 22
    const camY = (h / 2) + Math.cos(heading) * 22
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(w / 2, h / 2)
    ctx.lineTo(camX, camY)
    ctx.stroke()

    // Label
    ctx.fillStyle = '#8b9f94'
    ctx.font = '8px monospace'
    ctx.fillText('N', w / 2 - 3, 10)
  }, [centerLon, centerLat, cameraView])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // 1. SCENE SETUP
    const scene = new THREE.Scene()
    sceneRef.current = scene
    scene.background = new THREE.Color(0x050c09)
    scene.fog = new THREE.FogExp2(0x050c09, performanceMode ? 0.008 : 0.012)

    // 2. CAMERA SETUP
    const width = mount.clientWidth || 800
    const height = mount.clientHeight || 500
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    cameraRef.current = camera
    setCameraPreset('orbit')

    // 3. RENDERER SETUP
    const renderer = new THREE.WebGLRenderer({
      antialias: !performanceMode,
      powerPreference: performanceMode ? 'default' : 'high-performance'
    })
    rendererRef.current = renderer
    renderer.setSize(width, height)
    renderer.setPixelRatio(performanceMode ? 1 : Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.shadowMap.enabled = !performanceMode
    mount.appendChild(renderer.domElement)

    // 4. LIGHTING
    const ambientLight = new THREE.AmbientLight(0xdcfce7, 0.45)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.4)
    sunLight.position.set(35, 50, 25)
    sunLight.castShadow = !performanceMode
    scene.add(sunLight)

    const fireGlow = new THREE.PointLight(0xf97316, 2.8, 65)
    fireGlow.position.set(0, 4, 0)
    scene.add(fireGlow)

    // 5. 3D TERRAIN SURFACE (Parametric Topographic Mesh with Selected Layer Mode)
    const gridSize = 80
    const gridRes = performanceMode ? 36 : 64
    const terrainGeo = new THREE.PlaneGeometry(gridSize, gridSize, gridRes, gridRes)
    terrainGeo.rotateX(-Math.PI / 2)

    const pos = terrainGeo.attributes.position
    const colors = new Float32Array(pos.count * 3)

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)

      // Geomorphology: Feather River Canyon gorge & Paradise Ridge
      const gorge = Math.sin(x * 0.18 + z * 0.08) * 3.8
      const ridge = Math.cos(x * 0.12 - z * 0.15) * 2.6
      const fineRoughness = performanceMode ? 0 : Math.sin(x * 0.6) * Math.cos(z * 0.6) * 0.4
      const y = (gorge + ridge + fineRoughness) * elevationScale
      pos.setY(i, y)

      const distFromCenter = Math.hypot(x, z)

      // Color mapping based on layerMode
      if (layerMode === 'slope_aspect') {
        // Slope & Aspect gradient: high slope (steep canyon walls) highlighted in amber/crimson
        const slopeEst = Math.abs(gorge) / 3.8
        colors[i * 3] = 0.15 + slopeEst * 0.7
        colors[i * 3 + 1] = 0.2 + (1.0 - slopeEst) * 0.4
        colors[i * 3 + 2] = 0.1
      } else if (layerMode === 'vegetation_fuel') {
        // Vegetation fuel category: dense conifer (dark green) vs chaparral brush (golden brown)
        if (y > 2.0) {
          // Timber conifer
          colors[i * 3] = 0.06
          colors[i * 3 + 1] = 0.22
          colors[i * 3 + 2] = 0.10
        } else if (y > 0.0) {
          // Chaparral / manzanita
          colors[i * 3] = 0.32
          colors[i * 3 + 1] = 0.26
          colors[i * 3 + 2] = 0.08
        } else {
          // Canyon bottom riparian / cured grass
          colors[i * 3] = 0.18
          colors[i * 3 + 1] = 0.30
          colors[i * 3 + 2] = 0.16
        }
      } else {
        // Default: Burn Severity vertex shading (Simulating dNBR multispectral reflectance)
        if (distFromCenter < 18) {
          // High severity burn scar: Charcoal ash black / scorched crimson
          colors[i * 3] = 0.22 + (Math.sin(x) * 0.04)
          colors[i * 3 + 1] = 0.06
          colors[i * 3 + 2] = 0.04
        } else if (distFromCenter < 28) {
          // Moderate / low burn severity: Ochre / toasted amber
          colors[i * 3] = 0.38
          colors[i * 3 + 1] = 0.24
          colors[i * 3 + 2] = 0.08
        } else {
          // Unburned native chaparral / mixed conifer canopy: Deep wildland pine green
          colors[i * 3] = 0.08 + (y * 0.015)
          colors[i * 3 + 1] = 0.19 + (y * 0.02)
          colors[i * 3 + 2] = 0.12
        }
      }
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    terrainGeo.computeVertexNormals()

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.1,
      wireframe: wireframe,
      flatShading: true,
      transparent: layerOpacity < 1.0,
      opacity: layerOpacity
    })
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat)
    terrainMesh.receiveShadow = !performanceMode
    scene.add(terrainMesh)
    terrainMeshRef.current = terrainMesh

    // 6. FIRE PERIMETER (Verified CAL FIRE polygon or User-Imported GeoJSON)
    let perimeterCoords = fire?.perimeter_geojson?.geometry?.coordinates?.[0]
    if (customGeoJson?.geometry?.coordinates?.[0]) {
      perimeterCoords = customGeoJson.geometry.coordinates[0]
    }
    if (!perimeterCoords) {
      perimeterCoords = [
        [-121.439, 39.814], [-121.378, 39.845], [-121.365, 39.882],
        [-121.435, 39.938], [-121.520, 39.932], [-121.625, 39.865],
        [-121.688, 39.805], [-121.718, 39.735], [-121.622, 39.652],
        [-121.528, 39.658], [-121.455, 39.720], [-121.439, 39.814]
      ]
    }

    const timelineProgress = fire?.timeline_snapshots?.length
      ? Math.min(1.0, Math.max(0.2, (currentSnapshotIndex + 1) / fire.timeline_snapshots.length))
      : 1.0

    const perimeterPoints: THREE.Vector3[] = []
    perimeterCoords.forEach((pt: any) => {
      const lon = Number(pt[0])
      const lat = Number(pt[1])
      const [wx, wy, wz] = geoToWorld(lon, lat, elevationScale)
      perimeterPoints.push(new THREE.Vector3(wx * timelineProgress, wy + 0.35, wz * timelineProgress))
    })

    const perimeterGeo = new THREE.BufferGeometry().setFromPoints(perimeterPoints)
    const perimeterMat = new THREE.LineBasicMaterial({
      color: 0xef4444,
      linewidth: 3
    })
    const perimeterLine = new THREE.LineLoop(perimeterGeo, perimeterMat)
    scene.add(perimeterLine)
    perimeterLineRef.current = perimeterLine

    // 7. SPATIAL SPREAD CONTOURS (If Multi-Scenario Spread is provided)
    const spreadGroup = new THREE.Group()
    spreadMeshesRef.current = spreadGroup

    if (spreadPolygons && spreadPolygons.length > 0) {
      spreadPolygons.forEach((polyStep, stepIdx) => {
        const polyCoords = polyStep.polygon?.coordinates?.[0] || []
        if (polyCoords.length > 3) {
          const stepPoints: THREE.Vector3[] = []
          polyCoords.forEach((pt: any) => {
            const plon = Number(pt[0])
            const plat = Number(pt[1])
            const [px, py, pz] = geoToWorld(plon, plat, elevationScale)
            stepPoints.push(new THREE.Vector3(px, py + 0.45, pz))
          })
          const stepGeo = new THREE.BufferGeometry().setFromPoints(stepPoints)
          const stepColor = stepIdx === 0 ? 0xfacc15 : (stepIdx === 1 ? 0xf97316 : 0xef4444)
          const stepMat = new THREE.LineBasicMaterial({ color: stepColor, linewidth: 2 })
          const stepLine = new THREE.LineLoop(stepGeo, stepMat)
          spreadGroup.add(stepLine)
        }
      })
    }
    scene.add(spreadGroup)

    // 8. WEATHER VECTOR FIELD ARROWS (3D Animated Wind Vectors)
    const windGroup = new THREE.Group()
    windVectorsRef.current = windGroup

    if (weatherVectorsVisible && !performanceMode) {
      const rad = (windDirectionDeg * Math.PI) / 180
      const windDirVector = new THREE.Vector3(Math.sin(rad), 0, Math.cos(rad)).normalize()
      const arrowLength = Math.max(3.0, Math.min(8.0, windSpeedMph * 0.18))

      // Generate grid of animated wind arrows
      for (let wx = -25; wx <= 25; wx += 12) {
        for (let wz = -25; wz <= 25; wz += 12) {
          const arrow = new THREE.ArrowHelper(
            windDirVector,
            new THREE.Vector3(wx, 6.0, wz),
            arrowLength,
            0x38bdf8,
            arrowLength * 0.35,
            arrowLength * 0.2
          )
          windGroup.add(arrow)
        }
      }
    }
    scene.add(windGroup)

    // 9. DAMAGED STRUCTURE HOTSPOTS (DINS Cluster Markers)
    const structGroup = new THREE.Group()
    structureGroupRef.current = structGroup

    if (fire?.damaged_structure_hotspots && structuresVisible) {
      fire.damaged_structure_hotspots.forEach(h => {
        const [sx, sy, sz] = geoToWorld(h.coordinates[0], h.coordinates[1], elevationScale)
        const boxGeo = new THREE.BoxGeometry(1.2, 1.0, 1.2)
        const boxMat = new THREE.MeshStandardMaterial({
          color: 0xdc2626,
          roughness: 0.5,
          emissive: 0x7f1d1d,
          emissiveIntensity: 0.4
        })
        const box = new THREE.Mesh(boxGeo, boxMat)
        box.position.set(sx, sy + 0.5, sz)
        structGroup.add(box)

        const pillarGeo = new THREE.CylinderGeometry(0.08, 0.08, 4.5, 8)
        const pillarMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.65 })
        const pillar = new THREE.Mesh(pillarGeo, pillarMat)
        pillar.position.set(sx, sy + 2.25, sz)
        structGroup.add(pillar)
      })
    }
    scene.add(structGroup)

    // 10. INFRASTRUCTURE & EGRESS CANYONS
    const infraGroup = new THREE.Group()
    infraGroupRef.current = infraGroup

    if (infrastructureVisible) {
      if (fire?.ignition_point) {
        const [ix, iy, iz] = geoToWorld(fire.ignition_point.coordinates[0], fire.ignition_point.coordinates[1], elevationScale)
        const ignGeo = new THREE.ConeGeometry(1.1, 2.5, 6)
        ignGeo.rotateX(Math.PI)
        const ignMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 })
        const ignMesh = new THREE.Mesh(ignGeo, ignMat)
        ignMesh.position.set(ix, iy + 3.0, iz)
        infraGroup.add(ignMesh)
      }

      // River canyon spline
      const riverPoints = [
        new THREE.Vector3(-25, -2.4 * elevationScale, -28),
        new THREE.Vector3(-10, -2.8 * elevationScale, -12),
        new THREE.Vector3(5, -2.6 * elevationScale, 4),
        new THREE.Vector3(20, -2.2 * elevationScale, 22),
        new THREE.Vector3(35, -2.0 * elevationScale, 35)
      ]
      const riverCurve = new THREE.CatmullRomCurve3(riverPoints)
      const riverGeo = new THREE.TubeGeometry(riverCurve, 24, 0.45, 8, false)
      const riverMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.7 })
      const riverMesh = new THREE.Mesh(riverGeo, riverMat)
      infraGroup.add(riverMesh)
    }
    scene.add(infraGroup)

    // 11. DYNAMIC EMBER / DRIFT PARTICLES
    const emberCount = performanceMode ? 80 : 300
    const emberGeo = new THREE.BufferGeometry()
    const emberPositions = new Float32Array(emberCount * 3)
    const emberVels: number[] = []

    for (let i = 0; i < emberCount; i++) {
      emberPositions[i * 3] = (Math.random() - 0.5) * 35
      emberPositions[i * 3 + 1] = Math.random() * 12 + 1
      emberPositions[i * 3 + 2] = (Math.random() - 0.5) * 35
      emberVels.push(Math.random() * 0.05 + 0.03)
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3))
    const emberMat = new THREE.PointsMaterial({
      color: 0xf97316,
      size: 0.35,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    })
    const embers = new THREE.Points(emberGeo, emberMat)
    scene.add(embers)
    emberParticlesRef.current = embers

    // 12. MOUSE INTERACTION & ORBIT / PAN LOGIC
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        isRightDragging.current = true
      } else {
        isDragging.current = true
      }
      previousMousePosition.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect()
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      // Raycast on terrain for live coordinates
      if (terrainMeshRef.current && cameraRef.current) {
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)
        const intersects = raycasterRef.current.intersectObject(terrainMeshRef.current)
        if (intersects.length > 0) {
          const pt = intersects[0].point
          const [lon, lat] = worldToGeo(pt.x, pt.z)
          const elevM = Math.round(500 + pt.y * 80)
          const coordData = { lat, lon, elevM }
          setHoveredCoord(coordData)
          if (onCoordinatesHover) onCoordinatesHover(coordData)
        } else {
          setHoveredCoord(null)
          if (onCoordinatesHover) onCoordinatesHover(null)
        }
      }

      if (!cameraRef.current) return
      const deltaX = e.clientX - previousMousePosition.current.x
      const deltaY = e.clientY - previousMousePosition.current.y
      previousMousePosition.current = { x: e.clientX, y: e.clientY }

      if (isRightDragging.current) {
        // Pan Target
        cameraAngles.current.targetX -= deltaX * 0.05
        cameraAngles.current.targetZ -= deltaY * 0.05
      } else if (isDragging.current) {
        // Orbit Angles
        cameraAngles.current.theta -= deltaX * 0.007
        cameraAngles.current.phi = Math.max(0.1, Math.min(Math.PI / 2.1, cameraAngles.current.phi - deltaY * 0.007))
      } else {
        return
      }

      const { theta, phi, radius, targetX, targetZ } = cameraAngles.current
      cameraRef.current.position.x = targetX + radius * Math.sin(phi) * Math.sin(theta)
      cameraRef.current.position.y = radius * Math.cos(phi)
      cameraRef.current.position.z = targetZ + radius * Math.sin(phi) * Math.cos(theta)
      cameraRef.current.lookAt(targetX, 0, targetZ)
    }

    const handleMouseUp = () => {
      isDragging.current = false
      isRightDragging.current = false
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (!cameraRef.current) return
      cameraAngles.current.radius = Math.max(10, Math.min(100, cameraAngles.current.radius + e.deltaY * 0.05))
      const { theta, phi, radius, targetX, targetZ } = cameraAngles.current
      cameraRef.current.position.x = targetX + radius * Math.sin(phi) * Math.sin(theta)
      cameraRef.current.position.y = radius * Math.cos(phi)
      cameraRef.current.position.z = targetZ + radius * Math.sin(phi) * Math.cos(theta)
      cameraRef.current.lookAt(targetX, 0, targetZ)
    }

    const handleContextMenu = (e: MouseEvent) => e.preventDefault()

    mount.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    mount.addEventListener('wheel', handleWheel, { passive: false })
    mount.addEventListener('contextmenu', handleContextMenu)

    // Resize Handler
    const handleResize = () => {
      if (!mount || !rendererRef.current || !cameraRef.current) return
      const w = mount.clientWidth
      const h = mount.clientHeight
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    // 13. ANIMATION RENDER LOOP
    let clock = 0
    const animate = () => {
      clock += 0.015
      animFrameId.current = requestAnimationFrame(animate)

      // Animate fire glow
      fireGlow.intensity = 2.2 + Math.sin(clock * 5) * 0.6

      // Animate drifting embers
      if (emberParticlesRef.current && !performanceMode) {
        const positions = emberParticlesRef.current.geometry.attributes.position as THREE.BufferAttribute
        for (let i = 0; i < emberCount; i++) {
          let px = positions.getX(i)
          let py = positions.getY(i)
          let pz = positions.getZ(i)

          // Downwind drift based on windDirectionDeg
          const rad = (windDirectionDeg * Math.PI) / 180
          px += Math.sin(rad) * (emberVels[i] * 1.8)
          pz += Math.cos(rad) * (emberVels[i] * 1.8)
          py += Math.sin(clock + i) * 0.025

          if (px < -25 || px > 25 || pz < -25 || pz > 25 || py > 16) {
            px = (Math.random() - 0.5) * 20
            pz = (Math.random() - 0.5) * 20
            py = Math.random() * 2 + 1
          }

          positions.setXYZ(i, px, py, pz)
        }
        positions.needsUpdate = true
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
    animate()

    // 14. CLEANUP ON UNMOUNT
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      mount.removeEventListener('mousedown', handleMouseDown)
      mount.removeEventListener('wheel', handleWheel)
      mount.removeEventListener('contextmenu', handleContextMenu)

      terrainGeo.dispose()
      terrainMat.dispose()
      perimeterGeo.dispose()
      perimeterMat.dispose()
      emberGeo.dispose()
      emberMat.dispose()

      if (rendererRef.current) {
        rendererRef.current.dispose()
        if (rendererRef.current.domElement && mount.contains(rendererRef.current.domElement)) {
          mount.removeChild(rendererRef.current.domElement)
        }
      }
    }
  }, [
    fire?.id,
    customGeoJson,
    locationTarget?.name,
    centerLon,
    centerLat,
    currentSnapshotIndex,
    burnSeverityVisible,
    structuresVisible,
    infrastructureVisible,
    weatherVectorsVisible,
    windDirectionDeg,
    windSpeedMph,
    layerMode,
    layerOpacity,
    elevationScale,
    performanceMode,
    spreadPolygons,
    wireframe
  ])

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-[#1f382c] bg-[#050c09] shadow-2xl">
      {/* Three.js canvas mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Left Badge & Scale Reference */}
      <div className="absolute top-3.5 left-4 z-10 flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-[#08150f]/90 border border-[#22c55e]/30 text-[#4ade80] backdrop-blur-md flex items-center gap-1.5 shadow-lg">
            <Flame size={13} className="text-[#f97316] animate-pulse" />
            <span>
              {fire ? `${fire.name.toUpperCase()} (${fire.year})` : (locationTarget?.name ? locationTarget.name.toUpperCase() : 'CALIFORNIA 3D TWIN')}
            </span>
          </span>
          <span className="px-2 py-1 rounded-md text-[10px] font-mono bg-[#08150f]/90 border border-[#172b22] text-[#8b9f94] backdrop-blur-md hidden sm:inline-block">
            {performanceMode ? '⚡ Performance Mode' : 'High-Fidelity DEM'}
          </span>
        </div>

        {/* Live Coordinate Readout under cursor */}
        {hoveredCoord && (
          <div className="px-2 py-0.5 rounded bg-[#08150f]/85 border border-[#172b22] text-[10px] font-mono text-[#a3e635] flex items-center gap-2 backdrop-blur-sm self-start">
            <MapPin size={11} className="text-[#38bdf8]" />
            <span>{hoveredCoord.lat}°N, {Math.abs(hoveredCoord.lon)}°W</span>
            <span className="text-[#5b6f64]">·</span>
            <span>Elev: {hoveredCoord.elevM}m</span>
          </div>
        )}
      </div>

      {/* Top Right Camera Presets */}
      <div className="absolute top-3.5 right-4 z-10 flex items-center gap-1.5 bg-[#08150f]/90 border border-[#172b22] p-1 rounded-lg backdrop-blur-md shadow-lg">
        <button
          onClick={() => setCameraPreset('orbit')}
          title="Overview Perspective View"
          className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
            cameraView === 'orbit' ? 'bg-[#22c55e] text-[#070f0b]' : 'text-[#8b9f94] hover:text-[#f0fdf4]'
          }`}
        >
          <Compass size={12} />
          <span className="hidden sm:inline">Overview</span>
        </button>
        <button
          onClick={() => setCameraPreset('canyon')}
          title="Ignition Canyon View"
          className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
            cameraView === 'canyon' ? 'bg-[#22c55e] text-[#070f0b]' : 'text-[#8b9f94] hover:text-[#f0fdf4]'
          }`}
        >
          <Zap size={12} />
          <span className="hidden sm:inline">Ignition</span>
        </button>
        <button
          onClick={() => setCameraPreset('wui')}
          title="WUI Interface View"
          className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
            cameraView === 'wui' ? 'bg-[#22c55e] text-[#070f0b]' : 'text-[#8b9f94] hover:text-[#f0fdf4]'
          }`}
        >
          <Home size={12} />
          <span className="hidden sm:inline">WUI</span>
        </button>
        <button
          onClick={() => setCameraPreset('top')}
          title="Top-Down Ortho View"
          className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
            cameraView === 'top' ? 'bg-[#22c55e] text-[#070f0b]' : 'text-[#8b9f94] hover:text-[#f0fdf4]'
          }`}
        >
          <Eye size={12} />
          <span className="hidden sm:inline">Ortho</span>
        </button>
      </div>

      {/* 2D Minimap Corner Inset */}
      <div className="absolute bottom-3.5 right-4 z-10 p-1.5 rounded-xl bg-[#08150f]/90 border border-[#1b3d2b] shadow-xl backdrop-blur-md hidden sm:block">
        <canvas ref={minimapCanvasRef} width={76} height={76} className="rounded-lg border border-[#14261d]" />
        <div className="text-[9px] font-mono text-[#6b8073] text-center mt-1">
          Scale: ~5 km
        </div>
      </div>

      {/* Bottom Visual Legend */}
      <div className="absolute bottom-3.5 left-4 z-10 flex flex-wrap items-center gap-2 bg-[#08150f]/90 border border-[#172b22] px-3 py-1.5 rounded-lg text-[10px] font-mono text-[#cbd5d1] backdrop-blur-md shadow-lg pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 bg-[#ef4444] rounded-full inline-block" />
          <span>Fire Perimeter</span>
        </div>
        <span className="text-[#334155]">·</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded bg-[#381008] border border-[#ef4444]/40 inline-block" />
          <span>Burn Scar / dNBR</span>
        </div>
        {weatherVectorsVisible && (
          <>
            <span className="text-[#334155]">·</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-[#38bdf8] inline-block" />
              <span>Wind: {windSpeedMph}mph @ {windDirectionDeg}°</span>
            </div>
          </>
        )}
        <span className="text-[#334155]">·</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#facc15] inline-block" />
          <span>Ignition Node</span>
        </div>
      </div>

      {/* Scale bar indicator */}
      <div className="absolute bottom-12 left-4 z-10 flex items-center gap-1.5 pointer-events-none">
        <div className="flex flex-col">
          <div className="h-1 w-16 bg-[#a3e635] border border-black/40 rounded-sm" />
          <span className="text-[9px] font-mono text-[#a3e635]">2 km Scale</span>
        </div>
      </div>
    </div>
  )
}
