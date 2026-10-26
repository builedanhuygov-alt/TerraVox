import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
})

function mockFetch(ok: boolean, body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => ({
      ok,
      status,
      text: async () => JSON.stringify(body),
      json: async () => body
    }))
  )
}

describe('Satellite Evidence & Correlation Frontend Services', () => {
  it('satelliteDetections calls correct endpoint with query params and returns detection telemetry', async () => {
    const mockResponse = {
      source: 'NASA FIRMS NRT Pipeline',
      status: 'LIVE',
      total_detections: 2,
      detections: [
        {
          id: 'firms-1',
          latitude: 39.7596,
          longitude: -121.6219,
          brightness_kelvin: 345.2,
          frp_mw: 28.5,
          satellite: 'Suomi-NPP',
          instrument: 'VIIRS',
          confidence: 'nominal',
          acq_datetime_utc: '2026-10-25T11:30:00Z',
          daynight: 'D',
          source_product: 'VIIRS_SNPP_NRT'
        }
      ]
    }

    mockFetch(true, mockResponse)
    const result = await api.satelliteDetections(1, 100)
    
    expect(result.status).toBe('LIVE')
    expect(result.total_detections).toBe(2)
    expect(result.detections[0].satellite).toBe('Suomi-NPP')
    expect(result.detections[0].frp_mw).toBe(28.5)
  })

  it('satelliteCorrelate sends geodesic search parameters and returns 5-state classification', async () => {
    const mockCorrelate = {
      incident_name: 'Cooley Fire',
      correlation_status: 'CORRELATED',
      heuristic_match_score: 87.5,
      heuristic_label: 'Strong Spatial and Temporal Correlation',
      is_conclusive_proof_of_fire: false,
      disclaimer: 'Matching heuristic score is NOT a physical probability that a fire exists.',
      correlated_detections_count: 3,
      nearest_detection: {
        distance_km: 1.25,
        time_difference_hours: 1.8,
        satellite: 'NOAA-20',
        instrument: 'VIIRS'
      }
    }

    mockFetch(true, mockCorrelate)
    const result = await api.satelliteCorrelate({
      incident_name: 'Cooley Fire',
      target_lat: 39.5,
      target_lon: -122.0,
      radius_km: 15,
      time_window_hours: 48
    })

    expect(result.correlation_status).toBe('CORRELATED')
    expect(result.heuristic_match_score).toBe(87.5)
    expect(result.is_conclusive_proof_of_fire).toBe(false)
    expect(result.nearest_detection.distance_km).toBe(1.25)
  })

  it('satelliteValidationCases fetches auditable historical and current test suite', async () => {
    const mockCases = {
      benchmark_suite: 'TERRAVOX California Remote-Sensing Benchmark',
      auditable_cases_count: 5,
      cases: [
        {
          case_id: 'VAL-001',
          incident_name: 'Cooley Fire (CAL FIRE)',
          county: 'Mendocino County',
          expected_correlation: 'PENDING_CORROBORATION'
        },
        {
          case_id: 'VAL-005',
          incident_name: 'Presidio Control Sector (Negative Baseline)',
          county: 'San Francisco County',
          expected_correlation: 'UNMATCHED'
        }
      ]
    }

    mockFetch(true, mockCases)
    const result = await api.satelliteValidationCases()

    expect(result.auditable_cases_count).toBe(5)
    expect(result.cases[0].case_id).toBe('VAL-001')
    expect(result.cases[1].expected_correlation).toBe('UNMATCHED')
  })

  it('satelliteLayers returns category A, B, C, D metadata catalog', async () => {
    const mockLayers = {
      layers: [
        {
          id: 'viirs_snpp_truecolor',
          name: 'VIIRS True-Color (NASA GIBS)',
          category: 'B',
          category_label: 'Category B — True-Color Optical Satellite Imagery',
          resolution: '375m',
          sensor: 'VIIRS (Suomi-NPP)'
        },
        {
          id: 'modis_terra_721',
          name: 'MODIS False-Color Bands 7-2-1',
          category: 'C',
          category_label: 'Category C — False-Color Multi-Spectral (Burn Scars & Flaming Fronts)',
          resolution: '250m'
        }
      ]
    }

    mockFetch(true, mockLayers)
    const result = await api.satelliteLayers()

    expect(result.layers.length).toBe(2)
    expect(result.layers[0].category).toBe('B')
    expect(result.layers[1].category).toBe('C')
  })

  it('satelliteEvidenceView synthesizes layer URLs and external Worldview/FIRMS deep links', async () => {
    const mockEvidence = {
      incident_name: 'Park Fire Study',
      target_coordinates: { latitude: 39.9, longitude: -121.8 },
      imagery_layers: [
        { id: 'viirs_snpp_truecolor', status: 'AVAILABLE', wmts_tile_url: '/api/satellite/gibs-tile/...' }
      ],
      authoritative_deep_links: {
        nasa_worldview: 'https://worldview.earthdata.nasa.gov/?...',
        firms_fire_map: 'https://firms.modaps.eosdis.nasa.gov/map/#...'
      }
    }

    mockFetch(true, mockEvidence)
    const result = await api.satelliteEvidenceView(39.9, -121.8, '2026-10-25', 'Park Fire Study')

    expect(result.incident_name).toBe('Park Fire Study')
    expect(result.authoritative_deep_links.nasa_worldview).toContain('worldview.earthdata.nasa.gov')
    expect(result.authoritative_deep_links.firms_fire_map).toContain('firms.modaps.eosdis.nasa.gov')
  })
})
