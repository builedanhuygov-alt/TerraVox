import React, { useState, useEffect } from 'react'
import { 
  X, 
  Send, 
  Flame, 
  CloudFog, 
  Droplets, 
  Trees, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  ShieldCheck, 
  Info 
} from 'lucide-react'
import { api } from '../services/api'
import { useGeographyStore } from '../store/useGeographyStore'

interface CommunityReportModalProps {
  isOpen: boolean
  onClose: () => void
  initialCoords?: [number, number]
  initialLocationName?: string
}

const CATEGORIES = [
  { id: 'smoke', label: 'Smoke Plume', icon: CloudFog, color: 'text-amber-400', desc: 'Visible smoke or haze with no confirmed flame' },
  { id: 'suspected_fire', label: 'Suspected Fire', icon: Flame, color: 'text-orange-500', desc: 'Visible flare, active flame, or glowing brush' },
  { id: 'flooding', label: 'Flooding / Debris', icon: Droplets, color: 'text-sky-400', desc: 'Road washout, flash flooding, or creek overflow' },
  { id: 'environmental_damage', label: 'Tree / Canopy Fall', icon: Trees, color: 'text-emerald-400', desc: 'Severe drought die-off, bark beetle damage, or fall' },
  { id: 'downed_infrastructure', label: 'Downed Line / Grid', icon: Zap, color: 'text-yellow-400', desc: 'Power line arcing, pole compromise, or road blockage' },
]

