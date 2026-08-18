'use client'

import { useEffect, useState } from 'react'

/** Гистограмма распределения оценок. distribution[0] — балл 10, distribution[9] — балл 1. */
export function RatingHistogram({ distribution }: { distribution: number[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const max = Math.max(1, ...distribution)

  return (
    <div className="mt-4 grid gap-[3px]">
      {distribution.map((count, i) => {
        const label = 10 - i
        return (
          <div key={i} className="group grid grid-cols-[30px_1fr_34px] items-center gap-2">
            <span className="text-right font-mono text-[0.625rem] text-ink-3 group-hover:text-ink">{label}</span>
            <span className="h-[9px] overflow-hidden bg-paper-2">
              <span
                className="block h-full origin-left bg-blue transition-transform duration-700 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]"
                style={{ transform: `scaleX(${mounted ? count / max : 0})`, transitionDelay: `${i * 35}ms` }}
              />
            </span>
            <span className="font-mono text-[0.625rem] text-ink-3 group-hover:text-ink">{count}</span>
          </div>
        )
      })}
    </div>
  )
}
