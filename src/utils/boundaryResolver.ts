/**
 * TERRAVOX Administrative Boundary & Containment Engine
 * Fast, verified point-in-polygon ray-casting for California's 58 counties
 */

export interface CountyFeatureProperties {
  id: string
  name: string
  fullName: string
  cartodb_id?: number
}

export interface CountyFeature {
  type: 'Feature'
  id: string
  properties: CountyFeatureProperties
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: any
  }
}

export interface GeoJSONCountyCollection {
  type: 'FeatureCollection'
  features: CountyFeature[]
}

let cachedCountiesGeoJSON: GeoJSONCountyCollection | null = null
let loadingPromise: Promise<GeoJSONCountyCollection | null> | null = null

/**
 * Fetch and cache California counties GeoJSON from /data/california_counties.geojson
 */
export async function loadCaliforniaCounties(): Promise<GeoJSONCountyCollection | null> {
  if (cachedCountiesGeoJSON) return cachedCountiesGeoJSON
  if (loadingPromise) return loadingPromise

  loadingPromise = fetch('/data/california_counties.geojson')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      return res.json() as Promise<GeoJSONCountyCollection>
    })
    .then(data => {
      cachedCountiesGeoJSON = data
      return data
    })
    .catch(err => {
      console.warn('[TERRAVOX] Could not load california_counties.geojson:', err)
      return null
    })

  return loadingPromise
}

/**
 * Ray-casting point-in-polygon
 */
function isPointInRing(point: [number, number], ring: [number, number][]): boolean {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Check if coordinate [lon, lat] is inside a polygon or multipolygon
 */
function isPointInGeometry(point: [number, number], geom: CountyFeature['geometry']): boolean {
  if (geom.type === 'Polygon') {
    return isPointInRing(point, geom.coordinates[0])
  }
  if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) {
      if (isPointInRing(point, poly[0])) return true
    }
  }
  return false
}

/**
 * Resolve county containing the coordinate pair [lon, lat]
 */
export function resolveCountyForCoordinates(
  coordinates: [number, number],
  collection?: GeoJSONCountyCollection | null
): CountyFeatureProperties | null {
  const data = collection || cachedCountiesGeoJSON
  if (!data || !data.features) return null

  for (const feature of data.features) {
    if (isPointInGeometry(coordinates, feature.geometry)) {
      return feature.properties
    }
  }
  return null
}

/**
 * Calculate bounding box [minLng, minLat, maxLng, maxLat] for a geometry
 */
export function getFeatureBounds(feature: CountyFeature): [[number, number], [number, number]] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  function scanRing(ring: [number, number][]) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }

  if (feature.geometry.type === 'Polygon') {
    scanRing(feature.geometry.coordinates[0])
  } else if (feature.geometry.type === 'MultiPolygon') {
    for (const poly of feature.geometry.coordinates) {
      scanRing(poly[0])
    }
  }

  return [[minX, minY], [maxX, maxY]]
}
