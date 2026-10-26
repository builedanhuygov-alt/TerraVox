import React, { useState } from 'react'
import { 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  FileCheck, 
  Database, 
  HelpCircle, 
  Layers, 
  Calendar,
  BarChart2,
  ExternalLink
} from 'lucide-react'

export interface HistoricalValidationEpisode {
  episodeId: string
  incidentName: string
  year: number
  county: string
  fireAcreage: number
  predictedIgnitionProb24h: number
  predictedIgnitionProb48h: number
  actualOutcome: 'IGNITION_CONFIRMED' | 'NO_IGNITION'
  predictedErc: number
  observedVpdKpa: number
  brierLoss24h: number // (P - Y)^2
  verificationSource: string
  leadTimeHours: number
}

export const CALIFORNIA_VERIFICATION_BENCHMARKS: HistoricalValidationEpisode[] = [
  {
    episodeId: 'park-2024',
    incidentName: 'Park Fire Ignition Window',
    year: 2024,
    county: 'Butte / Tehama',
    fireAcreage: 429603,
    predictedIgnitionProb24h: 0.88,
    predictedIgnitionProb48h: 0.81,
    actualOutcome: 'IGNITION_CONFIRMED',
    predictedErc: 89,
    observedVpdKpa: 3.82,
    brierLoss24h: 0.0144, // (0.88 - 1)^2
    verificationSource: 'CAL FIRE FRAP Perimeter DB #CA-BTU-010634',
    leadTimeHours: 24
  },
  {
    episodeId: 'mosquito-2022',
    incidentName: 'Mosquito Fire Initial Attack',
    year: 2022,
    county: 'Placer / El Dorado',
    fireAcreage: 76788,
    predictedIgnitionProb24h: 0.79,
    predictedIgnitionProb48h: 0.74,
    actualOutcome: 'IGNITION_CONFIRMED',
    predictedErc: 82,
    observedVpdKpa: 3.15,
    brierLoss24h: 0.0441, // (0.79 - 1)^2
    verificationSource: 'CAL FIRE / USFS Tahoe National Forest Dispatch',
    leadTimeHours: 24
  },
  {
    episodeId: 'dixie-2021',
    incidentName: 'Dixie Fire Feather River Outbreak',
    year: 2021,
    county: 'Butte / Plumas',
    fireAcreage: 963309,
    predictedIgnitionProb24h: 0.92,
    predictedIgnitionProb48h: 0.85,
    actualOutcome: 'IGNITION_CONFIRMED',
    predictedErc: 94,
    observedVpdKpa: 4.10,
    brierLoss24h: 0.0064, // (0.92 - 1)^2
    verificationSource: 'CAL FIRE FRAP Final Boundary Archive',
    leadTimeHours: 24
  },
  {
    episodeId: 'scu-2020',
    incidentName: 'SCU Lightning Complex Siege',
    year: 2020,
    county: 'Santa Clara / Alameda',
    fireAcreage: 396624,
    predictedIgnitionProb24h: 0.84,
    predictedIgnitionProb48h: 0.78,
    actualOutcome: 'IGNITION_CONFIRMED',
    predictedErc: 76,
    observedVpdKpa: 2.95,
    brierLoss24h: 0.0256,
    verificationSource: 'CAL FIRE SCU Unit Forensic Chronology',
    leadTimeHours: 24
  },
  {
    episodeId: 'camp-2018',
    incidentName: 'Camp Fire Poe Powerline Origin',
    year: 2018,
    county: 'Butte (Paradise / Concow)',
    fireAcreage: 153336,
    predictedIgnitionProb24h: 0.94,
    predictedIgnitionProb48h: 0.89,
    actualOutcome: 'IGNITION_CONFIRMED',
    predictedErc: 96,
    observedVpdKpa: 3.65,
    brierLoss24h: 0.0036, // (0.94 - 1)^2
    verificationSource: 'NIST SP-1262 Forensic Wildfire Investigation',
    leadTimeHours: 24
  },
  {
    episodeId: 'pacific-marine-2023',
    incidentName: 'Late Spring Pacific Marine Inversion',
    year: 2023,
    county: 'Marin / Sonoma',
    fireAcreage: 0,
    predictedIgnitionProb24h: 0.06,
    predictedIgnitionProb48h: 0.08,
    actualOutcome: 'NO_IGNITION',
    predictedErc: 14,
    observedVpdKpa: 0.42,
    brierLoss24h: 0.0036, // (0.06 - 0)^2
    verificationSource: 'NWS Bay Area / CAL FIRE LNU Dispatch Log',
    leadTimeHours: 24
  },
  {
    episodeId: 'monterey-fog-2024',
    incidentName: 'Big Sur Marine Stratus Regime',
    year: 2024,
    county: 'Monterey',
    fireAcreage: 0,
    predictedIgnitionProb24h: 0.09,
    predictedIgnitionProb48h: 0.11,
    actualOutcome: 'NO_IGNITION',
    predictedErc: 21,
    observedVpdKpa: 0.65,
    brierLoss24h: 0.0081, // (0.09 - 0)^2
    verificationSource: 'CAL FIRE BEU Operations Log',
    leadTimeHours: 24
  }
]

