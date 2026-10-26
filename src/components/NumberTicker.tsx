import React, { useEffect, useState } from 'react'

interface NumberTickerProps {
  value: number
  duration?: number // in ms
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}

export default function NumberTicker({
  value,
  duration = 800,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = ''
}: NumberTickerProps) {
  const [displayValue, setDisplayValue] = useState<number>(0)

  useEffect(() => {
    let startTime: number | null = null
    const startValue = displayValue
    const diff = value - startValue

    if (diff === 0) return

    let animId: number

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease out expo for silky smooth deceleration
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      const current = startValue + diff * easeOut

      setDisplayValue(current)

      if (progress < 1) {
        animId = requestAnimationFrame(step)
      } else {
        setDisplayValue(value)
      }
    }

    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [value, duration])

  const formatted = displayValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })

  return (
    <span className={`inline-block font-mono tabular-nums tracking-tight ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  )
}
