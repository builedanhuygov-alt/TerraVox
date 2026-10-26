import React from 'react'
import { 
  Radio, 
  Eye, 
  MapPin, 
  ShieldAlert, 
  PhoneCall, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight 
} from 'lucide-react'
import { ResolvedIncidentContact } from '../data/californiaAgencyDirectory'

export interface WorkflowStageItem {
  key: 'detection' | 'validation' | 'location' | 'jurisdiction' | 'contact' | 'response'
  label: string
  subtitle: string
  state: 'completed' | 'active' | 'warning' | 'pending'
  detail: string
  icon: React.ReactNode
}

interface IncidentWorkflowPipelineProps {
  incident: {
    id: string
    title: string
    category: string
    status: string
    coordinates: [number, number]
    timestamp: string
    satelliteSensor?: string
    brightnessKelvin?: number
    estimatedAreaHa?: number
  }
  contactInfo: ResolvedIncidentContact
  compact?: boolean
}

export default function IncidentWorkflowPipeline({
  incident,
  contactInfo,
  compact = false
}: IncidentWorkflowPipelineProps) {
  const isSatelliteHotspot = incident.category === 'THERMAL_ANOMALY' || incident.status === 'UNVERIFIED'
  const isConfirmed = incident.category === 'CONFIRMED_WILDFIRE' || incident.status === 'CONFIRMED_ACTIVE' || incident.status === 'CONTAINED'

  const stages: WorkflowStageItem[] = [
    {
      key: 'detection',
      label: 'Detection',
      subtitle: incident.satelliteSensor || 'Thermal Radiance Sensor',
      state: 'completed',
      detail: incident.brightnessKelvin ? `${incident.brightnessKelvin.toFixed(1)} K radiance` : 'Telemetry confirmed',
      icon: <Radio size={14} />
    },
    {
      key: 'validation',
      label: 'Validation',
      subtitle: isConfirmed ? 'Ground Confirmed' : (isSatelliteHotspot ? 'Unverified Anomaly' : 'In Review'),
      state: isConfirmed ? 'completed' : (isSatelliteHotspot ? 'warning' : 'active'),
      detail: isConfirmed ? 'Officially validated by Command' : 'Awaiting ground / aerial patrol confirmation',
      icon: <Eye size={14} />
    },
    {
      key: 'location',
      label: 'Location',
      subtitle: contactInfo.containingCounty,
      state: 'completed',
      detail: `${incident.coordinates[1].toFixed(3)}°N, ${Math.abs(incident.coordinates[0]).toFixed(3)}°W`,
      icon: <MapPin size={14} />
    },
    {
      key: 'jurisdiction',
      label: 'Jurisdiction',
      subtitle: contactInfo.agencyUnitCode ? `${contactInfo.agencyUnitCode} Direct Area` : 'CAL FIRE SRA',
      state: 'completed',
      detail: contactInfo.responsibleAgency,
      icon: <ShieldAlert size={14} />
    },
    {
      key: 'contact',
      label: 'Contact',
      subtitle: contactInfo.verificationState === 'UNVERIFIED_CONSULT_INCIDENT_PAGE' 
        ? 'Agency Unverified' 
        : 'ECC Verified',
      state: contactInfo.verificationState === 'UNVERIFIED_CONSULT_INCIDENT_PAGE' ? 'warning' : 'completed',
      detail: contactInfo.contactPhone,
      icon: <PhoneCall size={14} />
    },
    {
      key: 'response',
      label: 'Response',
      subtitle: incident.status.replace(/_/g, ' '),
      state: incident.status === 'CONTAINED' ? 'completed' : (isConfirmed ? 'active' : 'pending'),
      detail: isConfirmed ? (incident.estimatedAreaHa ? `${incident.estimatedAreaHa} ha footprint` : 'Active ops') : 'Surveillance queue',
      icon: <Activity size={14} />
    }
  ]

  if (compact) {
    return (
      <div className="bg-[#091510] border border-[#1b3427] rounded-lg p-2.5">
        <div className="text-[10px] font-semibold text-[#8ca395] uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Verification & Response Pipeline</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            isConfirmed ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50' : 'bg-amber-950/60 text-amber-300 border border-amber-700/50'
          }`}>
            {isConfirmed ? 'OFFICIAL INCIDENT' : 'SATELLITE HOTSPOT'}
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1.5 text-center">
          {stages.map((st, i) => (
            <div 
              key={st.key}
              className={`p-1.5 rounded flex flex-col items-center justify-center border text-[10px] transition-all ${
                st.state === 'completed'
                  ? 'bg-[#0f281e] border-emerald-700/40 text-emerald-300'
                  : st.state === 'warning'
                  ? 'bg-amber-950/30 border-amber-700/40 text-amber-300'
                  : st.state === 'active'
                  ? 'bg-sky-950/30 border-sky-600/40 text-sky-300 animate-pulse'
                  : 'bg-[#0b1b13] border-[#183124] text-[#60776b]'
              }`}
            >
              <div className="mb-0.5">{st.icon}</div>
              <span className="font-semibold truncate max-w-full leading-tight">{st.label}</span>
              <span className="text-[9px] text-[#8ea598] truncate max-w-full">{st.subtitle}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#08140f] border border-[#1c382a] rounded-xl p-3.5 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[#162e22]">
        <div>
          <div className="text-xs font-semibold text-[#e1eee6] flex items-center gap-2">
            <span>Response & Verification Pipeline</span>
            <span className="text-[10px] text-[#8ca395] font-mono">(6 Stages)</span>
          </div>
          <div className="text-[11px] text-[#738e7f]">
            Rigorous cross-validation from raw satellite telemetry to agency command
          </div>
        </div>

        <div className="text-right">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded border ${
            isConfirmed 
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/50' 
              : 'bg-amber-950/60 text-amber-300 border-amber-600/50'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConfirmed ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
            {isConfirmed ? 'CONFIRMED WILDFIRE' : 'UNCONFIRMED SATELLITE HOTSPOT'}
          </span>
        </div>
      </div>

      {/* Pipeline stepper */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {stages.map((stage, idx) => {
          const isDone = stage.state === 'completed'
          const isWarn = stage.state === 'warning'
          const isActive = stage.state === 'active'

          return (
            <div
              key={stage.key}
              className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all ${
                isDone
                  ? 'bg-[#0f291e]/80 border-emerald-600/35 text-[#dcfce7]'
                  : isWarn
                  ? 'bg-[#261c0d]/70 border-amber-600/40 text-[#fef3c7]'
                  : isActive
                  ? 'bg-[#0c242c]/70 border-sky-600/40 text-[#e0f2fe]'
                  : 'bg-[#0a1711] border-[#182e22] text-[#637d70]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="opacity-80">{stage.icon}</span>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                      {idx + 1}. {stage.label}
                    </span>
                  </div>
                  {isDone && <CheckCircle2 size={13} className="text-emerald-400" />}
                  {isWarn && <AlertCircle size={13} className="text-amber-400" />}
                  {isActive && <Activity size={13} className="text-sky-400 animate-spin" />}
                </div>

                <div className="font-semibold text-xs leading-snug line-clamp-1">
                  {stage.subtitle}
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-white/5 text-[10px] font-mono text-[#8ca395] line-clamp-2">
                {stage.detail}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
