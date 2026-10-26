import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../services/api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('What-If Simulation Decision-Support Client', () => {
  it('calls backend /api/simulate/what-if and receives deterministic structured result', async () => {
    const mockSimulationPayload = {
      simulation_id: 'sim-test-99',
      scenario: 'Wildfire Sensitivity',
      status: 'COMPLETED',
      created_at: '2026-10-23T15:00:00Z',
      geographic_area: {
        county_id: 'butte',
        county_name: 'Butte County',
        agency_jurisdiction: 'CAL FIRE Butte Unit (BTU)',
        coordinates: [-121.60, 39.75]
      },
      baseline_inputs: {
        temperature_c: 28.0,
        relative_humidity_pct: 22.0,
        wind_speed_mph: 14.0,
        rain_7d_mm: 0.0,
        vpd_kpa: 2.94,
        fuel_moisture_100hr_pct: 6.2,
        road_closure_hours: 0.0,
        retrieved_at: '2026-10-23T15:00:00Z',
        source: 'Open-Meteo In-Situ Telemetry'
      },
      scenario_inputs: {
        temperature_c: 34.0,
        temperature_delta_c: 6.0,
        relative_humidity_pct: 12.0,
        wind_speed_mph: 26.0,
        wind_delta_mph: 12.0,
        rain_7d_mm: 0.0,
        rainfall_deficit_pct: 40.0,
        vpd_kpa: 4.70,
        fuel_moisture_100hr_pct: 3.9,
        brush_loss_ha: 350.0,
        road_closure_hours: 24.0,
        intervention: 'Pre-position team'
      },
      baseline_output: {
        danger_score: 63,
        risk_band: 'VERY_HIGH',
        color: '#f97316',
        advisory: 'Fires ignite readily and spread rapidly.',
        components: {
          fuel_dryness: 72.1,
          weather_stress: 56.4,
          wind_hazard: 33.6,
          precipitation_deficit: 80.0,
          infrastructure_impedance: 0.0
        }
      },
      scenario_output: {
        danger_score: 78,
        risk_band: 'VERY_HIGH',
        color: '#f97316',
        advisory: 'Critical wildfire behavior potential.',
        components: {
          fuel_dryness: 89.2,
          weather_stress: 86.6,
          wind_hazard: 62.4,
          precipitation_deficit: 80.0,
          infrastructure_impedance: 28.8
        }
      },
      output_differences: {
        danger_index_delta: 15,
        percentage_change: 23.8,
        primary_drivers: [
          'Severe atmospheric desiccation: VPD rose +1.76 kPa',
          'Accelerated fuel dry-down: 100-hr dead fuel moisture dropped -2.3%',
          'Foehn/canyon wind acceleration: sustained gusts +12.0 mph'
        ]
      },
      intervention_evaluation: {
        name: 'Pre-position team',
        intervention_id: 'PREPOSITION_CREWS',
        label: 'Tactical Pre-Positioning & Staging',
        raw_score: 78,
        mitigated_score: 66,
        danger_score_delta: -12,
        estimated_response_time_delta_minutes: -22,
        feasibility_assessment: 'REQUIRES_COMMAND_DIRECTIVE',
        operational_advisory: 'Pre-stage Type 3 wildland strike teams at forward ridge choke-points.',
        assumptions: 'Mutual aid activation standby.'
      },
      sectors_warranting_investigation: [
        {
          sector_id: 'butte-concow-basin',
          sector_name: 'Concow Basin & Pulga Pass',
          type: 'CANYON_PASS',
          fuel_type: 'Chaparral & Manzanita thicket',
          elevation_meters: 620,
          slope_degrees: 28,
          baseline_score: 79,
          scenario_score: 98,
          delta: 19,
          priority: 'CRITICAL',
          recommended_action: 'Deploy aerial thermal recon; inspect defensible space buffer.'
        }
      ],
      affected: {
        villages: 12,
        roads: 5,
        farms: 350,
        logistics: 'HIGH',
        routes: 7
      },
      model_metadata: {
        model_name: 'TERRAVOX California Wildland Environmental Sensitivity & Response Simulator',
        model_version: 'v2.2-california-pilot',
        formula_disclosure: 'S = clamp(0.30*F_fuel + 0.25*F_weather + 0.20*F_wind + 0.15*F_rain + 0.10*F_infra, 0, 100)',
        calibration_benchmark: 'CAL FIRE FRAP 2018-2024 Seasonal Validation Windows',
        assumptions: ['Assumes continuous brush/timber WUI fuel bed'],
        limitations_and_warnings: ['HYPOTHETICAL SENSITIVITY SIMULATION — NOT AN OPERATIONAL WEATHER FORECAST'],
        model_simulation: 'MODEL SIMULATION — NOT ACTUAL EVENT'
      },
      recommended_verification_steps: [
        'Check current CAL FIRE Incident Information (www.fire.ca.gov).'
      ]
    }

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        expect(url).toContain('/api/simulate/what-if')
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ simulation_id: 'sim-test-99', result: mockSimulationPayload }),
          json: async () => ({ simulation_id: 'sim-test-99', result: mockSimulationPayload })
        }
      })
    )

    const res = await api.simWhatIf(
      'Wildfire Sensitivity',
      { heat_c: 6.0, wind_delta_mph: 12.0 },
      { county: 'Butte County', baseline_temp_c: 28.0 }
    )

    expect(res.simulation_id).toBe('sim-test-99')
    expect(res.result.scenario_output.danger_score).toBe(78)
    expect(res.result.output_differences.danger_index_delta).toBe(15)
    expect(res.result.sectors_warranting_investigation[0].priority).toBe('CRITICAL')
    expect(res.result.model_metadata.model_version).toContain('v2.2')
  })

  it('fetches historical wildfire catalog with verified California incidents', async () => {
    const mockCatalog = [
      { id: 'camp-fire-2018', name: 'Camp Fire', year: 2018, county: 'Butte County', acres_burned: 153336, structures_destroyed: 18804, fatalities_confirmed: 85 },
      { id: 'dixie-fire-2021', name: 'Dixie Fire', year: 2021, county: 'Butte, Plumas, Lassen, Shasta, Tehama Counties', acres_burned: 963309, structures_destroyed: 1329, fatalities_confirmed: 1 }
    ]

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        expect(url).toContain('/api/historical-fires')
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify(mockCatalog),
          json: async () => mockCatalog
        }
      })
    )

    const fires = await api.historicalFires()
    expect(fires).toHaveLength(2)
    expect(fires[0].name).toBe('Camp Fire')
    expect(fires[0].acres_burned).toBe(153336)
    expect(fires[0].fatalities_confirmed).toBe(85)
  })

  it('fetches Camp Fire 2018 forensic detail with timeline snapshots and DINS damage records', async () => {
    const mockDetail = {
      id: 'camp-fire-2018',
      name: 'Camp Fire',
      year: 2018,
      county: 'Butte County',
      acres_burned: 153336,
      structures_destroyed: 18804,
      structures_damaged: 537,
      fatalities_confirmed: 85,
      official_cause: 'PG&E Caribou-Palermo 115 kV transmission line failure at Poe Dam (CPUC / CAL FIRE Investigation)',
      ignition_point: {
        name: 'Poe Dam (Feather River Canyon)',
        coordinates: [39.814, -121.437]
      },
      weather_observations: {
        temperature_f: 70.0,
        relative_humidity_pct: 8.0,
        sustained_wind_mph: 35.0,
        wind_gusts_mph: 52.0
      },
      timeline_snapshots: [
        { step_index: 0, label: 'Pre-Fire Desiccation', data_quality: 'OFFICIAL_RAWS' },
        { step_index: 1, label: 'Ignition at Poe Dam', data_quality: 'CAL_FIRE_INVESTIGATION' },
        { step_index: 5, label: 'Final Containment', data_quality: 'CAL_FIRE_FINAL_AUDIT' }
      ],
      official_sources: [
        { name: 'CAL FIRE Camp Fire Incident Report', url: 'https://www.fire.ca.gov/incidents/2018/11/8/camp-fire' },
        { name: 'NIST SP 1244 Investigation', url: 'https://www.nist.gov/publications/preliminary-reconnaissance-2018-camp-fire-paradise-california' }
      ]
    }

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        expect(url).toContain('/api/historical-fires/camp-fire-2018')
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify(mockDetail),
          json: async () => mockDetail
        }
      })
    )

    const detail = await api.historicalFireDetail('camp-fire-2018')
    expect(detail.name).toBe('Camp Fire')
    expect(detail.structures_destroyed).toBe(18804)
    expect(detail.official_cause).toContain('PG&E Caribou-Palermo')
    expect(detail.timeline_snapshots).toHaveLength(3)
    expect(detail.official_sources[1].name).toContain('NIST SP 1244')
  })

  it('compares two historical fires with normalized metrics and scientific transparency', async () => {
    const mockComparison = {
      fire_1: { id: 'camp-fire-2018', name: 'Camp Fire', acres_burned: 153336, structures_destroyed: 18804 },
      fire_2: { id: 'dixie-fire-2021', name: 'Dixie Fire', acres_burned: 963309, structures_destroyed: 1329 },
      comparative_deltas: {
        acreage_difference: -809973,
        structures_difference: 17475,
        duration_difference_days: -87
      },
      scientific_notes: 'Comparative normalization applies to verified CAL FIRE incident records.'
    }

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: any) => {
        expect(url).toContain('/api/historical-fires/compare')
        const body = JSON.parse(init.body)
        expect(body.fire_id_1).toBe('camp-fire-2018')
        expect(body.fire_id_2).toBe('dixie-fire-2021')
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify(mockComparison),
          json: async () => mockComparison
        }
      })
    )

    const res = await api.compareHistoricalFires('camp-fire-2018', 'dixie-fire-2021')
    expect(res.fire_1.name).toBe('Camp Fire')
    expect(res.comparative_deltas.structures_difference).toBe(17475)
    expect(res.scientific_notes).toContain('Comparative normalization')
  })

  it('searches California locations and retrieves multi-dataset readiness context', async () => {
    const mockSearchResults = {
      query: 'Paradise',
      count: 1,
      results: [
        {
          id: 'loc-paradise-butte',
          name: 'Paradise (Paradise Ridge)',
          county: 'Butte County',
          coordinates: [-121.6219, 39.7596],
          elevation_m: 542
        }
      ]
    }

    const mockContext = {
      coordinates: [-121.6219, 39.7596],
      analysis_radius_km: 15,
      weather_observations: {
        temperature_c: 28.0,
        temperature_f: 82.4,
        relative_humidity_pct: 18.0,
        wind_speed_mph: 22.0
      },
      data_readiness: {
        weather: { status: 'LIVE', provider: 'Open-Meteo' },
        elevation_terrain: { status: 'LIVE', provider: 'USGS SRTM 30m DEM' },
        fire_perimeters: { status: 'HISTORICAL_ARCHIVE', provider: 'CAL FIRE FRAP' }
      }
    }

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/api/twin/location/search')) {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify(mockSearchResults),
            json: async () => mockSearchResults
          }
        }
        if (url.includes('/api/twin/location/context')) {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify(mockContext),
            json: async () => mockContext
          }
        }
        return { ok: false, status: 404, text: async () => 'Not found' }
      })
    )

    const searchRes = await api.twinSearchLocations('Paradise')
    expect(searchRes.results).toHaveLength(1)
    expect(searchRes.results[0].name).toContain('Paradise')

    const ctxRes = await api.twinLocationContext(39.7596, -121.6219, 15)
    expect(ctxRes.data_readiness.weather.status).toBe('LIVE')
    expect(ctxRes.weather_observations.temperature_f).toBe(82.4)
  })

  it('validates GeoJSON import and computes bounding extent', async () => {
    const mockGeoJsonValidation = {
      status: 'VALIDATED',
      geometry_type: 'Polygon',
      vertex_count: 5,
      centroid: [-121.615, 39.76],
      estimated_extent: {
        bbox_area_hectares: 5335.2,
        bbox_area_acres: 13183.8
      }
    }

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        expect(url).toContain('/api/twin/location/import-geojson')
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify(mockGeoJsonValidation),
          json: async () => mockGeoJsonValidation
        }
      })
    )

    const payload = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-121.65, 39.72], [-121.58, 39.72], [-121.58, 39.80], [-121.65, 39.80], [-121.65, 39.72]]]
      }
    }

    const res = await api.twinImportGeoJson(payload)
    expect(res.status).toBe('VALIDATED')
    expect(res.estimated_extent.bbox_area_acres).toBe(13183.8)
  })

  it('executes multi-scenario simulation and compares isolated outputs', async () => {
    const mockMultiSim = {
      status: 'COMPLETED',
      county: 'Butte County',
      scenarios_count: 2,
      scenarios: [
        {
          id: 'baseline',
          name: 'Baseline In-Situ',
          danger_output: { danger_score: 60, risk_band: 'VERY_HIGH' },
          physical_parameters: { vapor_pressure_deficit_kpa: 2.5 }
        },
        {
          id: 'scenario_a',
          name: 'Offshore Wind Surge',
          danger_output: { danger_score: 76, risk_band: 'VERY_HIGH' },
          physical_parameters: { vapor_pressure_deficit_kpa: 3.8 },
          comparison_to_baseline: { score_delta: 16, percentage_change: 26.7 }
        }
      ],
      mandatory_legal_disclaimer: 'ILLUSTRATIVE SCENARIO — NOT A VALIDATED FIRE-SPREAD FORECAST.'
    }

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        expect(url).toContain('/api/twin/simulate/multi-scenario')
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify(mockMultiSim),
          json: async () => mockMultiSim
        }
      })
    )

    const payload = {
      county: 'Butte County',
      scenarios: [
        { id: 'baseline', name: 'Baseline In-Situ', temp_c: 28, rh_pct: 22, wind_mph: 14 },
        { id: 'scenario_a', name: 'Offshore Wind Surge', temp_c: 32, rh_pct: 10, wind_mph: 35 }
      ]
    }

    const res = await api.twinSimulateMultiScenario(payload)
    expect(res.scenarios).toHaveLength(2)
    expect(res.scenarios[0].danger_output.danger_score).toBe(60)
    expect(res.scenarios[1].comparison_to_baseline.score_delta).toBe(16)
    expect(res.mandatory_legal_disclaimer).toContain('ILLUSTRATIVE SCENARIO')
  })
})


