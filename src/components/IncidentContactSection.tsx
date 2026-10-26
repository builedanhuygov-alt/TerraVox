import React, { useState } from 'react'
import { 
  PhoneCall, 
  ExternalLink, 
  Navigation, 
  Copy, 
  Check, 
  ShieldAlert, 
  MapPin, 
  AlertTriangle, 
  Info, 
  Compass, 
  Maximize2, 
  Radio, 
  FileText 
} from 'lucide-react'
import { ResolvedIncidentContact } from '../data/californiaAgencyDirectory'

interface IncidentContactSectionProps {
  incident: {
    id: string
    title: string
    category: string
    status: string
    coordinates: [number, number]
    timestamp: string
    officialSource?: string
    officialUrl?: string
    estimatedAreaHa?: number
  }
  contactInfo: ResolvedIncidentContact
  nearestPlaceName?: string
  onZoomToIncident?: (coords: [number, number]) => void
}

export default function IncidentContactSection({
  incident,
  contactInfo,
  nearestPlaceName,
  onZoomToIncident
}: IncidentContactSectionProps) {
  const [copied, setCopied] = useState(false)

  const copyIncidentDetails = () => {
    const text = [
      `TERRAVOX INCIDENT DISPATCH REPORT`,
      `Incident ID: ${incident.id}`,
      `Title: ${incident.title}`,
      `Status: ${incident.status}`,
      `County: ${contactInfo.containingCounty}`,
      `Nearest Place: ${nearestPlaceName || 'Rural / Wildland Zone'}`,
      `Coordinates: ${contactInfo.coordinatesStr}`,
      `Agency Jurisdiction: ${contactInfo.responsibleAgency}`,
      `Agency HQ Phone: ${contactInfo.contactPhone}`,
      `Emergency Dispatch: ${contactInfo.emergencyPhone}`,
      `Data Source: ${contactInfo.dataSourceName}`,
      `Source Timestamp: ${contactInfo.dataSourceTimestamp}`,
      `Official Link: ${contactInfo.officialIncidentUrl}`,
      `Caltrans Road Closures: ${contactInfo.roadClosureUrl}`
    ].join('\n')

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    })
  }

  const navigateUrl = `https://www.google.com/maps/search/?api=1&query=${incident.coordinates[1]},${incident.coordinates[0]}`

  return (
    <div className="bg-[#0b1b13] border border-[#1b3b2b] rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[#183626] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h3 className="text-sm font-bold text-[#f0fdf4] tracking-tight">
              Response & Verified Contacts Directory
            </h3>
          </div>
          <p className="text-[11px] text-[#8ea598] mt-0.5">
            Verified jurisdictional dispatch, official incident feeds & road closure advisories
          </p>
        </div>

        {/* Verification Status Pill */}
        <div>
          {contactInfo.verificationState === 'VERIFIED_OFFICIAL_INCIDENT' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 text-[11px] font-mono">
              <ShieldAlert size={12} className="text-emerald-400" />
              OFFICIALLY ASSIGNED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/70 text-amber-300 border border-amber-600/50 text-[11px] font-mono">
              <AlertTriangle size={12} className="text-amber-400" />
              UNVERIFIED HOTSPOT
            </span>
          )}
        </div>
      </div>

      {/* Verification Notice Banner */}
      {contactInfo.verificationState === 'UNVERIFIED_CONSULT_INCIDENT_PAGE' ? (
        <div className="p-3 rounded-lg bg-[#241a0b] border border-amber-600/30 text-amber-200 text-xs flex items-start gap-2.5">
          <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-amber-100">
              Responsible agency not verified — consult the official incident page.
            </span>
            <p className="text-[11px] text-amber-300/80 mt-0.5">
              This detection is an automated satellite radiometric anomaly. Ground confirmation and specific battalion dispatch assignment are pending.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-2.5 rounded-lg bg-[#0e271c] border border-emerald-600/30 text-emerald-200 text-xs flex items-center gap-2">
          <ShieldAlert size={15} className="text-emerald-400 shrink-0" />
          <span className="text-[11px] leading-snug">
            {contactInfo.verificationMessage}
          </span>
        </div>
      )}

      {/* Two Column Grid of Contact & Location Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Left Column: Geographic & Incident Identity */}
        <div className="space-y-2.5 bg-[#08150f] p-3 rounded-lg border border-[#162e21]">
          <div>
            <div className="text-[10px] uppercase font-mono text-[#748f80]">Incident Name & ID</div>
            <div className="font-semibold text-[#f0fdf4] text-xs mt-0.5">
              {incident.title}
            </div>
            <div className="text-[10px] font-mono text-[#89a896] mt-0.5">
              ID: <span className="text-emerald-300">{incident.id}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5">
            <div className="text-[10px] uppercase font-mono text-[#748f80]">Geographic Jurisdiction</div>
            <div className="font-medium text-[#e2f1e8] mt-0.5 flex items-center gap-1.5">
              <MapPin size={13} className="text-emerald-400" />
              <span>{contactInfo.containingCounty}</span>
            </div>
            {nearestPlaceName && (
              <div className="text-[11px] text-[#8ca395] mt-0.5 ml-4">
                Nearest Incorporated Place: <span className="text-[#cde3d6] font-medium">{nearestPlaceName}</span>
              </div>
            )}
            <div className="text-[10px] font-mono text-[#8ca395] mt-1 ml-4">
              Coordinates: {contactInfo.coordinatesStr}
            </div>
          </div>

          <div className="pt-2 border-t border-white/5">
            <div className="text-[10px] uppercase font-mono text-[#748f80]">Data Provenance & Freshness</div>
            <div className="text-[11px] text-[#b6cec2] font-mono mt-0.5">
              Source: {contactInfo.dataSourceName}
            </div>
            <div className="text-[10px] text-[#718b7c] font-mono mt-0.5">
              Timestamp: {new Date(contactInfo.dataSourceTimestamp).toLocaleString('en-US', { timeZoneName: 'short' })}
            </div>
          </div>
        </div>

        {/* Right Column: Responsible Agency & Verified Telephony */}
        <div className="space-y-2.5 bg-[#08150f] p-3 rounded-lg border border-[#162e21]">
          <div>
            <div className="text-[10px] uppercase font-mono text-[#748f80]">Responsible Agency</div>
            <div className="font-semibold text-emerald-300 text-xs mt-0.5">
              {contactInfo.responsibleAgency}
            </div>
            {contactInfo.agencyUnitCode && (
              <div className="text-[10px] font-mono text-[#8ca395]">
                Unit Code: {contactInfo.agencyUnitCode}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-white/5">
            <div className="text-[10px] uppercase font-mono text-[#748f80]">Official Agency Headquarters Phone</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-mono text-xs text-[#f0fdf4]">{contactInfo.contactPhone}</span>
              <a
                href={contactInfo.contactPhoneTel}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-[11px] font-medium transition-colors"
                title={`Call ${contactInfo.contactPhone}`}
              >
                <PhoneCall size={12} />
                <span>Call HQ</span>
              </a>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5">
            <div className="text-[10px] uppercase font-mono text-[#748f80]">Emergency Command & Dispatch</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-mono text-[11px] text-[#f0fdf4] truncate max-w-[190px]">
                {contactInfo.emergencyPhone}
              </span>
              <a
                href={contactInfo.emergencyPhoneTel}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-600/40 text-[11px] font-medium transition-colors"
                title="Call Emergency Dispatch"
              >
                <PhoneCall size={12} />
                <span>Dispatch</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {/* Action 1: Official Incident Page */}
        <a
          href={contactInfo.officialIncidentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#11291d] hover:bg-[#183928] text-emerald-200 border border-emerald-700/40 text-xs font-semibold transition-colors"
        >
          <ExternalLink size={13} />
          <span>Official Page</span>
        </a>

        {/* Action 2: Navigate in Maps */}
        <a
          href={navigateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#11291d] hover:bg-[#183928] text-emerald-200 border border-emerald-700/40 text-xs font-semibold transition-colors"
        >
          <Navigation size={13} />
          <span>Navigate</span>
        </a>

        {/* Action 3: Copy Details */}
        <button
          onClick={copyIncidentDetails}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#11291d] hover:bg-[#183928] text-emerald-200 border border-emerald-700/40 text-xs font-semibold transition-colors"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          <span>{copied ? 'Copied!' : 'Copy Details'}</span>
        </button>

        {/* Action 4: View Affected Area / Zoom */}
        <button
          onClick={() => onZoomToIncident?.(incident.coordinates)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[#07130c] font-bold text-xs shadow-md transition-all"
        >
          <Maximize2 size={13} />
          <span>Zoom to Fire</span>
        </button>
      </div>

      {/* Emergency Links: County OES & Caltrans Road Closures */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#163324] text-[11px]">
        <div className="flex items-center gap-3">
          <span className="text-[#748f80]">Official Portals:</span>
          <a 
            href={contactInfo.countyOesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 inline-flex items-center gap-1"
          >
            <span>{contactInfo.containingCounty} Emergency OES</span>
            <ExternalLink size={10} />
          </a>
          <a 
            href={contactInfo.roadClosureUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 inline-flex items-center gap-1"
          >
            <span>Caltrans Road Closures (QuickMap)</span>
            <ExternalLink size={10} />
          </a>
        </div>

        <div className="text-[10px] font-mono text-[#627d6f]">
          Dial 911 for life safety emergencies
        </div>
      </div>
    </div>
  )
}
