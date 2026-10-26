import React from 'react'
import { 
  X, 
  History, 
  SplitSquareVertical, 
  Calendar, 
  Satellite, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  ArrowRight 
} from 'lucide-react'
import { CALIFORNIA_TIME_SLICES, TimeSliceSnapshot } from '../services/signalFusion'

interface EnvironmentalTimelineDrawerProps {
  isOpen: boolean
  onClose: () => void
  selectedSlice: TimeSliceSnapshot
  onSelectSlice: (slice: TimeSliceSnapshot) => void
  compareSlice: TimeSliceSnapshot | null
  onSelectCompareSlice: (slice: TimeSliceSnapshot | null) => void
  isCompareMode: boolean
  onToggleCompareMode: () => void
}

export default function EnvironmentalTimelineDrawer({
  isOpen,
  onClose,
  selectedSlice,
  onSelectSlice,
  compareSlice,
  onSelectCompareSlice,
  isCompareMode,
  onToggleCompareMode
}: EnvironmentalTimelineDrawerProps) {
  if (!isOpen) return null

  // Calculate comparison deltas if active
  const deltaNdvi = isCompareMode && compareSlice
    ? (selectedSlice.avgVegetationNdvi - compareSlice.avgVegetationNdvi).toFixed(2)
    : null

  const deltaDetections = isCompareMode && compareSlice
    ? selectedSlice.californiaActiveDetections - compareSlice.californiaActiveDetections
    : null

  return (
    <div 
      className="fixed bottom-0 inset-x-0 z-40 bg-[#08120e]/98 backdrop-blur-md border-t border-[#1b3326] shadow-2xl p-4 sm:p-5 animate-slideUp pointer-events-auto max-h-[70vh] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Environmental Timeline Exploration"
    >
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#14261c]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#142a1e] text-[#a3e635] flex items-center justify-center border border-[#1e4732]">
              <History size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#f0fdf4]">
                  California Environmental Timeline
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#132a1e] text-[#4ade80] border border-[#22573a]">
                  {selectedSlice.dateLabel}
                </span>
              </div>
              <p className="text-[11px] text-[#718579] font-mono">
                Satellite Imagery, Thermal Detections &amp; Drought Stress History
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dual Period Comparison Toggle */}
            <button
              onClick={onToggleCompareMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                isCompareMode
                  ? 'bg-[#1b3f2c] text-[#4ade80] border-[#22c55e]/50 shadow-xs'
                  : 'bg-[#0d1c15] text-[#718579] border-[#172e22] hover:text-white'
              }`}
            >
              <SplitSquareVertical size={13} />
              <span>{isCompareMode ? 'Compare: ON' : 'Dual-Period Compare'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#718579] hover:text-[#f0fdf4] hover:bg-[#12241b] transition-colors"
              aria-label="Close timeline drawer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Timeline Snapshots Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#718579]">
            <span>SELECT HISTORICAL OR CURRENT OBSERVATION PERIOD:</span>
            <span className="text-[#38bdf8]">Grounded in NASA &amp; CAL FIRE Archives</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {CALIFORNIA_TIME_SLICES.map(slice => {
              const isSelected = selectedSlice.id === slice.id
              const isCompare = compareSlice?.id === slice.id && isCompareMode
              const isCurrent = slice.id === '2026-current'

              return (
                <button
                  key={slice.id}
                  onClick={() => {
                    if (isCompareMode && isSelected) {
                      // Do not self-compare
                    } else if (isCompareMode) {
                      onSelectCompareSlice(slice)
                    } else {
                      onSelectSlice(slice)
                    }
                  }}
                  className={`p-3 rounded-xl text-left border transition-all relative ${
                    isSelected
                      ? 'bg-[#153423] border-[#22c55e] shadow-lg shadow-[#22c55e]/15 ring-1 ring-[#22c55e]'
                      : isCompare
                      ? 'bg-[#112330] border-[#38bdf8] shadow-md shadow-[#38bdf8]/10'
                      : 'bg-[#0c1813] border-[#16271e] hover:border-[#1f3a2b] hover:bg-[#0f1f18]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-mono font-bold ${
                      isSelected ? 'text-[#4ade80]' : isCompare ? 'text-[#38bdf8]' : 'text-[#f0fdf4]'
                    }`}>
                      {slice.dateLabel}
                    </span>
                    <span className={`text-[9px] font-mono px-1 rounded ${
                      isCurrent 
                        ? 'bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/30'
                        : 'bg-[#18261e] text-[#8b9f94]'
                    }`}>
                      {isCurrent ? 'LIVE NRT' : 'ARCHIVE'}
                    </span>
                  </div>

                  <div className="space-y-0.5 text-[11px] font-mono">
                    <div className="text-stone-300">
                      {slice.californiaActiveDetections > 0 ? (
                        <span>{slice.californiaActiveDetections} verified fires</span>
                      ) : (
                        <span className="text-[#8b9f94]">No active fire anomalies</span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#718579]">
                      NDVI {slice.avgVegetationNdvi} · {slice.droughtDesiccationPct}% Drought Stress
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Comparison Delta Bar (Visible when comparison mode is ON) */}
        {isCompareMode && compareSlice && (
          <div className="p-3 rounded-xl bg-[#0b1b14] border border-[#22c55e]/40 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-[#8b9f94]">Baseline Reference:</span>
              <span className="font-bold text-[#f0fdf4]">{selectedSlice.dateLabel}</span>
              <ArrowRight size={12} className="text-[#4ade80]" />
              <span className="font-bold text-[#38bdf8]">{compareSlice.dateLabel}</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[#8b9f94]">Δ Canopy NDVI:</span>
                <span className={`font-bold ${Number(deltaNdvi) < 0 ? 'text-[#ef4444]' : 'text-[#4ade80]'}`}>
                  {Number(deltaNdvi) > 0 ? `+${deltaNdvi}` : deltaNdvi}
                </span>
                <span className="text-[10px] text-[#718579]">
                  {Number(deltaNdvi) < 0 ? '(Desiccation)' : '(Moisture Gain)'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[#8b9f94]">Δ Fire Detections:</span>
                <span className={`font-bold ${deltaDetections && deltaDetections > 0 ? 'text-[#f97316]' : 'text-[#4ade80]'}`}>
                  {deltaDetections && deltaDetections > 0 ? `+${deltaDetections}` : deltaDetections}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Scientific Provenance & Honest Data Statements */}
        <div className="p-3 rounded-xl bg-[#091510] border border-[#162e21] text-[10px] text-[#718579] space-y-1.5 leading-relaxed">
          <div className="flex items-center justify-between font-mono text-[#8b9f94]">
            <span className="font-bold text-[#cbd5d1]">Observation Provenance:</span>
            <span>Sensor: {selectedSlice.sensorSource}</span>
          </div>
          <p>
            {selectedSlice.provenanceStatement}
          </p>
          <div className="pt-1 border-t border-[#14261c] flex items-center gap-1.5 text-[#eab308]">
            <AlertCircle size={12} className="shrink-0" />
            <span>
              <b>Cautionary Principle:</b> Historical satellite imagery tiles show surface reflectance and cloud conditions; they do not verify fire ignition without calibrated radiometric thermal anomalies.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
