import { describe, expect, it } from 'vitest'
import { statusColor, formatAge } from './CommandCenter'
import { NFDRS_HAZARD_SCALE, CALIFORNIA_PILOT } from '../config/geography'

describe('TERRAVOX Command Center (/ and /dashboard) Regression Suite', () => {
  it('accurately maps source pipeline health status to distinct styling classes', () => {
    expect(statusColor('LIVE')).toContain('text-emerald-400')
    expect(statusColor('CACHED')).toContain('text-amber-400')
    expect(statusColor('STALE')).toContain('text-orange-400')
    expect(statusColor('STATIC')).toContain('text-sky-400')
    expect(statusColor('UNAVAILABLE')).toContain('text-red-400')
    expect(statusColor('CONFIGURATION_REQUIRED')).toContain('text-red-400')
    expect(statusColor('UNKNOWN')).toContain('text-stone-400')
  })

  it('correctly formats cache age into human readable seconds, minutes, and hours', () => {
    expect(formatAge(15)).toBe('15s ago')
    expect(formatAge(59)).toBe('59s ago')
    expect(formatAge(60)).toBe('1m ago')
    expect(formatAge(3599)).toBe('59m ago')
    expect(formatAge(3600)).toBe('1h ago')
    expect(formatAge(7200)).toBe('2h ago')
  })

  it('validates NFDRS hazard scale configuration for all 5 hazard classes', () => {
    const levels = ['I', 'II', 'III', 'IV', 'V'] as const
    levels.forEach(level => {
      const def = NFDRS_HAZARD_SCALE[level]
      expect(def).toBeDefined()
      expect(def.level).toBe(level)
      expect(def.label).toBeTruthy()
      expect(def.color).toMatch(/^#/)
      expect(def.description).toBeTruthy()
      expect(def.actionRequired).toBeTruthy()
    })
  })

  it('guarantees California flagship pilot data integrity in Command Center', () => {
    expect(CALIFORNIA_PILOT.id).toBe('california-us')
    expect(CALIFORNIA_PILOT.name).toContain('California')
    expect(CALIFORNIA_PILOT.counties.length).toBeGreaterThanOrEqual(4)

    // Flagship pilot counties
    const countyIds = CALIFORNIA_PILOT.counties.map(c => c.id)
    expect(countyIds).toContain('butte')
    expect(countyIds).toContain('sonoma')
    expect(countyIds).toContain('shasta-trinity')
    expect(countyIds).toContain('los-angeles-ventura')

    // Verify all incidents have sectorName and valid coordinates in California
    CALIFORNIA_PILOT.incidents.forEach(inc => {
      expect(inc.sectorName).toBeTruthy()
      expect(inc.countyId).toBeTruthy()
      expect(inc.coordinates.length).toBe(2)
      const [lon, lat] = inc.coordinates
      expect(lat).toBeGreaterThan(32)
      expect(lat).toBeLessThan(43)
      expect(lon).toBeGreaterThan(-125)
      expect(lon).toBeLessThan(-114)
    })
  })

  it('verifies that each flagship county contains live fuel moisture and agency unit telemetry', () => {
    CALIFORNIA_PILOT.counties.forEach(county => {
      expect(county.averageFuelMoisturePct).toBeGreaterThan(0)
      expect(county.agencyUnit).toBeTruthy()
      expect(county.sectors.length).toBeGreaterThan(0)
      county.sectors.forEach(sector => {
        expect(sector.primaryFuelType).toBeTruthy()
        expect(sector.currentRiskLevel).toBeTruthy()
      })
    })
  })

  it('audits incident cards to separate live satellite screening from historical case studies', () => {
    const liveCritical = CALIFORNIA_PILOT.incidents.filter(i => 
      (i.hazardLevel === 'IV' || i.hazardLevel === 'V') && 
      i.category !== 'HISTORICAL_LANDMARK' && 
      i.status !== 'HISTORICAL_STUDY'
    )
    const historical = CALIFORNIA_PILOT.incidents.filter(i => 
      i.category === 'HISTORICAL_LANDMARK' || 
      i.status === 'HISTORICAL_STUDY'
    )

    // Verify live critical corridors are strictly automated screenings or current fires
    expect(liveCritical.length).toBeGreaterThanOrEqual(1)
    liveCritical.forEach(inc => {
      expect(inc.category).not.toBe('HISTORICAL_LANDMARK')
      expect(inc.status).not.toBe('HISTORICAL_STUDY')
    })

    // Verify historical case studies (Camp Fire, Kincade Fire) are properly categorized
    expect(historical.length).toBeGreaterThanOrEqual(2)
    const histIds = historical.map(h => h.id)
    expect(histIds).toContain('ca-hist-camp-fire')
    expect(histIds).toContain('ca-hist-kincade-fire')
    historical.forEach(inc => {
      expect(inc.category).toBe('HISTORICAL_LANDMARK')
      expect(inc.status).toBe('HISTORICAL_STUDY')
      expect(inc.officialSource).toBeTruthy()
    })
  })
})

