import React from 'react'
import EmptyState from './EmptyState'

export function Skeleton({ h = 16, w = '100%', className = '' }: { h?: number | string; w?: number | string; className?: string }) {
  return (
    <div
      style={{ height: typeof h === 'number' ? `${h}px` : h, width: typeof w === 'number' ? `${w}px` : w }}
      className={`skeleton rounded-lg bg-[#0e1d15] border border-[#14261c] ${className}`}
    />
  )
}

export { EmptyState }

export function SuccessFeedback({ msg }: { msg: string }) {
  return (
    <div className="bg-[#091a11] border border-[#1d4d33] text-[#4ade80] px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs">
      <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
      <span>{msg}</span>
    </div>
  )
}
