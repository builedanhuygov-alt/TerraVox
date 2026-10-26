import { useEffect, useState } from 'react'
import { API_BASE } from '../services/api'
import { Scale, CheckCircle2, QrCode, Shield, MapPin, FileCheck, ExternalLink, ArrowRight } from 'lucide-react'

const API = API_BASE

export default function EUDR() {
  const [check, setCheck] = useState<any>(null)
  const [lotId, setLotId] = useState('GL-2026-00001')

  useEffect(() => {
    fetch(`${API}/api/eudr/check?lot_id=${lotId}`)
      .then(r => r.json())
      .then(j => setCheck(j))
      .catch(() => {})
  }, [lotId])

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#172b22]">
        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#4ade80] font-semibold flex items-center gap-1.5">
            <Scale size={14} />
            <span>TERRAVOX EUDR DEFORESTATION DUE DILIGENCE</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#f0fdf4]">
            European Union Deforestation Regulation (EUDR) Due Diligence Dossier
          </h1>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-[#718579]">Production Batch:</span>
          <span className="font-mono font-bold text-[#4ade80] bg-[#12241c] px-2.5 py-1 rounded border border-[#1f382c]">
            {lotId}
          </span>
        </div>
      </div>

      {/* Due diligence flow diagram */}
      <div className="tv-card space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-wider text-[#718579] font-bold">
          Chain of Custody &amp; Due Diligence Traceability Flow
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-center font-mono">
          {[
            { step: '1. Producer / Parcel', sub: 'GPS Boundary Polygon' },
            { step: '2. Aggregation Hub', sub: 'Regional Distribution Node' },
            { step: '3. Processing Facility', sub: 'Chain of Custody ID' },
            { step: '4. Packaging & Mill', sub: 'Batch Verification' },
            { step: '5. Export Logistics', sub: 'EUDR Compliance Ready' }
          ].map((s, i) => (
            <div key={i} className="p-3 rounded-lg bg-[#091410] border border-[#14261e] space-y-1">
              <div className="text-[#4ade80] font-bold">{s.step}</div>
              <div className="text-[10px] text-[#5b6f64]">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit & Compliance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="tv-card">
          <div className="text-xs text-[#8b9f94]">Parcel Polygon Geolocation Compliance</div>
          <div className="text-2xl font-bold font-mono text-[#4ade80] mt-1">100%</div>
          <div className="text-[11px] text-[#5b6f64] mt-1">Meets EUDR Article 9 Geolocation Standards</div>
        </div>

        <div className="tv-card">
          <div className="text-xs text-[#8b9f94]">Cut-off Baseline Satellite Proof (Dec 31, 2020)</div>
          <div className="text-2xl font-bold font-mono text-[#4ade80] mt-1">87%</div>
          <div className="text-[11px] text-[#5b6f64] mt-1">Zero deforestation after mandated baseline cut-off</div>
        </div>

        <div className="tv-card">
          <div className="text-xs text-[#8b9f94]">Due Diligence Readiness Index</div>
          <div className="text-2xl font-bold font-mono text-[#f0fdf4] mt-1">91 / 100</div>
          <div className="text-[11px] text-[#5b6f64] mt-1">Risk Level: LOW (Negligible Risk)</div>
        </div>
      </div>

      {/* Digital Passport Card */}
      <div className="tv-card space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#172b22]">
          <div className="flex items-center gap-2">
            <QrCode size={18} className="text-[#a3e635]" />
            <h2 className="text-sm font-bold text-[#f0fdf4]">Digital Supply Chain & Forestry Passport (EUDR)</h2>
          </div>
          <span className="font-mono text-xs text-[#22c55e]">VERIFIED PASSPORT</span>
        </div>

        <div className="p-4 rounded-xl bg-[#091410] border border-[#14261e] flex flex-col sm:flex-row items-center gap-5">
          {/* QR representation */}
          <div className="w-28 h-28 bg-[#ffffff] p-2 rounded-xl flex items-center justify-center shrink-0 shadow-md">
            <div className="w-full h-full border-2 border-[#070f0b] flex flex-col items-center justify-center font-mono text-[9px] font-black text-[#070f0b] p-1 text-center">
              <span>TERRAVOX</span>
              <span className="text-[7px]">CA-2026</span>
              <div className="w-8 h-8 my-1 border border-[#070f0b] grid grid-cols-2 gap-0.5 p-0.5">
                <div className="bg-[#070f0b]" />
                <div />
                <div />
                <div className="bg-[#070f0b]" />
              </div>
              <span className="text-[6px]">PASSPORT</span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-[#cbd5d1] w-full">
            <div className="flex justify-between border-b border-[#14261e] pb-1">
              <span className="text-[#718579]">Commodity / Sector:</span>
              <b className="text-[#f0fdf4]">Certified Timber & Agroforestry (Sierra Nevada Basin)</b>
            </div>
            <div className="flex justify-between border-b border-[#14261e] pb-1">
              <span className="text-[#718579]">Batch ID:</span>
              <span className="font-mono text-[#4ade80]">CA-2026-00001</span>
            </div>
            <div className="flex justify-between border-b border-[#14261e] pb-1">
              <span className="text-[#718579]">Deforestation Risk:</span>
              <span className="font-mono font-bold text-[#22c55e]">LOW (0.02% probability)</span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-[#718579]">Traceability Authority:</span>
              <span className="text-[#a3e635]">California Sustainable Forest & Land Stewardship Network</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-[#5b6f64] leading-relaxed">
          Due Diligence Notice: Verification is grounded in Copernicus Sentinel-2/Sentinel-1 multi-temporal imagery and California state geospatial land parcel records.
        </p>
      </div>
    </div>
  )
}
