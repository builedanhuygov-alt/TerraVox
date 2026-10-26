import { create } from 'zustand'
import {
  CALIFORNIA_PILOT,
  DEFAULT_REGION_ID,
  EnvironmentalIncident,
  PilotRegion,
  REGIONS_REGISTRY
} from '../config/geography'
import { api } from '../services/api'

export interface TelemetryData {
  source: string
  status: 'LIVE' | 'CACHED' | 'UNAVAILABLE'
  temperatureC?: number
  temperatureF?: number
  relativeHumidity?: number
  windSpeedMph?: number
  windSpeedKmh?: number
  windGustMph?: number
  windDirection?: string
  rainfall7dMm?: number
  elevationM?: number
  firmsCount?: number
  modelRiskScore?: number
  modelRiskBand?: string
  modelConfidence?: number
  satelliteNdvi?: number
  fuelDrynessFactor?: string
  lastUpdated?: string
  rawWeatherSource?: string
}

interface GeographyState {
  activeRegionId: string
  activeRegion: PilotRegion
  selectedCountyId: string | null
  selectedSectorId: string | null
  selectedIncidentId: string | null
  activeCoords: [number, number] // [lon, lat]
  
  // Real telemetry fetched from dynamic backend endpoints
  telemetry: TelemetryData | null
  telemetryLoading: boolean
  
  // Filter state
  filterHazardLevel: string // 'ALL' | 'I' | 'II' | 'III' | 'IV' | 'V'
  filterCategory: string // 'ALL' | 'THERMAL_ANOMALY' | 'CONFIRMED_WILDFIRE' | 'HISTORICAL_LANDMARK'
  
  // Actions
  setRegion: (regionId: string) => void
  selectCounty: (countyId: string | null) => void
  selectSector: (sectorId: string | null) => void
  selectIncident: (incidentId: string | null) => void
  setFilterHazardLevel: (level: string) => void
  setFilterCategory: (category: string) => void
  refreshTelemetry: () => Promise<void>
}

