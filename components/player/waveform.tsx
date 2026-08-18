'use client'

import { useMemo, useRef, useState } from 'react'
import type { TimedComment } from '@/components/providers/player-provider'
import { mmss } from '@/lib/data'

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

type Props = {
  seed: string
  values?: number[]
  progress: number
  playing?: boolean
  durationSec?: number
  comments?: TimedComment[]
  commentMode?: boolean
  onSeek: (fraction: number) => void
  onAddComment?: (seconds: number, text: string) => void
}

export function Waveform({ seed, values, progress, playing = false, durationSec = 0, comments = [], commentMode = false, onSeek, onAddComment }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [hoverFraction, setHoverFraction] = useState<number | null>(null)
  const [commentAt, setCommentAt] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const count = 96
  const fallback = useMemo(() => bars(seed, count), [seed])
  const data = values && values.length > 0 ? values : fallback

  const fractionFromClientX = (clientX: number) => {
    const element = ref.current
    if (!element) return 0
    const rect = element.getBoundingClientRect()
    return rect.width === 0 ? 0 : Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }
  const seekFromClientX = (clientX: number) => onSeek(fractionFromClientX(clientX))
  const hoverTime = hoverFraction === null ? null : hoverFraction * durationSec

  return (
    <div className="relative py-4">
      {hoverFraction !== null && <div className="pointer-events-none absolute bottom-full z-20 -translate-x-1/2 rounded-md border border-cyan-300/25 bg-slate-950/95 px-2 py-1 font-mono text-[.62rem] text-cyan-100 shadow-lg" style={{ left: `${hoverFraction * 100}%` }}>{mmss(hoverTime ?? 0)}</div>}
      {commentAt !== null && <form onSubmit={(event) => { event.preventDefault(); if (draft.trim() && onAddComment) onAddComment(commentAt, draft); setDraft(''); setCommentAt(null) }} className="absolute bottom-full z-30 w-56 -translate-x-1/2 rounded-xl border border-cyan-300/30 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-xl" style={{ left: `${durationSec > 0 ? commentAt / durationSec * 100 : 0}%` }}><p className="mb-1 font-mono text-[.6rem] uppercase tracking-[.08em] text-cyan-100">Комментарий · {mmss(commentAt)}</p><input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Что слышите?" className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs outline-none placeholder:text-ink-3 focus:border-cyan-300/50" /><div className="mt-2 flex justify-end gap-1"><button type="button" onClick={() => setCommentAt(null)} className="ghost !px-2 !py-1 !text-[.65rem]">Отмена</button><button type="submit" className="solid !px-2 !py-1 !text-[.65rem]">Отправить</button></div></form>}
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label={commentMode ? 'Добавить комментарий по таймкоду' : 'Позиция трека'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        onPointerDown={(event) => {
          const fraction = fractionFromClientX(event.clientX)
          if (commentMode) { setCommentAt(fraction * durationSec); return }
          event.currentTarget.setPointerCapture(event.pointerId)
          setDragging(true)
          onSeek(fraction)
        }}
        onPointerMove={(event) => { const fraction = fractionFromClientX(event.clientX); setHoverFraction(fraction); if (dragging) onSeek(fraction) }}
        onPointerLeave={() => { if (!dragging) setHoverFraction(null) }}
        onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); setDragging(false) }}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={(event) => { if (event.key === 'ArrowRight') onSeek(Math.min(1, progress + 0.03)); if (event.key === 'ArrowLeft') onSeek(Math.max(0, progress - 0.03)); if (event.key === 'Home') onSeek(0); if (event.key === 'End') onSeek(1) }}
        className={'group relative flex h-9 touch-none cursor-pointer items-center gap-[2px] rounded-lg px-1 outline-none transition-colors duration-300 hover:bg-cyan-300/5 ' + (commentMode ? 'ring-1 ring-cyan-300/50 bg-cyan-300/5' : '')}
      >
        {data.map((value, index) => {
          const played = index / data.length <= progress
          return <span key={index} className={'w-full flex-1 rounded-full transition-all duration-300 ' + (played ? 'bg-gradient-to-t from-cyan-400 via-cyan-200 to-white shadow-[0_0_8px_rgba(78,230,255,0.42)] group-hover:from-fuchsia-400 group-hover:via-cyan-200' : 'bg-white/10 group-hover:bg-cyan-200/25') + (playing && played ? ' animate-pulse' : '')} style={{ height: `${Math.max(13, Math.round(value * 100))}%`, transitionDelay: `${index % 10 * 12}ms` }} />
        })}
        {comments.map((comment) => {
          const left = durationSec > 0 ? Math.max(1, Math.min(99, comment.seconds / durationSec * 100)) : 1
          return <button key={comment.id} type="button" title={`${comment.author}: ${comment.text}`} aria-label={`Комментарий ${comment.author} на ${mmss(comment.seconds)}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onSeek(durationSec > 0 ? comment.seconds / durationSec : 0) }} className="absolute top-1/2 z-10 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-cyan-300 font-mono text-[.45rem] font-black text-slate-950 shadow-[0_0_12px_rgba(78,230,255,.7)] transition-transform hover:scale-125" style={{ left: `${left}%` }}>{comment.initials.slice(0, 2)}</button>
        })}
      </div>
      {commentMode && <p className="mt-1 font-mono text-[.6rem] text-cyan-100">Режим комментария: кликните по волне, чтобы оставить заметку на таймкоде.</p>}
    </div>
  )
}
