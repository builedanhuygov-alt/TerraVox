import React from 'react'

export default function Generic({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
        <h1 className="text-xl font-semibold text-stone-100 font-sans tracking-tight">{title}</h1>
        <span className="text-xs font-mono text-stone-400 bg-stone-900 border border-stone-800 px-2 py-0.5 rounded">
          TERRAVOX // SUB-MODULE
        </span>
      </div>
      <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-6 text-stone-300">
        {children || (
          <div className="text-sm text-stone-400 leading-relaxed font-sans">
            Dedicated environmental intelligence and geospatial surveillance workspace for the {title} module.
          </div>
        )}
      </div>
    </div>
  )
}