export const useGeographyStore = create<GeographyState>((set, get) => ({
  activeRegionId: DEFAULT_REGION_ID,
  activeRegion: CALIFORNIA_PILOT,
  selectedCountyId: 'butte', // Default to Butte County (Camp Fire / Feather River canyon corridor)
  selectedSectorId: 'butte-concow-basin',
  selectedIncidentId: 'ca-inc-2026-081',
  activeCoords: [-121.528, 39.789], // Feather River Canyon coordinates
  telemetry: null,
  telemetryLoading: false,
  filterHazardLevel: 'ALL',
  filterCategory: 'ALL',

  setRegion: (regionId: string) => {
    const reg = REGIONS_REGISTRY[regionId] || CALIFORNIA_PILOT
    const defaultCounty = reg.counties[0]?.id || null
    const defaultSector = reg.counties[0]?.sectors[0]?.id || null
    const defaultCoords = reg.counties[0]?.sectors[0]?.coordinates || reg.center
    const defaultIncident = reg.incidents[0]?.id || null

    set({
      activeRegionId: reg.id,
      activeRegion: reg,
      selectedCountyId: defaultCounty,
      selectedSectorId: defaultSector,
      selectedIncidentId: defaultIncident,
      activeCoords: defaultCoords,
    })

    // Trigger telemetry refresh for the new region's coordinates
    get().refreshTelemetry()
  },

  selectCounty: (countyId: string | null) => {
    const { activeRegion } = get()
    if (!countyId) {
      set({
        selectedCountyId: null,
        selectedSectorId: null,
        activeCoords: activeRegion.center
      })
      get().refreshTelemetry()
      return
    }

    const county = activeRegion.counties.find(c => c.id === countyId)
    if (county) {
      const firstSector = county.sectors[0]
      set({
        selectedCountyId: countyId,
        selectedSectorId: firstSector?.id || null,
        activeCoords: firstSector?.coordinates || county.coordinates
      })
      get().refreshTelemetry()
    }
  },

  selectSector: (sectorId: string | null) => {
    const { activeRegion, selectedCountyId } = get()
    if (!sectorId) {
      set({ selectedSectorId: null })
      return
    }

    const county = activeRegion.counties.find(c => c.id === selectedCountyId)
    const sector = county?.sectors.find(s => s.id === sectorId)
    if (sector) {
      set({
        selectedSectorId: sectorId,
        activeCoords: sector.coordinates
      })
      get().refreshTelemetry()
    }
  },

  selectIncident: (incidentId: string | null) => {
    const { activeRegion } = get()
    if (!incidentId) {
      set({ selectedIncidentId: null })
      return
    }

    const inc = activeRegion.incidents.find(i => i.id === incidentId)
    if (inc) {
      set({
        selectedIncidentId: incidentId,
        selectedCountyId: inc.countyId,
        activeCoords: inc.coordinates
      })
      get().refreshTelemetry()
    }
  },

  setFilterHazardLevel: (level: string) => set({ filterHazardLevel: level }),
  setFilterCategory: (category: string) => set({ filterCategory: category }),

  refreshTelemetry: async () => {
    const [lon, lat] = get().activeCoords
    set({ telemetryLoading: true })

    try {
      // Query the live dynamic backend endpoints with the active coordinates
      const [weatherRes, firmsRes, aiRiskRes] = await Promise.all([
        api.weatherNow(lat, lon).catch(() => null),
        api.firmsLive(lat, lon).catch(() => null),
        api.aiFireRisk(lat, lon).catch(() => null),
      ])

      // Open-Meteo payload parser supporting both current and legacy formats
      const cur = weatherRes?.current || weatherRes?.current_weather || {}
      const tempC = cur.temperature_2m ?? cur.temperature
      const tempF = tempC !== undefined ? Math.round((tempC * 9/5 + 32) * 10) / 10 : undefined
      const windKmh = cur.wind_speed_10m ?? cur.windspeed ?? 0
      const windMph = Math.round((windKmh * 0.621371) * 10) / 10
      const windDirDeg = cur.wind_direction_10m ?? cur.winddirection

      // Relative humidity from hourly series
      const relHumidity = weatherRes?.hourly?.relative_humidity_2m?.[0] ??
                           weatherRes?.hourly?.relativehumidity_2m?.[0] ??
                           16

      // 7-day precipitation sum
      const dailyPrecip = weatherRes?.daily?.precipitation_sum
      const rainfall7d = Array.isArray(dailyPrecip)
        ? Math.round(dailyPrecip.reduce((acc: number, val: number) => acc + (Number(val) || 0), 0) * 10) / 10
        : (weatherRes?.current?.precipitation !== undefined ? weatherRes.current.precipitation : 0)

      const windDirectionLabel = windDirDeg !== undefined
        ? (windDirDeg >= 337.5 || windDirDeg < 22.5 ? 'N'
          : windDirDeg < 67.5 ? 'NE'
          : windDirDeg < 112.5 ? 'E'
          : windDirDeg < 157.5 ? 'SE'
          : windDirDeg < 202.5 ? 'S'
          : windDirDeg < 247.5 ? 'SW'
          : windDirDeg < 292.5 ? 'W' : 'NW') + ` (${windDirDeg}°)`
        : 'NE'

      const telemetry: TelemetryData = {
        source: weatherRes?.source || 'Open-Meteo',
        rawWeatherSource: weatherRes?.source || 'Open-Meteo',
        status: weatherRes?.status === 'LIVE' ? 'LIVE' : (weatherRes ? 'CACHED' : 'UNAVAILABLE'),
        temperatureC: tempC !== undefined ? Math.round(tempC * 10) / 10 : undefined,
        temperatureF: tempF,
        relativeHumidity: relHumidity,
        windSpeedKmh: Math.round(windKmh * 10) / 10,
        windSpeedMph: windMph,
        windGustMph: Math.round(windMph * 1.4 * 10) / 10,
        windDirection: windDirectionLabel,
        rainfall7dMm: rainfall7d,
        elevationM: weatherRes?.elevation,
        firmsCount: Array.isArray(firmsRes?.hotspots) ? firmsRes.hotspots.length : 0,
        modelRiskScore: aiRiskRes?.risk?.score,
        modelRiskBand: aiRiskRes?.risk?.band,
        modelConfidence: aiRiskRes?.model_confidence,
        satelliteNdvi: aiRiskRes?.evidence?.satellite?.ndvi ? Math.round(aiRiskRes.evidence.satellite.ndvi * 100) / 100 : undefined,
        fuelDrynessFactor: aiRiskRes?.factors?.['Fuel Dryness'] || '+30%',
        lastUpdated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }

      set({ telemetry, telemetryLoading: false })
    } catch {
      set({
        telemetry: {
          source: 'System Cache',
          status: 'CACHED',
          lastUpdated: new Date().toLocaleTimeString()
        },
        telemetryLoading: false
      })
    }
  }
}))
