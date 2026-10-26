import { describe, expect, it } from 'vitest'
import {
  CALIFORNIA_PILOT,
  DEFAULT_REGION_ID,
  NFDRS_HAZARD_SCALE,
  REGIONS_REGISTRY
} from './geography'

describe('geography configuration', () => {
  it('has California as the default operational geography', () => {
    expect(DEFAULT_REGION_ID).toBe('california-us')
    expect(REGIONS_REGISTRY['california-us']).toBeDefined()
    expect(REGIONS_REGISTRY[DEFAULT_REGION_ID].name).toContain('California')
    expect(REGIONS_REGISTRY[DEFAULT_REGION_ID].country).toBe('United States')
  })

  it('bounds and center fall squarely within California WGS-84 envelope', () => {
    const region = CALIFORNIA_PILOT
    const [centerLon, centerLat] = region.center

    // California latitude spans approx 32.5°N to 42.0°N
    // California longitude spans approx -124.5°W to -114.1°W
    expect(centerLat).toBeGreaterThan(32.5)
    expect(centerLat).toBeLessThan(42.0)
    expect(centerLon).toBeGreaterThan(-125.0)
    expect(centerLon).toBeLessThan(-114.0)

    const [[swLon, swLat], [neLon, neLat]] = region.bounds
    expect(swLat).toBeGreaterThanOrEqual(32.0)
    expect(neLat).toBeLessThanOrEqual(42.5)
    expect(swLon).toBeGreaterThanOrEqual(-125.0)
    expect(neLon).toBeLessThanOrEqual(-114.0)
  })

  it('all monitored counties and sectors have valid California coordinates and CAL FIRE units', () => {
    const region = CALIFORNIA_PILOT
    expect(region.counties.length).toBeGreaterThan(0)

    for (const county of region.counties) {
      expect(county.state).toBe('CA')
      expect(county.coordinates[1]).toBeGreaterThan(32.5)
      expect(county.coordinates[1]).toBeLessThan(42.0)
      expect(county.coordinates[0]).toBeGreaterThan(-125.0)
      expect(county.coordinates[0]).toBeLessThan(-114.0)
      expect(county.agencyUnit).toContain('CAL FIRE')

      for (const sector of county.sectors) {
        expect(sector.coordinates[1]).toBeGreaterThan(32.5)
        expect(sector.coordinates[1]).toBeLessThan(42.0)
        expect(sector.coordinates[0]).toBeGreaterThan(-125.0)
        expect(sector.coordinates[0]).toBeLessThan(-114.0)
      }
    }
  })

  it('contains zero legacy Gia Lai or Vietnam entries in active REGIONS_REGISTRY', () => {
    const registryKeys = Object.keys(REGIONS_REGISTRY)
    expect(registryKeys).not.toContain('gia-lai')
    expect(registryKeys).not.toContain('vietnam')

    for (const reg of Object.values(REGIONS_REGISTRY)) {
      expect(reg.name.toLowerCase()).not.toContain('gia lai')
      expect(reg.country.toLowerCase()).not.toContain('vietnam')
    }
  })

  it('defines the standard 5-tier NFDRS Hazard Scale (I to V)', () => {
    expect(Object.keys(NFDRS_HAZARD_SCALE)).toEqual(['I', 'II', 'III', 'IV', 'V'])
    expect(NFDRS_HAZARD_SCALE.I.label).toBe('Low')
    expect(NFDRS_HAZARD_SCALE.V.label).toContain('Extreme')
  })
})
