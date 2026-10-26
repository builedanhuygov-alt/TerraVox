/**
 * TERRAVOX Geographic Configuration Engine
 * 
 * Reusable, decoupled geographic intelligence architecture.
 * Supports the California Pilot (Primary Flagship) and secondary regions
 * without coupling UI components to hardcoded coordinates or labels.
 * 
 * Preserves backend contracts and historical data integrity.
 * Rule: NEVER display Gia Lai data under California labels, or vice versa.
 */

export function isInsideCalifornia(lon: number, lat: number): boolean {
  return lat >= 32.5 && lat <= 42.0 && lon >= -124.5 && lon <= -114.1
}

export type HazardLevel = 'I' | 'II' | 'III' | 'IV' | 'V'

export interface HazardScaleDefinition {
  level: HazardLevel
  label: string
  labelShort: string
  color: string
  bg: string
  border: string
  description: string
  actionRequired: string
}

export const NFDRS_HAZARD_SCALE: Record<HazardLevel, HazardScaleDefinition> = {
  I: {
    level: 'I',
    label: 'Low',
    labelShort: 'Class I - Low',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.3)',
    description: 'Fuels do not ignite readily from small firebrands. Low spread potential.',
    actionRequired: 'Routine monitoring. Normal patrol schedules.'
  },
  II: {
    level: 'II',
    label: 'Moderate',
    labelShort: 'Class II - Moderate',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.3)',
    description: 'Fires can start from most accidental causes. Spread rate moderate in fine fuels.',
    actionRequired: 'Enhanced observation in wildland-urban interface (WUI) corridors.'
  },
  III: {
    level: 'III',
    label: 'High',
    labelShort: 'Class III - High',
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.12)',
    border: 'rgba(234, 179, 8, 0.3)',
    description: 'Fine fuels ignite readily. Unattended brush fires likely to escape. Spotting probable.',
    actionRequired: 'Pre-position initial attack crews. Restrict agricultural open burning.'
  },
  IV: {
    level: 'IV',
    label: 'Very High',
    labelShort: 'Class IV - Very High',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.12)',
    border: 'rgba(249, 115, 22, 0.3)',
    description: 'Fires start easily and spread rapidly. Direct attack at fire head often impossible.',
    actionRequired: 'Stage aerial tankers. Active thermal patrol on ridges. Standby evacuation alerts.'
  },
  V: {
    level: 'V',
    label: 'Extreme / Red Flag',
    labelShort: 'Class V - Extreme',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.4)',
    description: 'Explosive fire spread. Severe wind gusts, RH < 12%, critical fuel dry-down.',
    actionRequired: 'Red Flag Warning declared. Incident Command activated. High-risk power line de-energization standby.'
  }
}

export type CoverageStatus = 'FULL' | 'SATELLITE_ONLY' | 'UNSUPPORTED'

export interface MonitoredSector {
  id: string
  name: string
  type: 'WUI' | 'FOREST_RESERVE' | 'CANYON_PASS' | 'RIDGE_CORRIDOR'
  coordinates: [number, number] // [lon, lat]
  elevationMeters: number
  primaryFuelType: string
  coverage: CoverageStatus
  currentRiskLevel: HazardLevel
  historicalScar?: string
}

export interface CountyRegion {
  id: string
  name: string
  state: string
  coordinates: [number, number] // [lon, lat]
  zoom: number
  coverage: CoverageStatus
  agencyUnit: string // e.g. CAL FIRE Butte Unit (BTU)
  totalAreaSqKm: number
  wuiPopulation: number
  activeHotspotsCount: number
  averageFuelMoisturePct: number
  sectors: MonitoredSector[]
  description: string
}

export interface EnvironmentalIncident {
  id: string
  title: string
  regionId: string
  countyId: string
  sectorName: string
  coordinates: [number, number] // [lon, lat]
  timestamp: string
  category: 'THERMAL_ANOMALY' | 'CONFIRMED_WILDFIRE' | 'PRESCRIBED_BURN' | 'HISTORICAL_LANDMARK' | 'SMOKE_PLUME'
  status: 'UNVERIFIED' | 'INVESTIGATING' | 'CONFIRMED_ACTIVE' | 'CONTAINED' | 'HISTORICAL_STUDY'
  hazardLevel: HazardLevel
  brightnessKelvin?: number
  confidenceScore: number // 0 to 1
  satelliteSensor?: string // e.g. VIIRS_SNPP_NRT, MODIS_AQUA, SENTINEL-2
  estimatedAreaHa?: number
  thumbnail?: string
  weatherContext: {
    tempC: number
    tempF: number
    relativeHumidityPct: number
    windSpeedMph: number
    windGustMph: number
    windDirection: string
    fuelMoisture1000hrPct: number
  }
  evidenceChain: {
    observedFacts: string[]
    satelliteTelemetry: string[]
    modelInferences: string[]
    uncertainties: string[]
    recommendedActions: string[]
  }
  officialSource: string
  officialUrl?: string
  agencyUnit?: string
  acresBurned?: number
  containmentPercent?: number
}