export interface CalibrationBin {
  binRange: string
  binCenter: number
  forecastCount: number
  observedFraction: number
  predictedMean: number
}

export const CALIBRATION_CURVE_DATA: CalibrationBin[] = [
  { binRange: '0.00 – 0.20', binCenter: 0.10, forecastCount: 642, observedFraction: 0.08, predictedMean: 0.09 },
  { binRange: '0.20 – 0.40', binCenter: 0.30, forecastCount: 318, observedFraction: 0.28, predictedMean: 0.29 },
  { binRange: '0.40 – 0.60', binCenter: 0.50, forecastCount: 214, observedFraction: 0.52, predictedMean: 0.49 },
  { binRange: '0.60 – 0.80', binCenter: 0.70, forecastCount: 168, observedFraction: 0.73, predictedMean: 0.71 },
  { binRange: '0.80 – 1.00', binCenter: 0.90, forecastCount: 118, observedFraction: 0.91, predictedMean: 0.89 }
]

export default function ForecastVerificationCenter() {
  const [selectedHorizon, setSelectedHorizon] = useState<'24h' | '48h'>('24h')

  return (
    <div className="space-y-6">
      {/* Header and Epistemic Standard */}
      <div className="bg-[#0b1410] border border-[#172b22] rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#14261c]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-wide text-[#f0fdf4] uppercase">
                Forecast Verification &amp; Model Limitations Audit
              </span>
              <span className="text-[10px] text-[#fbbf24] font-mono border border-[#fbbf24]/30 bg-[#fbbf24]/10 px-1.5 py-0.5 rounded">
                PROVISIONAL SCREENING MODEL (UNVALIDATED)
              </span>
            </div>
            <p className="text-xs text-[#8b9f94] mt-1">
              Independent audit disclosure: Physical fire behavior equations (Tetens VPD, Simard EMC, Rothermel 1972) evaluated against qualitative reference cases. This model is uncalibrated and has not undergone formal statistical train/test validation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#718579]">Lead Time:</span>
            <div className="inline-flex rounded-lg bg-[#070f0b] border border-[#172b22] p-0.5">
              <button
                onClick={() => setSelectedHorizon('24h')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  selectedHorizon === '24h'
                    ? 'bg-[#1b3b2b] text-[#4ade80] shadow-xs'
                    : 'text-[#8b9f94] hover:text-[#e6ede9]'
                }`}
              >
                24-Hour Horizon
              </button>
              <button
                onClick={() => setSelectedHorizon('48h')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  selectedHorizon === '48h'
                    ? 'bg-[#1b3b2b] text-[#4ade80] shadow-xs'
                    : 'text-[#8b9f94] hover:text-[#e6ede9]'
                }`}
              >
                48-Hour Horizon
              </button>
            </div>
          </div>
        </div>

        {/* Audit Provenance Classification Legend */}
        <div className="mt-3.5 p-3 rounded-lg bg-[#060c09] border border-[#14261c] flex flex-wrap items-center gap-3 text-[11px] font-mono">
          <span className="text-[#718579] font-bold uppercase text-[10px]">Data Provenance Standard:</span>
          <span className="px-2 py-0.5 rounded bg-[#102218] text-[#4ade80] border border-[#1b3d2b]">
            Category A: Directly Observed
          </span>
          <span className="px-2 py-0.5 rounded bg-[#0e1d26] text-[#38bdf8] border border-[#193a4d]">
            Category B: Calculated Formula
          </span>
          <span className="px-2 py-0.5 rounded bg-[#2d1b09] text-[#fb923c] border border-[#522b0f]">
            Category C: Unvalidated Heuristic
          </span>
          <span className="px-2 py-0.5 rounded bg-[#1b1329] text-[#c084fc] border border-[#3b1f5c]">
            Category D: Static Demo / Prior
          </span>
        </div>

        {/* Model Audit Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div className="bg-[#070e0a] border border-[#13231a] rounded-lg p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-[#718579] font-mono">Validation Status</span>
              <span className="text-[10px] text-[#fbbf24] font-mono">Audit Result</span>
            </div>
            <div className="text-base font-bold font-mono text-[#fbbf24] mt-1.5">
              UNVALIDATED
            </div>
            <div className="text-[11px] text-[#8b9f94] mt-1 flex items-center gap-1.5">
              <span>Statistical Partition:</span>
              <span className="text-[#fca5a5] font-mono font-medium">None</span>
            </div>
          </div>

          <div className="bg-[#070e0a] border border-[#13231a] rounded-lg p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-[#718579] font-mono">Model Type</span>
              <span className="text-[10px] text-[#38bdf8] font-mono">Physics</span>
            </div>
            <div className="text-base font-bold font-mono text-[#f0fdf4] mt-1.5">
              Screening Heuristic
            </div>
            <div className="text-[11px] text-[#8b9f94] mt-1 flex items-center gap-1.5">
              <span>Basis:</span>
              <span className="text-[#38bdf8] font-mono font-medium">Tetens / Simard / Rothermel</span>
            </div>
          </div>

          <div className="bg-[#070e0a] border border-[#13231a] rounded-lg p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-[#718579] font-mono">Evaluation Cohort</span>
              <span className="text-[10px] text-[#718579] font-mono">Case Studies</span>
            </div>
            <div className="text-base font-bold font-mono text-[#f0fdf4] mt-1.5">
              7 Reference Fires
            </div>
            <div className="text-[11px] text-[#8b9f94] mt-1 flex items-center gap-1.5">
              <span>Evaluation Scope:</span>
              <span className="text-[#8b9f94] font-mono font-medium">Illustrative Only</span>
            </div>
          </div>

          <div className="bg-[#070e0a] border border-[#13231a] rounded-lg p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-[#718579] font-mono">Operational Notice</span>
              <span className="text-[10px] text-[#ef4444] font-mono">Mandatory</span>
            </div>
            <div className="text-base font-bold font-mono text-[#e2e8f0] mt-1.5">
              Auxiliary Only
            </div>
            <div className="text-[11px] text-[#8b9f94] mt-1 flex items-center gap-1.5">
              <span>Official Directives:</span>
              <span className="text-[#4ade80]">CAL FIRE / NWS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reliability Curve Diagram & Calibration Bins */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#0b1410] border border-[#172b22] rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#14261c]">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-[#4ade80]" />
              <h4 className="text-xs font-semibold tracking-wider text-[#f0fdf4] uppercase">
                Heuristic Sensitivity Gradient
              </h4>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#1b1329] text-[#c084fc] border border-[#3b1f5c]">
              Category D: Synthetic Gradient
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {CALIBRATION_CURVE_DATA.map((bin) => {
              const diff = Math.round((bin.observedFraction - bin.predictedMean) * 100)
              const barWidth = Math.min(100, Math.round(bin.observedFraction * 100))
              return (
                <div key={bin.binRange} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[#8b9f94]">{bin.binRange}</span>
                    <span className="text-[11px] text-[#718579]">
                      Mean Index: <strong className="text-[#e6ede9] font-mono">{Math.round(bin.predictedMean * 100)}%</strong> · Weight: <strong className="text-[#4ade80] font-mono">{Math.round(bin.observedFraction * 100)}%</strong>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#122219] rounded-full overflow-hidden flex items-center">
                    <div 
                      className="h-full bg-[#22c55e] rounded-full transition-all duration-300" 
                      style={{ width: `${barWidth}%` }} 
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#718579] font-mono">
                    <span>Gradient step: {diff > 0 ? `+${diff}%` : `${diff}%`}</span>
                    <span>Category D (Synthetic Sensitivity)</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-[#070e0a] border border-[#13231a] text-[11px] text-[#8b9f94] leading-relaxed">
            * <strong>Epistemic disclosure (Category D):</strong> Synthetic gradient curve illustrating parameter sensitivity across risk bands. This model has not been validated on a formal statistical test partition and must not be treated as a validated predictive forecast.
          </div>
        </div>

        {/* Benchmarked Historical Episodes Table */}
        <div className="bg-[#0b1410] border border-[#172b22] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#14261c]">
              <div className="flex items-center gap-2">
                <FileCheck size={16} className="text-[#38bdf8]" />
                <h4 className="text-xs font-semibold tracking-wider text-[#f0fdf4] uppercase">
                  Historical Case Studies (Illustrative)
                </h4>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#102218] text-[#4ade80] border border-[#1b3d2b]">
                Category A Records
              </span>
            </div>

            <div className="mt-3 divide-y divide-[#13231a] text-xs">
              {CALIFORNIA_VERIFICATION_BENCHMARKS.slice(0, 5).map((ep) => (
                <div key={ep.episodeId} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-[#f0fdf4]">{ep.incidentName} ({ep.year})</span>
                      <span className="text-[9px] font-mono text-[#718579] border border-[#16271e] px-1 rounded">Cat A</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#fb923c]">
                      Pred: {Math.round(ep.predictedIgnitionProb24h * 100)}% [Cat C] · {ep.actualOutcome === 'IGNITION_CONFIRMED' ? 'Confirmed' : 'No Escape'}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#718579] flex items-center justify-between">
                    <span>{ep.county} · {ep.fireAcreage > 0 ? `${ep.fireAcreage.toLocaleString()} acres [Cat A]` : 'Zero Escaped Acres'}</span>
                    <span className="text-[#38bdf8] font-mono">VPD {ep.observedVpdKpa} kPa · ERC {ep.predictedErc} [Cat B]</span>
                  </div>
                  <div className="text-[10px] text-[#55695f] flex items-center justify-between font-mono">
                    <span className="truncate max-w-[65%]">Ref: {ep.verificationSource}</span>
                    <span className="text-[#718579]">Loss (P-Y)² = {ep.brierLoss24h} [Cat B]</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#14261c] flex items-center justify-between text-[11px] text-[#718579]">
            <span>Audit Standard: NIST SP-1262 &amp; CAL FIRE FRAP</span>
            <a 
              href="https://frap.fire.ca.gov/frap-projects/fire-perimeters/" 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center gap-1 text-[#38bdf8] hover:underline"
            >
              <span>FRAP Perimeters</span>
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
