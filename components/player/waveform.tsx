'use client'

import { useMemo, useRef, useState } from 'react'

function bars(seed: string, count: number) {
  let hash = 0
  for (let index = 0; index < seed.length; index++) hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  const values: number[] = []
  for (let index = 0; index < count; index++) {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff
    const base = (hash % 1000) / 1000
    const envelope = 0.35 + 0.65 * Math.abs(Math.sin((index / count) * Math.PI * 3 + 0.6))
    values.push(0.18 + base * 0.82 * envelope)
  }
  return values
}

export function Waveform({ seed, values, progress, playing = false, onSeek }: { seed: string; values?: number[]; progress: number; playing?: boolean; onSeek: (fraction: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const count = 96
  const fallback = useMemo(() => bars(seed, count), [seed])
  const data = values && values.length > 0 ? values : fallback

  const seekFromClientX = (clientX: number) => {
    const element = ref.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    if (rect.width === 0) return
    onSeek(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)))
  }

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Позиция трека"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        setDragging(true)
        seekFromClientX(event.clientX)
      }}
      onPointerMove={(event) => {
        if (dragging) seekFromClientX(event.clientX)
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
        setDragging(false)
      }}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') onSeek(Math.min(1, progress + 0.03))
        if (event.key === 'ArrowLeft') onSeek(Math.max(0, progress - 0.03))
        if (event.key === 'Home') onSeek(0)
        if (event.key === 'End') onSeek(1)
      }}
      className="group flex h-9 touch-none cursor-pointer items-center gap-[2px] rounded-lg px-1 outline-none transition-colors duration-300 hover:bg-cyan-300/5"
    >
      {data.map((value, index) => {
        const played = index / data.length <= progress
        return <span key={index} className={'w-full flex-1 rounded-full transition-all duration-300 ' + (played ? 'bg-gradient-to-t from-cyan-400 via-cyan-200 to-white shadow-[0_0_8px_rgba(78,230,255,0.42)] group-hover:from-fuchsia-400 group-hover:via-cyan-200' : 'bg-white/10 group-hover:bg-cyan-200/25') + (playing && played ? ' animate-pulse' : '')} style={{ height: `${Math.max(13, Math.round(value * 100))}%`, transitionDelay: `${index % 10 * 12}ms` }} />
      })}
    </div>
  )
}
