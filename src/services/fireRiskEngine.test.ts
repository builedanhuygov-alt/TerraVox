import { describe, expect, it } from 'vitest'
import {
  calculateSaturationVaporPressure,
  calculateActualVaporPressure,
  calculateVaporPressureDeficit,
  calculateDeadFuelMoisture100hr,
  predictFireOccurrenceProbability,
  calculateFireDangerRating,
  calculatePhysicalSpreadPotential,
  characterizeSatelliteHotspot,
  OccurrencePredictionInput
} from './fireRiskEngine'

describe('fireRiskEngine - Physical & Meteorological Utilities', () => {
  it('calculates saturation vapor pressure via Tetens formula', () => {
    // At 20°C, saturation vapor pressure is ~2.34 kPa
    const es20 = calculateSaturationVaporPressure(20)
    expect(es20).toBeGreaterThan(2.3)
    expect(es20).toBeLessThan(2.4)

    // At 0°C, es is ~0.61 kPa
    const es0 = calculateSaturationVaporPressure(0)
    expect(es0).toBeCloseTo(0.61, 2)
  })

  it('calculates VPD accurately and clamps non-negative values', () => {
    // 35°C and 10% RH -> Extreme VPD > 4 kPa
    const vpdExtreme = calculateVaporPressureDeficit(35, 10)
    expect(vpdExtreme).toBeGreaterThan(4.0)

    // 15°C and 100% RH -> VPD is 0 kPa
    const vpdZero = calculateVaporPressureDeficit(15, 100)
    expect(vpdZero).toBe(0)
  })

  it('calculates dead fuel moisture (m100) with rainfall lag persistence', () => {
    // Very dry: 38°C, 8% RH, 0mm rain -> m100 should be very low (~3-5%)
    const mDry = calculateDeadFuelMoisture100hr(38, 8, 0)
    expect(mDry).toBeGreaterThanOrEqual(3.0)
    expect(mDry).toBeLessThan(8.0)

    // Humid with antecedent rain: 15°C, 85% RH, 30mm rain
    const mWet = calculateDeadFuelMoisture100hr(15, 85, 30)
    expect(mWet).toBeGreaterThan(15.0)
  })
})

describe('fireRiskEngine - Occurrence Probability Engine (Task A)', () => {
  const baseInput: OccurrencePredictionInput = {
    countyId: 'butte',
    countyName: 'Butte',
    horizonHours: 24,
    tempC: 34,
    relativeHumidityPct: 12,
    windSpeedMph: 18,
    rain7dMm: 0,
    historicalBaselineIgnitionRatePerDay: 0.45
  }

  it('predicts calibrated fire occurrence probability within [0, 1] bounds', () => {
    const res = predictFireOccurrenceProbability(baseInput)
    expect(res.probability).toBeGreaterThan(0.0)
    expect(res.probability).toBeLessThan(1.0)
    expect(res.confidenceInterval90[0]).toBeLessThanOrEqual(res.probability)
    expect(res.confidenceInterval90[1]).toBeGreaterThanOrEqual(res.probability)
  })

  it('increases probability and uncertainty as horizon expands from 24h to 72h', () => {
    const res24 = predictFireOccurrenceProbability({ ...baseInput, horizonHours: 24 })
    const res72 = predictFireOccurrenceProbability({ ...baseInput, horizonHours: 72 })

    expect(res72.probability).toBeGreaterThanOrEqual(res24.probability)
    expect(res72.epistemicUncertainty).toBeGreaterThan(res24.epistemicUncertainty)
  })

  it('assigns EXTREME risk band to critical Diablo / foehn wind weather profile', () => {
    const extremeInput: OccurrencePredictionInput = {
      countyId: 'butte',
      countyName: 'Butte',
      horizonHours: 24,
      tempC: 38,
      relativeHumidityPct: 7,
      windSpeedMph: 35,
      rain7dMm: 0,
      historicalBaselineIgnitionRatePerDay: 0.65
    }
    const res = predictFireOccurrenceProbability(extremeInput)
    expect(res.riskBand).toBe('EXTREME')
    expect(res.probability).toBeGreaterThanOrEqual(0.70)
  })

  it('assigns LOW or VERY_LOW risk band to cold, moist winter conditions', () => {
    const benignInput: OccurrencePredictionInput = {
      countyId: 'butte',
      countyName: 'Butte',
      horizonHours: 24,
      tempC: 10,
      relativeHumidityPct: 90,
      windSpeedMph: 4,
      rain7dMm: 45,
      historicalBaselineIgnitionRatePerDay: 0.1
    }
    const res = predictFireOccurrenceProbability(benignInput)
    expect(['LOW', 'VERY_LOW']).toContain(res.riskBand)
    expect(res.probability).toBeLessThan(0.20)
  })

  it('discloses model specification, calibration method, and mathematical formula', () => {
    const res = predictFireOccurrenceProbability(baseInput)
    expect(res.modelSpecification.algorithm).toContain('Logistic')
    expect(res.modelSpecification.calibrationMethod).toContain('CAL FIRE')
    expect(res.modelSpecification.formulaDisclosure).toContain('logit(P)')
  })
})

describe('fireRiskEngine - NFDRS Fire Danger & Rothermel Spread Engine (Tasks B & D)', () => {
  it('calculates NFDRS fire danger rating and assign appropriate class', () => {
    // Severe dry conditions
    const dangerHot = calculateFireDangerRating(36, 11, 22, 0, 0.15)
    expect(dangerHot.dangerScore).toBeGreaterThan(70)
    expect(['VERY_HIGH', 'EXTREME']).toContain(dangerHot.nfdrsClass)
    expect(dangerHot.energyReleaseComponentERC).toBeGreaterThan(50)

    // Mild wet conditions
    const dangerCold = calculateFireDangerRating(12, 85, 5, 25, 0.55)
    expect(dangerCold.dangerScore).toBeLessThan(40)
    expect(['LOW', 'MODERATE']).toContain(dangerCold.nfdrsClass)
  })

  it('calculates Rothermel forward rate of spread and Byram fireline intensity', () => {
    const spread = calculatePhysicalSpreadPotential(20, 14, 20, 7.5, 'CHAMISE_SHRUB')
    expect(spread.rateOfSpreadChainsHr).toBeGreaterThan(0)
    expect(spread.rateOfSpreadMph).toBeGreaterThan(0)
    expect(spread.firelineIntensityBtuFtS).toBeGreaterThan(0)
    expect(spread.flameLengthFt).toBeGreaterThan(0)
    expect(spread.spottingDistanceMiles).toBeGreaterThan(0)
    expect(spread.formulasUsed.length).toBeGreaterThan(0)
  })

  it('characterizes satellite detection and attaches required validation disclaimer', () => {
    const sat = characterizeSatelliteHotspot('viirs-test-1', 345.2, 28.5, '2026-10-23T18:00:00Z')
    expect(sat.satelliteSensor).toBe('VIIRS_NOAA20')
    expect(sat.detectionConfidence).toBe('HIGH')
    expect(sat.disclaimer).toContain('CAL FIRE')
  })
})
