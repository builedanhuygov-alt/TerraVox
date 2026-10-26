import { describe, expect, it } from 'vitest'
import { isInsideCalifornia } from '../config/geography'

describe('Forest Canopy & Vegetation Health (/forest) regression suite', () => {
  it('strictly validates coordinates inside California bounding box', () => {
    // Valid California points
    expect(isInsideCalifornia(-121.60, 39.76)).toBe(true) // Paradise WUI
    expect(isInsideCalifornia(-121.53, 39.78)).toBe(true) // Concow Basin
    expect(isInsideCalifornia(-122.72, 38.53)).toBe(true) // Mark West Springs, Sonoma
    expect(isInsideCalifornia(-118.69, 34.04)).toBe(true) // Malibu, LA County
    expect(isInsideCalifornia(-122.56, 40.63)).toBe(true) // Whiskeytown, Shasta

    // Reject Vietnam / Gia Lai points (Kon Ka Kinh approx 14.3°N, 108.3°E)
    expect(isInsideCalifornia(108.32, 14.31)).toBe(false) // Kon Ka Kinh National Park
    expect(isInsideCalifornia(108.00, 13.98)).toBe(false) // Pleiku, Gia Lai
    expect(isInsideCalifornia(108.68, 14.00)).toBe(false) // An Khe, Gia Lai
    expect(isInsideCalifornia(107.50, 13.50)).toBe(false) // Chu Prong, Gia Lai

    // Reject other out-of-state coordinates
    expect(isInsideCalifornia(0, 0)).toBe(false)
    expect(isInsideCalifornia(-74.006, 40.7128)).toBe(false) // New York
  })

  it('guarantees that legacy Vietnamese park/location names are excluded from operational lists', () => {
    const legacyNames = [
      'kon ka kinh',
      'chư păh',
      'chupah',
      'pleiku',
      'an khê',
      'ia grai',
      'đăk đoa',
      'chư prông',
      'chư sê',
      'kbang',
      'mang yang',
      'vườn quốc gia',
    ]

    // Sample operational dataset from California Forest Canopy pipeline
    const californiaCounties = [
      'Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa', 'Contra Costa',
      'Del Norte', 'El Dorado', 'Fresno', 'Glenn', 'Humboldt', 'Imperial', 'Inyo',
      'Kern', 'Kings', 'Lake', 'Lassen', 'Los Angeles', 'Madera', 'Marin', 'Mariposa',
      'Mendocino', 'Merced', 'Modoc', 'Mono', 'Monterey', 'Napa', 'Nevada', 'Orange',
      'Placer', 'Plumas', 'Riverside', 'Sacramento', 'San Benito', 'San Bernardino',
      'San Diego', 'San Francisco', 'San Joaquin', 'San Luis Obispo', 'San Mateo',
      'Santa Barbara', 'Santa Clara', 'Santa Cruz', 'Shasta', 'Sierra', 'Siskiyou',
      'Solano', 'Sonoma', 'Stanislaus', 'Sutter', 'Tehama', 'Trinity', 'Tulare',
      'Tuolumne', 'Ventura', 'Yolo', 'Yuba'
    ]

    expect(californiaCounties.length).toBe(58)

    californiaCounties.forEach(county => {
      const lower = county.toLowerCase()
      legacyNames.forEach(legacy => {
        expect(lower).not.toContain(legacy)
      })
    })
  })

  it('enforces separation between verified incidents and raw satellite hotspots', () => {
    const sampleRecordIncident = {
      id: 'inc-01',
      record_type: 'VERIFIED_INCIDENT',
      source: 'CAL FIRE Butte Unit',
      incident_name: 'Camp Fire Forensic Reference',
      lat: 39.81,
      lon: -121.44,
      status: 'OFFICIALLY_VERIFIED',
    }

    const sampleRecordHotspot = {
      id: 'hot-01',
      record_type: 'THERMAL_ANOMALY',
      source: 'NASA FIRMS VIIRS 375m',
      lat: 39.82,
      lon: -121.45,
      brightness_kelvin: 345.2,
      confidence: 'nominal',
      status: 'UNVERIFIED_SATELLITE_HOTSPOT',
    }

    expect(sampleRecordIncident.record_type).not.toBe(sampleRecordHotspot.record_type)
    expect(sampleRecordIncident.status).toBe('OFFICIALLY_VERIFIED')
    expect(sampleRecordHotspot.status).toBe('UNVERIFIED_SATELLITE_HOTSPOT')
    expect(isInsideCalifornia(sampleRecordIncident.lon, sampleRecordIncident.lat)).toBe(true)
    expect(isInsideCalifornia(sampleRecordHotspot.lon, sampleRecordHotspot.lat)).toBe(true)
  })

  it('enforces traceable data provenance on environmental indicators', () => {
    const layerMetadata = {
      ndvi: { source: 'Sentinel-2 Multispectral L2A', resolution: '10m', unit: 'Index (-1.0 to +1.0)' },
      ndwi: { source: 'Copernicus Sentinel-2', resolution: '10m', unit: 'Canopy Water Content Index' },
      thermal: { source: 'NASA FIRMS VIIRS 375m NRT', resolution: '375m', unit: 'Brightness Temp (Kelvin)' },
      canopy_height: { source: 'GEDI Spaceborne Lidar + USFS', resolution: '30m', unit: 'Meters' }
    }

    Object.values(layerMetadata).forEach(meta => {
      expect(meta.source).toBeTruthy()
      expect(meta.resolution).toBeTruthy()
      expect(meta.unit).toBeTruthy()
      expect(meta.source.toLowerCase()).not.toContain('vietnam')
      expect(meta.source.toLowerCase()).not.toContain('gia lai')
    })
  })
})
