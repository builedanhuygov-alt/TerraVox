/**
 * TERRAVOX Community Experience — Public Environmental Observations & Ground Truth Network
 *
 * Public-facing community reporting and field validation:
 * - Anonymous public access without mandatory login
 * - Real backend persistence via /api/community/public-report and /api/community/public-reports
 * - Honest labeling: "Unverified Community Report (Pending Moderation)"
 * - Mobile-friendly hazard observation composer with optional coordinates
 * - Live crowd observations feed with category icons and timestamps
 * - Transparent data provenance and privacy notice
 */

import React, { useEffect, useState } from 'react'
import { 
  Users, 
  Send, 
  Camera, 
  MapPin, 
  Flame, 
  CloudFog, 
  Droplets, 
  Trees, 
  Zap, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Filter, 
  RefreshCw, 
  Info,
  Compass
} from 'lucide-react'
import { api } from '../services/api'
import { useGeographyStore } from '../store/useGeographyStore'
import EmptyState from '../components/EmptyState'

interface PublicReportItem {
  id: number
  category: string
  description: string
  location_name?: string
  latitude?: number
  longitude?: number
  status: string
  is_verified?: boolean
  verification_label?: string
  created_at: string
}

const REPORT_CATEGORIES = [
  { id: 'smoke', label: 'Smoke Plume', icon: CloudFog, color: 'text-amber-400', desc: 'Visible smoke or haze with no confirmed flame' },
  { id: 'suspected_fire', label: 'Suspected Fire', icon: Flame, color: 'text-orange-400', desc: 'Visible flame front, flare, or active ground burning' },
  { id: 'environmental_damage', label: 'Canopy Die-Off', icon: Trees, color: 'text-emerald-400', desc: 'Severe drought stress, beetle kill, or fallen timber' },
  { id: 'downed_infrastructure', label: 'Downed Line / Hazard', icon: Zap, color: 'text-yellow-400', desc: 'Power line arcing, road blockage, or grid damage' },
  { id: 'flooding', label: 'Flooding / Debris', icon: Droplets, color: 'text-sky-400', desc: 'Flash flooding, culvert clog, or slope mudslide' },
]

