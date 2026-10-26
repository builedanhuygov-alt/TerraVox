import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export function MetricCard({ label, value, unit, trend, dir, icon, subtitle }: any) {
  return (
    <div className="bg-[#0b1410] border border-[#14261c] rounded-2xl p-4 flex flex-col justify-between hover:border-[#1e3e2d] transition-colors shadow-xs">
      <div className="flex justify-between items-center text-xs text-[#8b9f94] mb-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#5b6f64] font-semibold truncate">{label}</span>
        {icon && (
          <div className="w-6 h-6 rounded-md bg-[#13281f] text-[#4ade80] flex items-center justify-center shrink-0 border border-[#1f4231]">
            {icon}
          </div>
        )}
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-extrabold font-mono text-[#f0fdf4] tracking-tight">{value}</span>
          {unit && <span className="text-[11px] text-[#718579] font-mono">{unit}</span>}
        </div>
        {subtitle && (
          <div className="text-[10px] text-[#5b6f64] mt-0.5 truncate">{subtitle}</div>
        )}
      </div>
      {trend && (
        <div className="mt-2.5 text-[10px] text-[#5b6f64] font-mono flex items-center justify-between border-t border-[#14261d] pt-2">
          <span className="flex items-center gap-1 text-[#4ade80]">
            {dir === 'up' ? <TrendingUp size={11} /> : dir === 'down' ? <TrendingDown size={11} /> : <Minus size={11} />}
            <span>{trend}</span>
          </span>
          <span className="text-[#5b6f64]">VERIFIED FEED</span>
        </div>
      )}
    </div>
  )
}

export function AlertCard({ icon, title, loc, time, status }: any) {
  return (
    <div className="bg-[#0b1410] border border-[#14261c] rounded-xl p-3 flex items-start gap-3 text-xs hover:border-[#1f3b2d] transition-colors">
      <div className="w-8 h-8 rounded-lg bg-[#18100e] border border-[#3b1f1a] text-[#f97316] flex items-center justify-center shrink-0 font-bold">
        {icon || '⚠️'}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="font-semibold text-[#f0fdf4] truncate">{title}</div>
        <div className="text-[11px] text-[#718579] font-mono">{loc} · {time}</div>
      </div>
      {status && (
        <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-[#102419] text-[#4ade80] border border-[#1a442c] shrink-0">
          {status}
        </span>
      )}
    </div>
  )
}

export function AIInsightCard({
  insight = "Atmospheric fuel moisture desiccation indices indicate elevated corridor susceptibility across Diablo Range wind gaps.",
  confidence = 88,
  model = "TERRAVOX NFDRS/Fusion Engine",
  timestamp = "Live Telemetry"
}: {
  insight?: string
  confidence?: number
  model?: string
  timestamp?: string
} = {}) {
  return (
    <div className="bg-[#0b1410] border border-[#14261c] rounded-2xl p-4 flex flex-col justify-between hover:border-[#1e3e2d] transition-colors shadow-xs">
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[#38bdf8] font-bold">
          <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse" />
          <span>Automated Fusion Insight</span>
        </div>
        <span className="text-[10px] font-mono text-[#5b6f64] px-1.5 py-0.5 rounded bg-[#070e0a] border border-[#14261c]">
          {model}
        </span>
      </div>
      <p className="text-xs text-[#cbd5d1] leading-relaxed mb-3">
        {insight}
      </p>
      <div className="flex items-center justify-between text-[10px] font-mono border-t border-[#14261d] pt-2 text-[#718579]">
        <span>Model Confidence: <strong className="text-[#4ade80]">{confidence}%</strong></span>
        <span>{timestamp}</span>
      </div>
    </div>
  )
}