export default function CommunityReportModal({
  isOpen,
  onClose,
  initialCoords,
  initialLocationName
}: CommunityReportModalProps) {
  const { activeRegion } = useGeographyStore()
  const [category, setCategory] = useState<string>('smoke')
  const [description, setDescription] = useState<string>('')
  const [locationName, setLocationName] = useState<string>('')
  const [lat, setLat] = useState<string>('')
  const [lon, setLon] = useState<string>('')
  const [contact, setContact] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successReport, setSuccessReport] = useState<any | null>(null)

  useEffect(() => {
    if (initialCoords) {
      setLon(initialCoords[0].toFixed(4))
      setLat(initialCoords[1].toFixed(4))
    }
    if (initialLocationName) {
      setLocationName(initialLocationName)
    }
  }, [initialCoords, initialLocationName, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (description.trim().length < 5) {
      setError('Please provide a descriptive observation (at least 5 characters).')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const parsedLat = lat ? parseFloat(lat) : undefined
      const parsedLon = lon ? parseFloat(lon) : undefined

      const res = await api.submitPublicReport({
        category,
        description: description.trim(),
        location_name: locationName.trim() || undefined,
        latitude: !isNaN(parsedLat as number) ? parsedLat : undefined,
        longitude: !isNaN(parsedLon as number) ? parsedLon : undefined,
        contact: contact.trim() || undefined
      })

      setSuccessReport(res)
      // Broadcast event so any open map can reflect the new community report pin
      window.dispatchEvent(new CustomEvent('terravox-report-submitted', { detail: res }))
    } catch (err: any) {
      setError(err?.message || 'Submission failed. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setSuccessReport(null)
    setDescription('')
    setError(null)
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div 
        className="relative w-full max-w-xl bg-[#08120e] border border-[#1b3326] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-[#14261c] flex items-center justify-between bg-[#060c09]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#142a1e] text-[#4ade80] flex items-center justify-center border border-[#1e4732]">
              <Send size={15} />
            </div>
            <div>
              <h2 id="report-modal-title" className="text-sm font-bold text-[#f0fdf4]">
                Report Environmental Observation
              </h2>
              <p className="text-[10px] text-[#718579] font-mono">
                Open Community Reporting • No Account Required
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#718579] hover:text-[#f0fdf4] hover:bg-[#12241b] transition-colors"
            aria-label="Close report dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-[#cbd5d1]">
          {successReport ? (
            <div className="py-6 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-[#142b1e] text-[#4ade80] border border-[#22573a] flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#f0fdf4]">Observation Submitted</h3>
                <p className="text-xs text-[#8b9f94] max-w-sm mx-auto">
                  Your sighting has been recorded in the public ledger under tracking identifier{' '}
                  <span className="font-mono text-[#4ade80] font-bold">#{successReport.id}</span>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0c1813] border border-[#172e21] text-left max-w-sm mx-auto space-y-2 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#718579]">Verification Status:</span>
                  <span className="text-[#eab308] font-bold">PENDING REVIEW</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#718579]">Category:</span>
                  <span className="text-white uppercase">{successReport.category}</span>
                </div>
                {successReport.location_name && (
                  <div className="flex justify-between">
                    <span className="text-[#718579]">Location:</span>
                    <span className="text-[#4ade80] truncate max-w-[180px]">{successReport.location_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#718579]">Recorded:</span>
                  <span className="text-stone-300">{new Date(successReport.created_at).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0c1813]/60 border border-[#14261c] text-[10px] text-[#718579] max-w-sm mx-auto leading-relaxed">
                <span className="font-bold text-[#94a39b]">Scientific Trust Notice:</span> Community submissions remain labeled as unverified until corroborated by NASA FIRMS satellite thermal anomalies or certified CAL FIRE/county personnel.
              </div>

              <button
                onClick={handleReset}
                className="px-6 py-2 rounded-xl bg-[#163324] hover:bg-[#1f4934] border border-[#234f37] text-xs font-bold text-[#4ade80] transition-colors"
              >
                Close & Return to Map
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-[#8b9f94] uppercase tracking-wider block font-semibold">
                  1. Observation Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => {
                    const Icon = cat.icon
                    const isSelected = category === cat.id
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-2.5 rounded-xl text-left border transition-all flex flex-col gap-1.5 ${
                          isSelected
                            ? 'bg-[#153423] border-[#22c55e] shadow-md shadow-[#22c55e]/10'
                            : 'bg-[#0a1510] border-[#16271e] hover:border-[#1f3a2b] hover:bg-[#0c1a14]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon size={14} className={cat.color} />
                          <span className={`font-semibold text-xs ${isSelected ? 'text-[#f0fdf4]' : 'text-[#cbd5d1]'}`}>
                            {cat.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#718579] leading-tight">
                          {cat.desc}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Geographic Location */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-[#8b9f94] uppercase tracking-wider block font-semibold">
                  2. Location / Area
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0a1510] border border-[#16271e] focus-within:border-[#22c55e] transition-colors">
                    <MapPin size={14} className="text-[#4ade80] shrink-0" />
                    <input
                      type="text"
                      value={locationName}
                      onChange={e => setLocationName(e.target.value)}
                      placeholder="e.g. Feather River Canyon, Butte County / Near Highway 70"
                      className="bg-transparent border-none text-xs text-white placeholder-[#5b6f64] outline-none w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <input
                      type="text"
                      value={lat}
                      onChange={e => setLat(e.target.value)}
                      placeholder="Latitude (e.g. 39.7596)"
                      className="px-3 py-1.5 rounded-lg bg-[#0a1510] border border-[#16271e] text-xs text-white placeholder-[#5b6f64] outline-none focus:border-[#22c55e]"
                    />
                    <input
                      type="text"
                      value={lon}
                      onChange={e => setLon(e.target.value)}
                      placeholder="Longitude (e.g. -121.6219)"
                      className="px-3 py-1.5 rounded-lg bg-[#0a1510] border border-[#16271e] text-xs text-white placeholder-[#5b6f64] outline-none focus:border-[#22c55e]"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-[#8b9f94] uppercase tracking-wider block font-semibold">
                  3. Detailed Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe smoke column color, estimated distance, wind movement, flame presence, or hazards observed..."
                  className="w-full p-3 rounded-lg bg-[#0a1510] border border-[#16271e] text-xs text-white placeholder-[#5b6f64] outline-none focus:border-[#22c55e] transition-colors resize-none"
                  maxLength={1000}
                />
                <div className="flex justify-between text-[10px] text-[#5b6f64] font-mono">
                  <span>Minimum 5 characters</span>
                  <span>{description.length} / 1000</span>
                </div>
              </div>

              {/* Optional Reporter Identifier / Contact */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-[#8b9f94] uppercase tracking-wider block font-semibold">
                  4. Reporter Identifier (Optional &amp; Kept Private)
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  placeholder="Anonymous handle or email (never shown publicly)"
                  className="w-full px-3 py-2 rounded-lg bg-[#0a1510] border border-[#16271e] text-xs text-white placeholder-[#5b6f64] outline-none focus:border-[#22c55e]"
                />
                <p className="text-[10px] text-[#5b6f64] leading-relaxed">
                  Your identity and contact information are strictly sequestered and never displayed on public map views.
                </p>
              </div>

              {/* Trust Disclaimer */}
              <div className="p-2.5 rounded-xl bg-[#091510] border border-[#162e21] text-[10px] text-[#718579] flex items-start gap-2 leading-relaxed">
                <Info size={14} className="text-[#38bdf8] shrink-0 mt-0.5" />
                <span>
                  <b>Public Safeguard:</b> Submitted reports are immediately timestamped and marked as <b>UNVERIFIED</b>. For life-threatening emergencies, dial 911 or call CAL FIRE ECC directly.
                </span>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-[#1f1212] border border-[#ef4444]/40 text-xs text-[#ef4444] flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#14261c]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8b9f94] hover:text-white hover:bg-[#12241b] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#163324] hover:bg-[#1f4934] border border-[#234f37] text-xs font-bold text-[#4ade80] transition-colors disabled:opacity-50"
                >
                  <Send size={13} />
                  <span>{submitting ? 'Recording Report...' : 'Submit Report'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