export default function Community() {
  const { activeRegion } = useGeographyStore()

  // Public Contributor state (Honest anonymous contributor, no fake ranger handles)
  const [contributorName, setContributorName] = useState(() => {
    try {
      return localStorage.getItem('terravox_contributor_name') || ''
    } catch {
      return ''
    }
  })

  // Reports feed state
  const [reports, setReports] = useState<PublicReportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Report composer state
  const [category, setCategory] = useState<string>('smoke')
  const [description, setDescription] = useState<string>('')
  const [locationName, setLocationName] = useState<string>('')
  const [lat, setLat] = useState<string>('')
  const [lon, setLon] = useState<string>('')
  const [contact, setContact] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  const fetchReports = async () => {
    setIsRefreshing(true)
    try {
      const res = await api.publicReports(50)
      if (Array.isArray(res)) {
        setReports(res)
      }
    } catch (err) {
      console.warn('[TERRAVOX] Error loading community reports:', err)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const handleContributorNameChange = (val: string) => {
    setContributorName(val)
    try {
      localStorage.setItem('terravox_contributor_name', val)
    } catch {}
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setSubmitError('Geolocation is not supported by your browser.')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(4))
        setLon(pos.coords.longitude.toFixed(4))
        if (!locationName) {
          setLocationName(`GPS ${pos.coords.latitude.toFixed(3)}°N, ${pos.coords.longitude.toFixed(3)}°W`)
        }
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        setSubmitError(`Could not retrieve GPS location (${err.message}). You can manually enter coordinates or location name.`)
      },
      { timeout: 10000, enableHighAccuracy: false }
    )
  }

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (description.trim().length < 8) {
      setSubmitError('Please provide a specific description of what you observed (at least 8 characters).')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)

    try {
      const parsedLat = lat ? parseFloat(lat) : undefined
      const parsedLon = lon ? parseFloat(lon) : undefined

      const res: any = await api.submitPublicReport({
        category,
        description: description.trim(),
        location_name: locationName.trim() || undefined,
        latitude: !isNaN(parsedLat as number) ? parsedLat : undefined,
        longitude: !isNaN(parsedLon as number) ? parsedLon : undefined,
        contact: contact.trim() || (contributorName.trim() ? contributorName.trim() : undefined)
      })

      setSubmitSuccess(`Report #${res.id} recorded successfully. It is flagged as "${res.verification_label || 'Unverified Community Report (Pending Moderation)'}" in the public environmental ledger.`)
      setDescription('')
      setLocationName('')
      setLat('')
      setLon('')

      // Reload list to immediately display the new submission
      fetchReports()
      window.dispatchEvent(new CustomEvent('terravox-report-submitted', { detail: res }))
    } catch (err: any) {
      setSubmitError(err?.message || 'Submission failed. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtered reports
  const displayedReports = reports.filter(r => {
    if (filterCategory === 'ALL') return true
    return r.category?.toLowerCase() === filterCategory.toLowerCase()
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#14261c]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#38bdf8] font-bold">
              Public Participatory Surveillance
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#f0fdf4] tracking-tight">
            Community Environmental Observations
          </h1>
          <p className="text-xs text-[#718579] mt-0.5">
            Public Hazard Reporting &amp; Field Ground-Truth Verification · {activeRegion.name}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchReports}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b1410] border border-[#14261c] hover:border-[#1e3e2d] text-xs font-mono text-[#cbd5d1] transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh community feed"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Public Access & Provenance Notice ───────────────────────── */}
      <div className="p-3.5 rounded-2xl bg-[#09120d] border border-[#14261c] flex items-start gap-3 text-xs text-[#8b9f94]">
        <Info size={16} className="text-[#38bdf8] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-[#f0fdf4]">
            Community Observation Standard
          </div>
          <p className="leading-relaxed text-[11px]">
            Community reports are anonymous and open to the public without requiring an agency login. All citizen sightings are transparently labeled as <span className="text-amber-300 font-semibold">Unverified Public Sighting (Pending Review)</span> until corroborated by satellite sensors, ALERTCalifornia cameras, or authorized CAL FIRE CAD logs.
          </p>
        </div>
      </div>

      {/* ── Main Two-Column Layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Mobile-Friendly Hazard Submission Form (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0b1410] border border-[#14261c] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#14261c]">
              <Send size={15} className="text-[#4ade80]" />
              <h2 className="text-sm font-bold text-[#f0fdf4]">Submit Field Observation</h2>
            </div>

            {submitSuccess && (
              <div className="p-3 rounded-xl bg-[#0a1a12] border border-[#1d4d33] text-xs text-[#4ade80] space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 size={14} /> Report Successfully Logged
                </div>
                <p className="text-[11px] text-[#8b9f94] leading-relaxed">
                  {submitSuccess}
                </p>
              </div>
            )}

            {submitError && (
              <div className="p-3 rounded-xl bg-[#1f100e] border border-[#4d1d1a] text-xs text-[#f87171] space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle size={14} /> Submission Notice
                </div>
                <p className="text-[11px] text-[#e2a8a4] leading-relaxed">
                  {submitError}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmitReport} className="space-y-3.5">
              {/* Category Selector */}
              <div>
                <label className="block text-[11px] font-mono text-[#8b9f94] mb-1.5 uppercase font-semibold">
                  Hazard Classification *
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {REPORT_CATEGORIES.map(cat => {
                    const Icon = cat.icon
                    const isSelected = category === cat.id
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#12281c] border-[#22c55e] text-[#f0fdf4] shadow-xs'
                            : 'bg-[#090f0c] border-[#14261c] text-[#cbd5d1] hover:border-[#1e3e2d]'
                        }`}
                      >
                        <Icon size={16} className={`shrink-0 mt-0.5 ${cat.color}`} />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold">{cat.label}</div>
                          <div className="text-[10px] text-[#718579] line-clamp-1">{cat.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-mono text-[#8b9f94] mb-1 uppercase font-semibold">
                  Observation Details *
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe smoke column, fire behavior, road hazards, or canopy condition..."
                  rows={3}
                  className="w-full bg-[#08120e] border border-[#172b22] focus:border-[#22c55e] rounded-xl p-2.5 text-xs text-[#e6ede9] placeholder-[#5b6f64] outline-none transition-colors resize-none"
                  required
                />
              </div>

              {/* Location Name & Quick GPS Trigger */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono text-[#8b9f94] uppercase font-semibold">
                    Location / Landmark
                  </label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={locating}
                    className="flex items-center gap-1 text-[10px] font-mono text-[#38bdf8] hover:text-[#7dd3fc] disabled:opacity-50 cursor-pointer"
                  >
                    <Compass size={11} className={locating ? 'animate-spin' : ''} />
                    {locating ? 'Acquiring GPS...' : 'Use Device GPS'}
                  </button>
                </div>
                <input
                  type="text"
                  value={locationName}
                  onChange={e => setLocationName(e.target.value)}
                  placeholder="e.g. Feather River Canyon, Highway 70 Mile 14"
                  className="w-full bg-[#08120e] border border-[#172b22] focus:border-[#22c55e] rounded-xl p-2 text-xs text-[#e6ede9] placeholder-[#5b6f64] outline-none transition-colors"
                />
              </div>

              {/* Optional Coordinates */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-[#5b6f64] mb-1">
                    Latitude (°N)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={e => setLat(e.target.value)}
                    placeholder="39.7890"
                    className="w-full bg-[#08120e] border border-[#172b22] focus:border-[#22c55e] rounded-xl p-2 text-xs font-mono text-[#e6ede9] placeholder-[#5b6f64] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-[#5b6f64] mb-1">
                    Longitude (°W)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lon}
                    onChange={e => setLon(e.target.value)}
                    placeholder="-121.5280"
                    className="w-full bg-[#08120e] border border-[#172b22] focus:border-[#22c55e] rounded-xl p-2 text-xs font-mono text-[#e6ede9] placeholder-[#5b6f64] outline-none"
                  />
                </div>
              </div>

              {/* Optional Contributor Alias or Contact */}
              <div>
                <label className="block text-[10px] font-mono text-[#5b6f64] mb-1">
                  Optional Public Alias or Contact
                </label>
                <input
                  type="text"
                  value={contributorName}
                  onChange={e => handleContributorNameChange(e.target.value)}
                  placeholder="Anonymous or community handle (optional)"
                  className="w-full bg-[#08120e] border border-[#172b22] focus:border-[#22c55e] rounded-xl p-2 text-xs text-[#e6ede9] placeholder-[#5b6f64] outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-[#070f0b] text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <Send size={13} />
                {isSubmitting ? 'Recording in Ledger...' : 'Publish Sighting'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Live Community Reports Stream (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#0b1410] border border-[#14261c] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-[#14261c]">
              <div className="flex items-center gap-2">
                <Users size={15} className="text-[#38bdf8]" />
                <h2 className="text-sm font-bold text-[#f0fdf4]">
                  Public Observation Feed
                </h2>
                <span className="text-[10px] font-mono text-[#5b6f64]">
                  ({displayedReports.length} reports)
                </span>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setFilterCategory('ALL')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                    filterCategory === 'ALL'
                      ? 'bg-[#153423] text-[#4ade80] font-bold border border-[#22573a]'
                      : 'text-[#718579] hover:text-[#cbd5d1]'
                  }`}
                >
                  ALL
                </button>
                {REPORT_CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setFilterCategory(c.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                      filterCategory === c.id
                        ? 'bg-[#153423] text-[#4ade80] font-bold border border-[#22573a]'
                        : 'text-[#718579] hover:text-[#cbd5d1]'
                    }`}
                  >
                    {c.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Reports List */}
            {loading ? (
              <div className="p-8 text-center text-xs text-[#718579]">
                Loading verified community records...
              </div>
            ) : displayedReports.length === 0 ? (
              <div className="py-6">
                <EmptyState
                  icon={<Users size={20} className="text-[#38bdf8]" />}
                  title="No Community Observations Yet"
                  description="Be the first community scout to record a sighting in this area. Field sightings help calibrate satellite radar feeds."
                  actionLabel="Clear Filter"
                  onAction={() => setFilterCategory('ALL')}
                  compact
                />
              </div>
            ) : (
              <div className="divide-y divide-[#14261c] mt-1">
                {displayedReports.map(rep => {
                  const catDef = REPORT_CATEGORIES.find(c => c.id === rep.category) || REPORT_CATEGORIES[0]
                  const Icon = catDef.icon

                  return (
                    <div key={rep.id} className="py-3.5 space-y-1.5 first:pt-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`p-1 rounded-md bg-[#0e1c15] border border-[#1b3829] ${catDef.color}`}>
                            <Icon size={13} />
                          </span>
                          <span className="text-xs font-bold text-[#f0fdf4]">
                            {catDef.label}
                          </span>
                          {rep.location_name && (
                            <span className="text-[11px] text-[#8b9f94] font-mono truncate">
                              · {rep.location_name}
                            </span>
                          )}
                        </div>

                        <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded border shrink-0 text-amber-300 bg-amber-950/40 border-amber-500/30">
                          {rep.verification_label || 'UNVERIFIED COMMUNITY REPORT'}
                        </span>
                      </div>

                      <p className="text-xs text-[#cbd5d1] leading-relaxed pl-7">
                        {rep.description}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] text-[#5b6f64] font-mono pl-7 pt-0.5 flex-wrap">
                        {rep.latitude !== undefined && rep.longitude !== undefined && (
                          <span className="flex items-center gap-1">
                            <MapPin size={10} /> {rep.latitude.toFixed(3)}°N, {rep.longitude.toFixed(3)}°W
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {new Date(rep.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[#38bdf8]">
                          Report #{rep.id}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
