/**
 * Verified California Incorporated Cities & Major Places
 * Data source: US Census Bureau & California Department of Tax and Fee Administration
 */

export interface CaliforniaPlace {
  id: string
  name: string
  countyName: string
  countyId: string
  coordinates: [number, number] // [lon, lat]
  population?: number
  isIncorporated: boolean
  elevationMeters?: number
}

export const CALIFORNIA_PLACES: CaliforniaPlace[] = [
  // Butte County
  { id: 'ca-place-paradise', name: 'Paradise', countyName: 'Butte County', countyId: 'butte', coordinates: [-121.6219, 39.7596], population: 4764, isIncorporated: true, elevationMeters: 542 },
  { id: 'ca-place-chico', name: 'Chico', countyName: 'Butte County', countyId: 'butte', coordinates: [-121.8375, 39.7285], population: 101475, isIncorporated: true, elevationMeters: 60 },
  { id: 'ca-place-oroville', name: 'Oroville', countyName: 'Butte County', countyId: 'butte', coordinates: [-121.5564, 39.5138], population: 20042, isIncorporated: true, elevationMeters: 51 },
  { id: 'ca-place-magalia', name: 'Magalia', countyName: 'Butte County', countyId: 'butte', coordinates: [-121.604, 39.813], population: 7695, isIncorporated: false, elevationMeters: 710 },
  { id: 'ca-place-gridley', name: 'Gridley', countyName: 'Butte County', countyId: 'butte', coordinates: [-121.6936, 39.3638], population: 7421, isIncorporated: true, elevationMeters: 29 },

  // Sonoma County
  { id: 'ca-place-santa-rosa', name: 'Santa Rosa', countyName: 'Sonoma County', countyId: 'sonoma', coordinates: [-122.7141, 38.4404], population: 178127, isIncorporated: true, elevationMeters: 50 },
  { id: 'ca-place-petaluma', name: 'Petaluma', countyName: 'Sonoma County', countyId: 'sonoma', coordinates: [-122.6367, 38.2324], population: 59776, isIncorporated: true, elevationMeters: 10 },
  { id: 'ca-place-healdsburg', name: 'Healdsburg', countyName: 'Sonoma County', countyId: 'sonoma', coordinates: [-122.8692, 38.6105], population: 11340, isIncorporated: true, elevationMeters: 33 },
  { id: 'ca-place-sonoma', name: 'Sonoma', countyName: 'Sonoma County', countyId: 'sonoma', coordinates: [-122.4580, 38.2919], population: 10735, isIncorporated: true, elevationMeters: 26 },
  { id: 'ca-place-cloverdale', name: 'Cloverdale', countyName: 'Sonoma County', countyId: 'sonoma', coordinates: [-123.0172, 38.8055], population: 8996, isIncorporated: true, elevationMeters: 102 },

  // Napa County
  { id: 'ca-place-napa', name: 'Napa', countyName: 'Napa County', countyId: 'napa', coordinates: [-122.2869, 38.2975], population: 79246, isIncorporated: true, elevationMeters: 6 },
  { id: 'ca-place-st-helena', name: 'St. Helena', countyName: 'Napa County', countyId: 'napa', coordinates: [-122.4697, 38.5052], population: 5814, isIncorporated: true, elevationMeters: 77 },
  { id: 'ca-place-calistoga', name: 'Calistoga', countyName: 'Napa County', countyId: 'napa', coordinates: [-122.5797, 38.5788], population: 5228, isIncorporated: true, elevationMeters: 112 },

  // Shasta & Trinity
  { id: 'ca-place-redding', name: 'Redding', countyName: 'Shasta County', countyId: 'shasta', coordinates: [-122.3917, 40.5865], population: 93611, isIncorporated: true, elevationMeters: 172 },
  { id: 'ca-place-anderson', name: 'Anderson', countyName: 'Shasta County', countyId: 'shasta', coordinates: [-122.2978, 40.4482], population: 11323, isIncorporated: true, elevationMeters: 132 },
  { id: 'ca-place-shasta-lake', name: 'Shasta Lake', countyName: 'Shasta County', countyId: 'shasta', coordinates: [-122.3708, 40.6804], population: 10371, isIncorporated: true, elevationMeters: 246 },
  { id: 'ca-place-weaverville', name: 'Weaverville', countyName: 'Trinity County', countyId: 'trinity', coordinates: [-122.9408, 40.7307], population: 3667, isIncorporated: false, elevationMeters: 613 },

  // Placer & Nevada & El Dorado
  { id: 'ca-place-roseville', name: 'Roseville', countyName: 'Placer County', countyId: 'placer', coordinates: [-121.2880, 38.7521], population: 147773, isIncorporated: true, elevationMeters: 50 },
  { id: 'ca-place-auburn', name: 'Auburn', countyName: 'Placer County', countyId: 'placer', coordinates: [-121.0763, 38.8966], population: 13776, isIncorporated: true, elevationMeters: 374 },
  { id: 'ca-place-foresthill', name: 'Foresthill', countyName: 'Placer County', countyId: 'placer', coordinates: [-120.8327, 39.0210], population: 1481, isIncorporated: false, elevationMeters: 984 },
  { id: 'ca-place-truckee', name: 'Truckee', countyName: 'Nevada County', countyId: 'nevada', coordinates: [-120.1833, 39.3280], population: 16729, isIncorporated: true, elevationMeters: 1773 },
  { id: 'ca-place-south-lake-tahoe', name: 'South Lake Tahoe', countyName: 'El Dorado County', countyId: 'el-dorado', coordinates: [-119.9772, 38.9399], population: 21330, isIncorporated: true, elevationMeters: 1901 },
  { id: 'ca-place-placerville', name: 'Placerville', countyName: 'El Dorado County', countyId: 'el-dorado', coordinates: [-120.7986, 38.7296], population: 10747, isIncorporated: true, elevationMeters: 569 },

  // Bay Area & Santa Clara
  { id: 'ca-place-san-jose', name: 'San Jose', countyName: 'Santa Clara County', countyId: 'santa-clara', coordinates: [-121.8863, 37.3382], population: 1013240, isIncorporated: true, elevationMeters: 25 },
  { id: 'ca-place-morgan-hill', name: 'Morgan Hill', countyName: 'Santa Clara County', countyId: 'santa-clara', coordinates: [-121.6530, 37.1305], population: 45342, isIncorporated: true, elevationMeters: 107 },
  { id: 'ca-place-san-francisco', name: 'San Francisco', countyName: 'San Francisco County', countyId: 'san-francisco', coordinates: [-122.4194, 37.7749], population: 873965, isIncorporated: true, elevationMeters: 16 },
  { id: 'ca-place-oakland', name: 'Oakland', countyName: 'Alameda County', countyId: 'alameda', coordinates: [-122.2711, 37.8044], population: 440646, isIncorporated: true, elevationMeters: 13 },
  { id: 'ca-place-san-mateo', name: 'San Mateo', countyName: 'San Mateo County', countyId: 'san-mateo', coordinates: [-122.3255, 37.5630], population: 105661, isIncorporated: true, elevationMeters: 13 },

  // Central Valley & Sierra
  { id: 'ca-place-fresno', name: 'Fresno', countyName: 'Fresno County', countyId: 'fresno', coordinates: [-119.7871, 36.7468], population: 542107, isIncorporated: true, elevationMeters: 94 },
  { id: 'ca-place-clovis', name: 'Clovis', countyName: 'Fresno County', countyId: 'fresno', coordinates: [-119.7029, 36.8252], population: 120124, isIncorporated: true, elevationMeters: 110 },
  { id: 'ca-place-shaver-lake', name: 'Shaver Lake', countyName: 'Fresno County', countyId: 'fresno', coordinates: [-119.317, 37.104], population: 634, isIncorporated: false, elevationMeters: 1640 },
  { id: 'ca-place-mariposa', name: 'Mariposa', countyName: 'Mariposa County', countyId: 'mariposa', coordinates: [-119.9663, 37.4849], population: 1526, isIncorporated: false, elevationMeters: 595 },
  { id: 'ca-place-bakersfield', name: 'Bakersfield', countyName: 'Kern County', countyId: 'kern', coordinates: [-119.0187, 35.3733], population: 403455, isIncorporated: true, elevationMeters: 123 },

  // Southern California
  { id: 'ca-place-los-angeles', name: 'Los Angeles', countyName: 'Los Angeles County', countyId: 'los-angeles', coordinates: [-118.2437, 34.0522], population: 3898747, isIncorporated: true, elevationMeters: 87 },
  { id: 'ca-place-malibu', name: 'Malibu', countyName: 'Los Angeles County', countyId: 'los-angeles', coordinates: [-118.6920, 34.0750], population: 10654, isIncorporated: true, elevationMeters: 32 },
  { id: 'ca-place-pasadena', name: 'Pasadena', countyName: 'Los Angeles County', countyId: 'los-angeles', coordinates: [-118.1445, 34.1478], population: 138699, isIncorporated: true, elevationMeters: 263 },
  { id: 'ca-place-ventura', name: 'Ventura', countyName: 'Ventura County', countyId: 'ventura', coordinates: [-119.2945, 34.2805], population: 110763, isIncorporated: true, elevationMeters: 11 },
  { id: 'ca-place-ojai', name: 'Ojai', countyName: 'Ventura County', countyId: 'ventura', coordinates: [-119.2450, 34.4480], population: 7637, isIncorporated: true, elevationMeters: 227 },
  { id: 'ca-place-santa-barbara', name: 'Santa Barbara', countyName: 'Santa Barbara County', countyId: 'santa-barbara', coordinates: [-119.6982, 34.4208], population: 88665, isIncorporated: true, elevationMeters: 15 },
  { id: 'ca-place-san-diego', name: 'San Diego', countyName: 'San Diego County', countyId: 'san-diego', coordinates: [-117.1611, 32.7157], population: 1386932, isIncorporated: true, elevationMeters: 20 },
  { id: 'ca-place-julian', name: 'Julian', countyName: 'San Diego County', countyId: 'san-diego', coordinates: [-116.6020, 33.0780], population: 1502, isIncorporated: false, elevationMeters: 1288 },
  { id: 'ca-place-riverside', name: 'Riverside', countyName: 'Riverside County', countyId: 'riverside', coordinates: [-117.3755, 33.9806], population: 314998, isIncorporated: true, elevationMeters: 252 },
  { id: 'ca-place-san-bernardino', name: 'San Bernardino', countyName: 'San Bernardino County', countyId: 'san-bernardino', coordinates: [-117.2898, 34.1083], population: 222101, isIncorporated: true, elevationMeters: 328 },

  // Northern & Coastal
  { id: 'ca-place-eureka', name: 'Eureka', countyName: 'Humboldt County', countyId: 'humboldt', coordinates: [-124.1637, 40.8021], population: 26512, isIncorporated: true, elevationMeters: 12 },
  { id: 'ca-place-yreka', name: 'Yreka', countyName: 'Siskiyou County', countyId: 'siskiyou', coordinates: [-122.6345, 41.7354], population: 7807, isIncorporated: true, elevationMeters: 789 },
  { id: 'ca-place-san-luis-obispo', name: 'San Luis Obispo', countyName: 'San Luis Obispo County', countyId: 'san-luis-obispo', coordinates: [-120.6596, 35.2828], population: 47088, isIncorporated: true, elevationMeters: 71 },
  { id: 'ca-place-monterey', name: 'Monterey', countyName: 'Monterey County', countyId: 'monterey', coordinates: [-121.8947, 36.6002], population: 30218, isIncorporated: true, elevationMeters: 8 }
]

/**
 * Find the nearest verified city / place to a coordinate pair
 */
export function findNearestPlace(coordinates: [number, number], maxDistanceKm = 50): CaliforniaPlace | null {
  const [lon, lat] = coordinates
  let nearest: CaliforniaPlace | null = null
  let minDistance = Infinity

  for (const place of CALIFORNIA_PLACES) {
    const dLat = (place.coordinates[1] - lat) * 111
    const dLon = (place.coordinates[0] - lon) * 111 * Math.cos((lat * Math.PI) / 180)
    const dist = Math.sqrt(dLat * dLat + dLon * dLon)

    if (dist < minDistance && dist <= maxDistanceKm) {
      minDistance = dist
      nearest = place
    }
  }

  return nearest
}
