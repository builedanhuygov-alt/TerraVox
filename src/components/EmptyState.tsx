import React from 'react'
import { AlertCircle, RefreshCw, Layers } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  compact?: boolean
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false
}: EmptyStateProps) {
  return (
    <div className={`w-full rounded-2xl bg-[#09120d] border border-[#14261c] flex flex-col items-center justify-center text-center ${
      compact ? 'p-4 sm:p-6' : 'p-8 sm:p-12'
    }`}>
      <div className="w-10 h-10 rounded-xl bg-[#0e1d15] border border-[#1b3829] flex items-center justify-center text-[#4ade80] mb-3">
        {icon || <AlertCircle size={20} className="text-[#8b9f94]" />}
      </div>
      <h3 className="text-sm font-bold text-[#f0fdf4] max-w-sm leading-snug">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-[#718579] max-w-md mt-1.5 leading-relaxed font-sans">
          {description}
        </p>
      )}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-3.5 py-1.5 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-[#070f0b] text-xs font-bold transition-colors shadow-xs"
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-3 py-1.5 rounded-lg bg-[#0e1c15] hover:bg-[#152a1f] border border-[#1b3829] text-[#cbd5d1] text-xs font-medium transition-colors"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
