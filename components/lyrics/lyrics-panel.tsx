'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Timer, X } from 'lucide-react'
import { usePlayer } from '@/components/providers/player-provider'
import { useToast } from '@/components/providers/toast-provider'
import { Credits } from '@/components/shared/credits'
import { mmss } from '@/lib/data'
import { cn } from '@/lib/utils'

export function LyricsPanel() {
  const { current, time, lyrics, lyricsOpen, setLyricsOpen, editingLyrics, toggleEditing, setLyricsFromText, stampLine, jumpToLine } = usePlayer()
  const { toast } = useToast()
  const bodyRef = useRef<HTMLDivElement>(null)
  const [cursor, setCursor] = useState(0)
  const [draft, setDraft] = useState('')

  const hasLyrics = lyrics.length > 0

  useEffect(() => {
    setDraft(lyrics.map((line) => line.text).join('\n'))
    setCursor(0)
  }, [current.id])

  // активная строка = последняя со временем <= текущему
  let active = -1
  for (let i = 0; i < lyrics.length; i++) if (time >= lyrics[i].t) active = i

  // автопрокрутка за плеером
  useEffect(() => {
    if (editingLyrics || !lyricsOpen || active < 0) return
    const body = bodyRef.current
    if (!body) return
    const el = body.querySelector<HTMLElement>(`[data-line="${active}"]`)
    if (!el) return
    const target = el.offsetTop - body.clientHeight * 0.38
    if (Math.abs(body.scrollTop - target) > 40) body.scrollTo({ top: target, behavior: 'smooth' })
  }, [active, editingLyrics, lyricsOpen])

  const stamp = useCallback(
    (index: number) => {
      stampLine(index)
      toast(`Метка ${mmss(Math.floor(time))} поставлена`)
      setCursor(Math.min(lyrics.length - 1, index + 1))
    },
    [stampLine, toast, time, lyrics.length],
  )

  // пробел размечает строку под курсором
  useEffect(() => {
    if (!editingLyrics || !lyricsOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        stamp(cursor)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editingLyrics, lyricsOpen, cursor, stamp])

  return (
    <aside
      aria-label="Текст трека"
      className={cn(
        'fixed right-0 top-[57px] bottom-[76px] z-40 grid w-full grid-rows-[auto_1fr_auto] border-l border-ink bg-paper transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] sm:w-[min(400px,100%)]',
        'max-md:top-0 max-md:bottom-0 max-md:border-l-0',
        lyricsOpen ? 'translate-x-0' : 'translate-x-[101%]',
      )}
    >
      <div className="flex items-start gap-3 border-b border-rule px-5 py-4">
        <div className="min-w-0">
          <div className="eyebrow">текст · {editingLyrics ? 'разметка' : hasLyrics ? 'синхронизирован' : 'нет текста'}</div>
          <h3 className="truncate text-[1.0625rem] [font-stretch:80%]">{current.title}</h3>
          <Credits credits={current.credits} className="mt-1" />
        </div>
        <button type="button" aria-label="Закрыть" onClick={() => setLyricsOpen(false)} className="ml-auto text-ink-3 transition-colors hover:text-red">
          <X width={18} height={18} />
        </button>
      </div>

      <div ref={bodyRef} className={cn('overflow-auto px-5 pb-16 pt-5 scroll-smooth', editingLyrics && 'lyrics-edit')}>
        {editingLyrics && (
          <div className="mb-4 grid gap-2 border border-ink p-3">
            <label className="font-mono text-xs text-ink-3" htmlFor="lyrics-source">Текст построчно</label>
            <textarea id="lyrics-source" value={draft} onChange={(event) => setDraft(event.target.value)} rows={7} placeholder="Первая строка\nВторая строка" className="resize-y border border-ink-1 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-ink" />
            <button type="button" onClick={() => { setLyricsFromText(draft); setCursor(0); toast('Текст сохранён. Ставь тайминги пробелом или кликом по строке.') }} className="ghost justify-center">сохранить текст</button>
          </div>
        )}

        {!hasLyrics && !editingLyrics && (
          <div className="mt-8 border border-dashed border-rule p-6 text-center text-ink-2">
            <b className="mb-1 block [font-stretch:80%] text-ink">У трека пока нет текста</b>
            <p className="mx-auto max-w-[44ch] text-sm">Открой «Разметить», вставь текст построчно и синхронизируй его с аудио.</p>
          </div>
        )}

        {lyrics.map((l, i) => {
          const isActive = i === active
          const isPast = i < active
          return (
            <button
              key={i}
              type="button"
              data-line={i}
              onClick={() => {
                if (editingLyrics) stamp(i)
                else jumpToLine(l.t)
              }}
              className={cn(
                'grid w-full items-baseline gap-3 py-[5px] text-left text-[1.0625rem] leading-[1.45] text-ink-3 transition-all duration-300',
                editingLyrics ? 'grid-cols-[64px_1fr] cursor-pointer border-b border-dotted border-rule-soft hover:bg-paper-2' : 'grid-cols-[44px_1fr]',
                isPast && 'text-ink-3',
                isActive && !editingLyrics && 'origin-left scale-[1.035] font-bold text-ink',
                isActive && editingLyrics && 'font-bold text-ink',
                l.section && !isActive && 'text-ink-2',
                editingLyrics && cursor === i && 'bg-blue-soft/60',
              )}
            >
              <span
                className={cn(
                  'font-mono text-[0.625rem] transition-colors',
                  editingLyrics ? 'border border-rule py-px text-center text-ink-2' : 'text-transparent',
                  isActive && !editingLyrics && 'text-red',
                )}
              >
                {mmss(l.t)}
              </span>
              <span className={cn(l.section && 'font-mono text-[0.75rem] uppercase tracking-[0.08em] text-ink-3')}>{l.text}</span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-3 border-t border-rule px-5 py-3">
        <button
          type="button"
          onClick={() => {
            toggleEditing()
            setCursor(0)
          }}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[2px] border border-transparent px-2 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.07em] text-ink-2 transition-colors hover:border-rule hover:text-ink disabled:opacity-40',
            editingLyrics && 'border-ink bg-ink text-paper hover:text-paper',
          )}
        >
          <Timer width={12} height={12} /> Разметить
        </button>
        <span className="ml-auto text-right font-mono text-[0.6875rem] text-ink-3">
{editingLyrics ? 'вставь текст, затем жми пробел или строку в момент, когда она звучит' : 'строки едут за плеером'}
        </span>
      </div>
    </aside>
  )
}