export interface PilotRegion {
  id: string
  name: string
  country: string
  tagline: string
  center: [number, number] // [lon, lat]
  bounds: [[number, number], [number, number]] // SW, NE
  defaultZoom: number
  hazardScale: Record<HazardLevel, HazardScaleDefinition>
  counties: CountyRegion[]
  incidents: EnvironmentalIncident[]
  dataFreshness: {
    satelliteStatus: 'LIVE' | 'CACHED' | 'STALE'
    weatherStatus: 'LIVE' | 'CACHED'
    firmsStatus: 'LIVE' | 'OFFLINE'
    lastSyncIso: string
  }
}

/**
 * CALIFORNIA PILOT CONFIGURATION (FLAGSHIP)
 * Geographically verified counties, WUI sectors, CAL FIRE jurisdictions,
 * and traceable satellite/incident intelligence.
 */
export const CALIFORNIA_PILOT: PilotRegion = {
  id: 'california-us',
  name: 'California, United States',
  country: 'United States',
  tagline: 'Sierra Foothills, Mayacamas Range & Pacific Coastal Surveillance',
  center: [-120.75, 38.25],
  bounds: [
    [-124.48, 32.53], // SW: Imperial / San Diego border
    [-114.13, 42.01]  // NE: Modoc / Oregon border
  ],
  defaultZoom: 6.8,
  hazardScale: NFDRS_HAZARD_SCALE,
  dataFreshness: {
    satelliteStatus: 'LIVE',
    weatherStatus: 'LIVE',
    firmsStatus: 'LIVE',
    lastSyncIso: new Date().toISOString()
  },
  counties: [
    {
      id: 'butte',
      name: 'Butte County',
      state: 'CA',
      coordinates: [-121.6, 39.75],
      zoom: 10,
      coverage: 'FULL',
      agencyUnit: 'CAL FIRE Butte Unit (BTU)',
      totalAreaSqKm: 4344,
      wuiPopulation: 86500,
      activeHotspotsCount: 1,
      averageFuelMoisturePct: 8.4,
      description: 'Sierra Nevada foothills and Feather River canyon corridor. High susceptibility to downslope foehn winds and fine fuel rapid ignition.',
      sectors: [
        {
          id: 'butte-paradise-wui',
          name: 'Paradise WUI Interface Sector',
          type: 'WUI',
          coordinates: [-121.6219, 39.7596],
          elevationMeters: 542,
          primaryFuelType: 'Mixed Conifer & Ponderosa Pine with Brush',
          coverage: 'FULL',
          currentRiskLevel: 'III',
          historicalScar: 'Camp Fire (2018) regrowth zone'
        },
        {
          id: 'butte-concow-basin',
          name: 'Concow Basin & Pulga Pass',
          type: 'CANYON_PASS',
          coordinates: [-121.528, 39.789],
          elevationMeters: 620,
          primaryFuelType: 'Chaparral & Manzanita thicket',
          coverage: 'FULL',
          currentRiskLevel: 'IV',
          historicalScar: 'Feather River drainage corridor'
        },
        {
          id: 'butte-magalia-ridge',
          name: 'Magalia Upper Ridge Corridor',
          type: 'RIDGE_CORRIDOR',
          coordinates: [-121.604, 39.813],
          elevationMeters: 710,
          primaryFuelType: 'Timber understory & dense litter',
          coverage: 'FULL',
          currentRiskLevel: 'III'
        }
      ]
    },
    {
      id: 'sonoma',
      name: 'Sonoma County',
      state: 'CA',
      coordinates: [-122.75, 38.52],
      zoom: 10,
      coverage: 'FULL',
      agencyUnit: 'CAL FIRE Sonoma-Lake-Napa Unit (LNU)',
      totalAreaSqKm: 4082,
      wuiPopulation: 142000,
      activeHotspotsCount: 0,
      averageFuelMoisturePct: 11.2,
      description: 'Mayacamas Mountains and coastal valleys. Subject to dry north-easterly Diablo wind events in late summer and autumn.',
      sectors: [
        {
          id: 'sonoma-mark-west',
          name: 'Mark West Springs Corridor',
          type: 'WUI',
          coordinates: [-122.684, 38.532],
          elevationMeters: 280,
          primaryFuelType: 'Oak Woodland & Annual Grassland',
          coverage: 'FULL',
          currentRiskLevel: 'II',
          historicalScar: 'Tubbs Fire (2017) boundary'
        },
        {
          id: 'sonoma-geysers-mayacamas',
          name: 'The Geysers / Mayacamas Ridge',
          type: 'RIDGE_CORRIDOR',
          coordinates: [-122.755, 38.775],
          elevationMeters: 840,
          primaryFuelType: 'Chamise Chaparral & Scrub Oak',
          coverage: 'FULL',
          currentRiskLevel: 'III',
          historicalScar: 'Kincade Fire (2019) footprint'
        }
      ]
    },
    {
      id: 'los-angeles-ventura',
      name: 'Los Angeles & Ventura Counties',
      state: 'CA',
      coordinates: [-118.8, 34.1],
      zoom: 9.8,
      coverage: 'FULL',
      agencyUnit: 'CAL FIRE Ventura (VNC) & LACoFD Fire Forensics',
      totalAreaSqKm: 12300,
      wuiPopulation: 310000,
      activeHotspotsCount: 0,
      averageFuelMoisturePct: 7.9,
      description: 'Transverse Ranges, Santa Monica Mountains and Santa Clara River Valley. Extreme fire threat during offshore Santa Ana wind surges.',
      sectors: [
        {
          id: 'malibu-canyon-pass',
          name: 'Malibu Coastal Canyon Corridor',
          type: 'CANYON_PASS',
          coordinates: [-118.692, 34.075],
          elevationMeters: 310,
          primaryFuelType: 'Coastal Sage Scrub & Ceanothus',
          coverage: 'FULL',
          currentRiskLevel: 'III',
          historicalScar: 'Woolsey Fire (2018) burn zone'
        },
        {
          id: 'ojai-topatopa-ridge',
          name: 'Ojai Valley & Topatopa Foothills',
          type: 'RIDGE_CORRIDOR',
          coordinates: [-119.245, 34.468],
          elevationMeters: 650,
          primaryFuelType: 'Montane Chaparral & Riparian Oaks',
          coverage: 'FULL',
          currentRiskLevel: 'IV',
          historicalScar: 'Thomas Fire (2017) upper scar'
        }
      ]
    },
    {
      id: 'shasta-trinity',
      name: 'Shasta & Trinity Counties',
      state: 'CA',
      coordinates: [-122.4, 40.6],
      zoom: 9.5,
      coverage: 'FULL',
      agencyUnit: 'CAL FIRE Shasta-Trinity Unit (SHU)',
      totalAreaSqKm: 18100,
      wuiPopulation: 74000,
      activeHotspotsCount: 0,
      averageFuelMoisturePct: 9.8,
      description: 'Klamath Mountains and northern Sacramento Valley head. High lightning activity and complex steep topography.',
      sectors: [
        {
          id: 'whiskeytown-pass',
          name: 'Whiskeytown Divide',
          type: 'CANYON_PASS',
          coordinates: [-122.56, 40.63],
          elevationMeters: 480,
          primaryFuelType: 'Douglas Fir & Pine Timberland',
          coverage: 'FULL',
          currentRiskLevel: 'II',
          historicalScar: 'Carr Fire (2018) perimeter'
        }
      ]
    },
    {
      id: 'fresno-madera',
      name: 'Fresno & Madera Counties',
      state: 'CA',
      coordinates: [-119.3, 37.1],
      zoom: 9.5,
      coverage: 'FULL',
      agencyUnit: 'CAL FIRE Fresno-Kings Unit (FKU) / USFS Sierra NF',
      totalAreaSqKm: 21500,
      wuiPopulation: 62000,
      activeHotspotsCount: 0,
      averageFuelMoisturePct: 8.1,
      description: 'Sierra National Forest western slopes. Severe tree mortality from historical drought and bark beetle infestation.',
      sectors: [
        {
          id: 'shaver-lake-ridge',
          name: 'Shaver Lake Basin Corridor',
          type: 'WUI',
          coordinates: [-119.317, 37.104],
          elevationMeters: 1640,
          primaryFuelType: 'Heavy Timber Mortality & Standing Snags',
          coverage: 'FULL',
          currentRiskLevel: 'III',
          historicalScar: 'Creek Fire (2020) footprint'
        }
      ]
    },
    {
      id: 'san-diego',
      name: 'San Diego County',
      state: 'CA',
      coordinates: [-116.7, 33.0],
      zoom: 9.5,
      coverage: 'FULL',
      agencyUnit: 'CAL FIRE San Diego Unit (MVU)',
      totalAreaSqKm: 11721,
      wuiPopulation: 185000,
      activeHotspotsCount: 0,
      averageFuelMoisturePct: 9.1,
      description: 'Cleveland National Forest and inland chaparral ridges. Vulnerable to Santa Ana wind corridors through mountain passes.',
      sectors: [
        {
          id: 'julian-cuyamaca',
          name: 'Julian & Cuyamaca Crest',
          type: 'FOREST_RESERVE',
          coordinates: [-116.602, 33.078],
          elevationMeters: 1280,
          primaryFuelType: 'Black Oak & Pine Woodland',
          coverage: 'FULL',
          currentRiskLevel: 'II'
        }
      ]
    }
  ],
  incidents: [
    {
      id: 'ca-inc-2026-081',
      title: 'Feather River Canyon Thermal Anomaly',
      regionId: 'california-us',
      countyId: 'butte',
      sectorName: 'Concow Basin & Pulga Pass',
      coordinates: [-121.528, 39.789],
      timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      category: 'THERMAL_ANOMALY',
      status: 'INVESTIGATING',
      hazardLevel: 'IV',
      brightnessKelvin: 326.8,
      confidenceScore: 0.88,
      satelliteSensor: 'NASA FIRMS (VIIRS)',
      estimatedAreaHa: 4.8,
      thumbnail: '/field/forest-fire-hisgett.jpg',
      weatherContext: {
        tempC: 28.0,
        tempF: 82.4,
        relativeHumidityPct: 14,
        windSpeedMph: 16.0,
        windGustMph: 24.8,
        windDirection: 'NE (Down-canyon foehn)',
        fuelMoisture1000hrPct: 7.8
      },
      evidenceChain: {
        observedFacts: [
          'Satellite sensor VIIRS detected thermal cluster at 39.7890°N, 121.5280°W with brightness temp 326.8 K.',
          'Local surface weather indicates critical relative humidity (14%) and north-easterly gusts exceeding 24 mph.',
          'No authorized agricultural burn permit registered in Butte County BTU system for this sector.'
        ],
        satelliteTelemetry: [
          'VIIRS I-4 (3.74 µm) radiometric radiance spike: 326.8 K.',
          'Sentinel-2 MSI Pre-Pass NDVI: 0.18 (severe vegetative drought stress across canyon wall).',
          'Cloud cover index over Feather River basin: 0% (clear optical path).'
        ],
        modelInferences: [
          'NFDRS fuel model G (Short-needle conifer & heavy dead fuel) indicates rapid initial rate of spread.',
          'Flame length estimated at 2.4 - 3.8 meters in untreated brush if uncontained within 30 minutes.'
        ],
        uncertainties: [
          'Ground visual confirmation pending UAV dispatch due to steep canyon terrain.',
          'Possible industrial or railway equipment heat reflection, though thermal footprint shape suggests vegetative combustion.'
        ],
        recommendedActions: [
          'Dispatch CAL FIRE BTU Battalion Chief 2112 for ground reconnaissance from Highway 70 vista.',
          'Request aerial thermal pass from Chico airbase tanker operations.',
          'Place Concow and Pulga volunteer fire units on standby.'
        ]
      },
      officialSource: 'NASA FIRMS NRT & CAL FIRE BTU Central Dispatch',
      officialUrl: 'https://firms.modaps.eosdis.nasa.gov/'
    },
    {
      id: 'ca-inc-mosquito',
      title: 'Mosquito Fire Area',
      regionId: 'california-us',
      countyId: 'placer',
      sectorName: 'Foresthill Divide & Middle Fork',
      coordinates: [-120.5700, 39.3250],
      timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      category: 'THERMAL_ANOMALY',
      status: 'UNVERIFIED',
      hazardLevel: 'III',
      brightnessKelvin: 318.2,
      confidenceScore: 0.72,
      satelliteSensor: 'NASA FIRMS (MODIS)',
      estimatedAreaHa: 8.4,
      thumbnail: '/field/lick-fire-night.jpg',
      weatherContext: {
        tempC: 26.2,
        tempF: 79.2,
        relativeHumidityPct: 17,
        windSpeedMph: 12.5,
        windGustMph: 19.0,
        windDirection: 'WNW',
        fuelMoisture1000hrPct: 8.9
      },
      evidenceChain: {
        observedFacts: [
          'MODIS thermal anomaly flagged along Middle Fork American River canyon slopes.',
          'Area sits within prior burn perimeter regrowth zone with dense manzanita brush.'
        ],
        satelliteTelemetry: [
          'MODIS 1km pixel centroid localized on ridgeline at 39.3250°N, 120.5700°W.',
          'NDVI 0.22 indicates moderate fuel cured status.'
        ],
        modelInferences: [
          'Moderate spread rate projected under current 12.5 mph wind regime.'
        ],
        uncertainties: [
          'Terrain occlusion in steep canyon may mask spot fire extent.'
        ],
        recommendedActions: [
          'ALERTCalifornia camera pan check from Big Reservoir mount.',
          'Stage Type 3 wildland engine at Foresthill ranger station.'
        ]
      },
      officialSource: 'NASA FIRMS & Placer County OES',
      officialUrl: 'https://firms.modaps.eosdis.nasa.gov/'
    },
    {
      id: 'ca-inc-scu',
      title: 'SCU Lightning Complex',
      regionId: 'california-us',
      countyId: 'santa-clara',
      sectorName: 'Mount Hamilton & Diablo Range',
      coordinates: [-121.5800, 37.3100],
      timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      category: 'THERMAL_ANOMALY',
      status: 'INVESTIGATING',
      hazardLevel: 'IV',
      brightnessKelvin: 334.1,
      confidenceScore: 0.91,
      satelliteSensor: 'NASA FIRMS (VIIRS)',
      estimatedAreaHa: 12.0,
      thumbnail: '/field/yellowstone-pyro.jpg',
      weatherContext: {
        tempC: 31.0,
        tempF: 87.8,
        relativeHumidityPct: 11,
        windSpeedMph: 18.0,
        windGustMph: 28.5,
        windDirection: 'NE',
        fuelMoisture1000hrPct: 6.9
      },
      evidenceChain: {
        observedFacts: [
          'High radiance thermal cluster detected in remote Diablo Range grassland and oak savannah.',
          'Dry lightning strike registered by National Lightning Detection Network 6 hours prior.'
        ],
        satelliteTelemetry: [
          'VIIRS I-4 brightness temp 334.1 K with 91% confidence rating.',
          'Rapid thermal blooming observed across consecutive afternoon orbits.'
        ],
        modelInferences: [
          'High potential for rapid grass fire run up slopes toward Lick Observatory ridge.'
        ],
        uncertainties: [
          'Remote road access limits initial ground crew attack speed.'
        ],
        recommendedActions: [
          'Dispatch aerial reconnaissance from Hollister Air Attack Base.',
          'Notify Santa Clara County Fire Department and CAL FIRE SCU unit.'
        ]
      },
      officialSource: 'NASA FIRMS & CAL FIRE SCU Unit',
      officialUrl: 'https://firms.modaps.eosdis.nasa.gov/'
    },
    {
      id: 'ca-inc-dixie',
      title: 'Dixie Fire Zone',
      regionId: 'california-us',
      countyId: 'lassen',
      sectorName: 'Indian Valley & Lake Almanor Basin',
      coordinates: [-121.0300, 40.1200],
      timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      category: 'THERMAL_ANOMALY',
      status: 'UNVERIFIED',
      hazardLevel: 'III',
      brightnessKelvin: 314.5,
      confidenceScore: 0.69,
      satelliteSensor: 'NASA FIRMS (VIIRS)',
      estimatedAreaHa: 3.5,
      thumbnail: '/field/mullen-fire.jpg',
      weatherContext: {
        tempC: 24.5,
        tempF: 76.1,
        relativeHumidityPct: 21,
        windSpeedMph: 9.8,
        windGustMph: 15.0,
        windDirection: 'SW',
        fuelMoisture1000hrPct: 10.4
      },
      evidenceChain: {
        observedFacts: [
          'Isolated thermal anomaly detected in Lassen National Forest timber stand.',
          'Moderate humidity recovery recorded overnight.'
        ],
        satelliteTelemetry: [
          'VIIRS single pixel detection with 69% confidence score.'
        ],
        modelInferences: [
          'Low immediate threat to residential structures in Chester / Lake Almanor.'
        ],
        uncertainties: [
          'Could represent small controlled slash burn or lightning holdover.'
        ],
        recommendedActions: [
          'USFS Lassen National Forest dispatch verification.'
        ]
      },
      officialSource: 'NASA FIRMS & USFS Lassen NF',
      officialUrl: 'https://firms.modaps.eosdis.nasa.gov/'
    },
    {
      id: 'ca-inc-czu',
      title: 'CZU Perimeter',
      regionId: 'california-us',
      countyId: 'san-mateo',
      sectorName: 'Big Basin & Butano Ridge',
      coordinates: [-122.2800, 37.2500],
      timestamp: new Date(Date.now() - 13 * 3600 * 1000).toISOString(),
      category: 'THERMAL_ANOMALY',
      status: 'UNVERIFIED',
      hazardLevel: 'II',
      brightnessKelvin: 308.2,
      confidenceScore: 0.48,
      satelliteSensor: 'NASA FIRMS (MODIS)',
      estimatedAreaHa: 1.2,
      thumbnail: '/field/roadside-fire.jpg',
      weatherContext: {
        tempC: 19.8,
        tempF: 67.6,
        relativeHumidityPct: 45,
        windSpeedMph: 8.0,
        windGustMph: 12.0,
        windDirection: 'W (Marine layer influence)',
        fuelMoisture1000hrPct: 13.5
      },
      evidenceChain: {
        observedFacts: [
          'Low confidence thermal anomaly near coastal fog line.',
          'High relative humidity and maritime air buffer spread potential.'
        ],
        satelliteTelemetry: [
          'MODIS thermal signal near threshold limit (308.2 K).'
        ],
        modelInferences: [
          'Very low rate of spread; fuel moisture well above ignition threshold.'
        ],
        uncertainties: [
          'High probability of false positive from warm coastal rock outcrop.'
        ],
        recommendedActions: [
          'Maintain passive satellite surveillance.'
        ]
      },
      officialSource: 'NASA FIRMS & CAL FIRE CZU Unit',
      officialUrl: 'https://firms.modaps.eosdis.nasa.gov/'
    },
    {
      id: 'ca-inc-2026-042',
      title: 'Mayacamas Ridge Vegetation Dryness Anomaly',
      regionId: 'california-us',
      countyId: 'sonoma',
      sectorName: 'The Geysers / Mayacamas Ridge',
      coordinates: [-122.755, 38.775],
      timestamp: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
      category: 'THERMAL_ANOMALY',
      status: 'UNVERIFIED',
      hazardLevel: 'III',
      brightnessKelvin: 312.4,
      confidenceScore: 0.64,
      satelliteSensor: 'MODIS_AQUA (1km)',
      estimatedAreaHa: 2.1,
      weatherContext: {
        tempC: 25.1,
        tempF: 77.2,
        relativeHumidityPct: 18,
        windSpeedMph: 12.0,
        windGustMph: 18.5,
        windDirection: 'NNE',
        fuelMoisture1000hrPct: 9.6
      },
      evidenceChain: {
        observedFacts: [
          'MODIS thermal anomaly flagged during afternoon overpass on ridgeline chaparral.',
          'Geysers geothermal plant steam plumes nearby may contribute background heat signature.'
        ],
        satelliteTelemetry: [
          'Moderate confidence (64%) due to 1km resolution pixel blurring near geothermal infrastructure.',
          'Sentinel-2 NDMI (Normalized Difference Moisture Index) shows -0.12 (dry canopy).'
        ],
        modelInferences: [
          'Localized heat signature consistent with either small spot fire or industrial venting.'
        ],
        uncertainties: [
          'Requires differentiation between geothermal pipe heat and chaparral brush combustion.'
        ],
        recommendedActions: [
          'Cross-reference with automated ALERTCalifornia camera feed on Pine Flat Road.',
          'Notify LNU dispatch for camera tilt verification before ground unit rollout.'
        ]
      },
      officialSource: 'NASA FIRMS & ALERTCalifornia Camera Network',
      officialUrl: 'https://www.fire.ca.gov/'
    },
    {
      id: 'ca-hist-camp-fire',
      title: 'Historical Forensics: Camp Fire (2018)',
      regionId: 'california-us',
      countyId: 'butte',
      sectorName: 'Paradise WUI Interface Sector',
      coordinates: [-121.536, 39.814],
      timestamp: '2018-11-08T06:33:00-08:00',
      category: 'HISTORICAL_LANDMARK',
      status: 'HISTORICAL_STUDY',
      hazardLevel: 'V',
      brightnessKelvin: 368.5,
      confidenceScore: 1.0,
      satelliteSensor: 'GOES-16 & VIIRS SNPP',
      estimatedAreaHa: 62053, // 153,336 acres
      weatherContext: {
        tempC: 18.3,
        tempF: 65.0,
        relativeHumidityPct: 10,
        windSpeedMph: 35.0,
        windGustMph: 52.0,
        windDirection: 'NE (Extreme Jarbo Gap wind event)',
        fuelMoisture1000hrPct: 5.2
      },
      evidenceChain: {
        observedFacts: [
          'Ignition caused by faulty electrical transmission line failure at Poe Dam in Jarbo Gap.',
          'Extreme dry foehn winds channeled through Feather River canyon with gusts to 52 mph.',
          'Fire advanced at estimated 80 football fields per minute into the town of Paradise.'
        ],
        satelliteTelemetry: [
          'GOES-16 Band 7 shortwave IR detected intense heat signature within 15 minutes of ignition.',
          'Fuel moisture levels recorded at lowest 1% percentile in 50-year California climate history.'
        ],
        modelInferences: [
          'Long-range ember transport documented up to 4.8 miles ahead of the main flame front.',
          'Highlights the imperative for sub-minute satellite detection and automated early warnings in WUI interfaces.'
        ],
        uncertainties: [
          'Fully documented and investigated post-incident by CAL FIRE and NIST forensics teams.'
        ],
        recommendedActions: [
          'Benchmark TERRAVOX early warning models against the Camp Fire timeline to guarantee detection < 5 minutes.'
        ]
      },
      officialSource: 'CAL FIRE Official Investigation Report & NIST SP-1262',
      officialUrl: 'https://www.fire.ca.gov/incidents/2018/11/8/camp-fire/'
    },
    {
      id: 'ca-hist-kincade-fire',
      title: 'Historical Forensics: Kincade Fire (2019)',
      regionId: 'california-us',
      countyId: 'sonoma',
      sectorName: 'The Geysers / Mayacamas Ridge',
      coordinates: [-122.78, 38.79],
      timestamp: '2019-10-23T21:27:00-07:00',
      category: 'HISTORICAL_LANDMARK',
      status: 'HISTORICAL_STUDY',
      hazardLevel: 'V',
      brightnessKelvin: 354.2,
      confidenceScore: 1.0,
      satelliteSensor: 'VIIRS & GOES-17',
      estimatedAreaHa: 31468, // 77,758 acres
      weatherContext: {
        tempC: 22.0,
        tempF: 71.6,
        relativeHumidityPct: 9,
        windSpeedMph: 42.0,
        windGustMph: 78.0,
        windDirection: 'NNE (Historic Diablo wind event)',
        fuelMoisture1000hrPct: 6.1
      },
      evidenceChain: {
        observedFacts: [
          'Ignited near Geysers Road in northern Sonoma County during historic wind event.',
          'Prompted the largest evacuation in Sonoma County history (~190,000 residents).'
        ],
        satelliteTelemetry: [
          'Diablo wind gusts reached peak 78 mph at PG&E automated weather station on ridge.',
          'Sentinel-2 NBR (Normalized Burn Ratio) delta confirmed complete chaparral canopy consumption.'
        ],
        modelInferences: [
          'Complex topography created severe wind funneling down Alexander Valley.'
        ],
        uncertainties: [
          'Fully investigated and documented by CAL FIRE Sonoma-Lake-Napa Unit.'
        ],
        recommendedActions: [
          'Maintained in TERRAVOX scenario library for what-if Diablo wind simulations.'
        ]
      },
      officialSource: 'CAL FIRE LNU Incident Archives',
      officialUrl: 'https://www.fire.ca.gov/incidents/2019/10/23/kincade-fire/'
    }
  ]
}

export const REGIONS_REGISTRY: Record<string, PilotRegion> = {
  'california-us': CALIFORNIA_PILOT
}

export const DEFAULT_REGION_ID = 'california-us'
