import React from 'react'

interface SparklineProps {
  data: number[]
  color?: string // Hex or rgb for stroke and glow
  fillColor?: string
  height?: number
  width?: number | string
  className?: string
  showBeacon?: boolean
  showMinMax?: boolean
  unit?: string
}

export default function Sparkline({
  data = [12, 14, 18, 15, 22, 28, 26, 31, 35, 30, 38],
  color = '#22c55e',
  fillColor,
  height = 36,
  width = '100%',
  className = '',
  showBeacon = true,
  showMinMax = false,
  unit = ''
}: SparklineProps) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const paddingY = 4
  const usableHeight = height - paddingY * 2
  const stepX = 100 / (data.length - 1)

  const points = data.map((val, idx) => {
    const x = idx * stepX
    const y = height - paddingY - ((val - min) / range) * usableHeight
    return { x, y, val }
  })

  const pathD = points.reduce((acc, pt, idx) => {
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`
  }, '')

  const lastPt = points[points.length - 1]
  const areaD = `${pathD} L 100 ${height} L 0 ${height} Z`
  const gradientId = `spark-grad-${Math.abs(data.reduce((a, b) => a + b, 0)).toFixed(0)}-${color.replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <div className={`relative flex items-center ${className}`}>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        style={{ width, height, overflow: 'visible' }}
        className="shrink-0"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor || color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={fillColor || color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Shaded Area */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Stroke Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
        />

        {/* Pulsing End Beacon */}
        {showBeacon && lastPt && (
          <g transform={`translate(${lastPt.x}, ${lastPt.y})`}>
            <circle r="4" fill={color} opacity="0.4" className="animate-ping" />
            <circle r="2.5" fill={color} stroke="#ffffff" strokeWidth="0.8" />
          </g>
        )}
      </svg>

      {showMinMax && (
        <div className="absolute right-0 -top-3 text-[9px] font-mono text-[#718579] flex items-center gap-1.5">
          <span>H: {max}{unit}</span>
          <span>L: {min}{unit}</span>
        </div>
      )}
    </div>
  )
}
