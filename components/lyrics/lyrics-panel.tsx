'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Timer, X } from 'lucide-react'
import { usePlayer } from '@/components/providers/player-provider'
import { useToast } from '@/components/providers/toast-provider'
import { Cover } from '@/components/shared/art'
import { TrackTitle } from '@/components/shared/track-title'
import { mmss } from '@/lib/data'
import { lyricsToPlainText, parseLrc } from '@/lib/lrc-parser'
import { cn } from '@/lib/utils'

/**
 * Полноэкранный текст песни.
 *
 * Раньше текст жил в узкой боковой панели, и читать его было неудобно.
 * Теперь это отдельный слой во весь экран: слева карточка обложки с
 * управлением, по центру крупные строки, фон — размытая обложка трека.
 *
 * Режим разметки таймингов сохранён: он ценный и другого места для него нет.
 */
export function LyricsPanel() {
  const {
    current, time, lyrics, lyricsOpen, setLyricsOpen, editingLyrics, toggleEditing,
    setLyricsFromText, setTimedLyrics, stampLine, jumpToLine,
    playing, togglePlay, next, prev, shuffle, toggleShuffle, repeat, cycleRepeat, seekFraction,
  } = usePlayer()
  const { toast } = useToast()
  const bodyRef = useRef<HTMLDivElement>(null)
  const [cursor, setCursor] = useState(0)
  const [draft, setDraft] = useState('')
  const [searchedTrack, setSearchedTrack] = useState('')
  const [suggestion, setSuggestion] = useState<{ syncedLyrics: string | null; plainLyrics: string | null; artistName: string } | null>(null)
  const [searching, setSearching] = useState(false)

  const hasLyrics = lyrics.length > 0
  const progress = current.durationSec > 0 ? time / current.durationSec : 0

  useEffect(() => {
    setDraft(lyrics.map((line) => line.text).join('\n'))
    setCursor(0)
  }, [current.id])

  // Пока текст открыт, страница под ним не должна прокручиваться.
  useEffect(() => {
    if (!lyricsOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [lyricsOpen])

  useEffect(() => {
    if (!lyricsOpen) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setLyricsOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lyricsOpen, setLyricsOpen])

  useEffect(() => {
    if (!lyricsOpen || !editingLyrics || searchedTrack === current.id) return
    const artistName = current.credits.map((credit) => credit.name).join(', ') || 'ГУЛ'
    const controller = new AbortController()
    setSearching(true)
    setSearchedTrack(current.id)
    void fetch(`/api/lyrics/search?track_name=${encodeURIComponent(current.title)}&artist_name=${encodeURIComponent(artistName)}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ found?: boolean; syncedLyrics?: string | null; plainLyrics?: string | null }> : null)
      .then((result) => { if (result?.found) setSuggestion({ syncedLyrics: result.syncedLyrics ?? null, plainLyrics: result.plainLyrics ?? null, artistName }) })
      .catch(() => undefined)
      .finally(() => setSearching(false))
    return () => controller.abort()
  }, [current.credits, current.id, current.title, editingLyrics, lyricsOpen, searchedTrack])

  // активная строка = последняя со временем <= текущему
  let active = -1
  for (let index = 0; index < lyrics.length; index += 1) if (time >= lyrics[index].t) active = index

  useEffect(() => {
    if (editingLyrics || !lyricsOpen || active < 0) return
    const body = bodyRef.current
    if (!body) return
    const element = body.querySelector<HTMLElement>(`[data-line="${active}"]`)
    if (!element) return
    const target = element.offsetTop - body.clientHeight * 0.42
    if (Math.abs(body.scrollTop - target) > 40) body.scrollTo({ top: target, behavior: 'smooth' })
  }, [active, editingLyrics, lyricsOpen])

  const stamp = useCallback((index: number) => {
    stampLine(index)
    toast(`Метка ${mmss(Math.floor(time))} поставлена`)
    setCursor(Math.min(lyrics.length - 1, index + 1))
  }, [stampLine, toast, time, lyrics.length])

  useEffect(() => {
    if (!editingLyrics || !lyricsOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.key !== 'Enter') return
      const tag = (event.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      event.preventDefault()
      stamp(cursor)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editingLyrics, lyricsOpen, cursor, stamp])

  if (!lyricsOpen) return null

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat
  const transport = 'grid h-9 w-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-paper-3 hover:text-ink'

  return (
    <div role="dialog" aria-modal="true" aria-label="Текст трека" className="fixed inset-0 z-[120] overflow-hidden">
      {/* Фон: та же обложка, но размытая сильнее — текст должен читаться поверх. */}
      {current.coverUrl ? (
        <div aria-hidden className="absolute inset-[-10%] bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(current.coverUrl)})`, filter: 'blur(90px) saturate(160%)', transform: 'scale(1.15)' }} />
      ) : (
        <div aria-hidden className="absolute inset-[-10%]" style={{ filter: 'blur(90px) saturate(160%)', transform: 'scale(1.15)' }}>
          <span className={cn('cover block h-full w-full rounded-none border-0', current.cover)} />
        </div>
      )}
      <div aria-hidden className="absolute inset-0 bg-paper/80 backdrop-blur-2xl" />

      <div className="relative grid h-full grid-rows-[auto_1fr] gap-0">
        <header className="flex items-center gap-3 px-5 py-4 sm:px-8">
          <div className="min-w-0">
            <div className="eyebrow">
              текст · {editingLyrics ? 'разметка' : hasLyrics ? 'синхронизирован' : 'нет текста'}{searching ? ' · поиск…' : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { toggleEditing(); setCursor(0) }}
            className={cn('ml-auto inline-flex items-center gap-1.5 rounded-xl border border-rule px-2.5 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.07em] text-ink-2 transition-colors hover:border-accent-1/45 hover:text-ink', editingLyrics && 'border-accent-1/60 bg-accent-1/12 text-ink')}
          >
            <Timer width={12} height={12} /> Разметить
          </button>
          <button type="button" aria-label="Закрыть текст" onClick={() => setLyricsOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-paper-3 hover:text-ink">
            <X width={18} height={18} />
          </button>
        </header>

        <div className="grid min-h-0 gap-6 px-5 pb-8 sm:px-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-12">
          {/* Карточка трека с управлением — как в референсе */}
          <aside className="hidden min-h-0 content-start justify-items-center gap-4 lg:grid">
            <div className="glass-panel w-full max-w-[300px] rounded-3xl p-4">
              <Cover cover={current.cover} coverUrl={current.coverUrl} className="aspect-square w-full rounded-2xl" />

              <div className="mt-4 flex items-center justify-center gap-1">
                <button type="button" aria-label="Перемешать" aria-pressed={shuffle} onClick={toggleShuffle} className={cn(transport, shuffle && 'text-accent-1')}><Shuffle width={15} height={15} /></button>
                <button type="button" aria-label="Назад" onClick={prev} className={transport}><SkipBack width={16} height={16} /></button>
                <button type="button" aria-label={playing ? 'Пауза' : 'Играть'} onClick={togglePlay} className="grid h-11 w-11 place-items-center rounded-full bg-accent-1 text-on-accent transition-transform hover:scale-105 active:scale-95">
                  {playing ? <Pause width={18} height={18} fill="currentColor" /> : <Play width={18} height={18} fill="currentColor" />}
                </button>
                <button type="button" aria-label="Вперёд" onClick={next} className={transport}><SkipForward width={16} height={16} /></button>
                <button type="button" aria-label={`Повтор: ${repeat === 'off' ? 'выключен' : repeat === 'all' ? 'весь список' : 'один трек'}`} aria-pressed={repeat !== 'off'} onClick={cycleRepeat} className={cn(transport, repeat !== 'off' && 'text-accent-1')}><RepeatIcon width={15} height={15} /></button>
              </div>

              <div className="mt-3 grid grid-cols-[36px_1fr_36px] items-center gap-2">
                <span className="tabnum font-mono text-[0.625rem] text-ink-3">{mmss(time)}</span>
                <input
                  type="range" min={0} max={1} step={0.001} value={progress}
                  onChange={(event) => seekFraction(Number(event.target.value))}
                  aria-label="Позиция трека"
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-paper-3 accent-[var(--accent-1)]"
                />
                <span className="tabnum text-right font-mono text-[0.625rem] text-ink-3">{mmss(current.durationSec)}</span>
              </div>

              <div className="mt-3 text-center">
                <TrackTitle title={current.title} credits={current.credits} featuring={current.featuring} className="text-sm font-semibold" artistClassName="text-ink-2" />
              </div>
            </div>
          </aside>

          {/* Строки текста */}
          <div ref={bodyRef} className="min-h-0 overflow-y-auto scroll-smooth pb-24">
            {editingLyrics && (
              <div className="mx-auto mb-6 grid max-w-2xl gap-2 rounded-2xl border border-rule bg-paper-2 p-4">
                <label className="font-mono text-xs text-ink-3" htmlFor="lyrics-source">Текст построчно</label>
                <textarea id="lyrics-source" value={draft} onChange={(event) => setDraft(event.target.value)} rows={7} placeholder={'Первая строка\nВторая строка'} className="resize-y rounded-xl border border-rule bg-paper-2 px-3 py-2 font-mono text-sm outline-none focus:border-accent-1/50" />
                <button type="button" onClick={() => { setLyricsFromText(draft); setCursor(0); toast('Текст сохранён. Ставь тайминги пробелом или кликом по строке.') }} className="ghost justify-center">сохранить текст</button>
              </div>
            )}

            {!hasLyrics && !editingLyrics && (
              <div className="mx-auto mt-16 max-w-md rounded-2xl border border-dashed border-rule p-8 text-center">
                <b className="mb-1 block text-ink">У трека пока нет текста</b>
                <p className="text-sm text-ink-2">Откройте «Разметить», вставьте текст построчно и синхронизируйте его с аудио.</p>
              </div>
            )}

            <div className={cn('mx-auto grid max-w-3xl', editingLyrics ? 'gap-1' : 'gap-3 pt-[18vh]')}>
              {lyrics.map((line, index) => {
                const isActive = index === active
                return (
                  <button
                    key={index}
                    type="button"
                    data-line={index}
                    onClick={() => (editingLyrics ? stamp(index) : jumpToLine(line.t))}
                    className={cn(
                      'w-full rounded-xl px-3 text-left transition-all duration-300',
                      editingLyrics
                        ? 'grid grid-cols-[64px_1fr] items-baseline gap-3 border-b border-dotted border-rule-soft py-1.5 text-[1.0625rem] hover:bg-paper-2'
                        : 'py-1.5 text-center text-[1.6rem] font-semibold leading-[1.3] sm:text-[2.1rem]',
                      // Неактивные строки приглушены, активная — полностью читаема и крупнее.
                      !editingLyrics && (isActive ? 'scale-[1.02] text-ink' : 'text-ink/35 hover:text-ink/60'),
                      editingLyrics && (isActive ? 'font-bold text-ink' : 'text-ink-2'),
                      editingLyrics && cursor === index && 'bg-accent-1/12',
                    )}
                  >
                    {editingLyrics && (
                      <span className="rounded border border-rule py-px text-center font-mono text-[0.625rem] text-ink-2">{mmss(line.t)}</span>
                    )}
                    <span className={cn(line.section && 'font-mono text-[0.75rem] uppercase tracking-[0.08em] text-ink-3')}>{line.text}</span>
                  </button>
                )
              })}
            </div>

            {!editingLyrics && hasLyrics && (
              <p className="mt-10 text-center font-mono text-[0.65rem] text-ink-3">строки едут за плеером · клик по строке — перемотка · Esc — закрыть</p>
            )}
          </div>
        </div>
      </div>

      {suggestion && (
        <div role="dialog" aria-label="Предложение текста" className="glass-panel absolute inset-x-4 top-20 z-50 mx-auto max-w-lg rounded-2xl p-4 sm:inset-x-auto sm:right-8">
          <div className="eyebrow">smart lyrics engine</div>
          <h4 className="mt-1 font-semibold">Найден текст для «{current.title}»</h4>
          <p className="mt-1 text-sm text-ink-2">Проверьте источник и выберите способ применения. Автор всегда может оставить свой текст.</p>
          <div className="mt-3 grid gap-2">
            {suggestion.syncedLyrics && <button type="button" onClick={() => { const lines = parseLrc(suggestion.syncedLyrics ?? ''); setTimedLyrics(lines); setDraft(lyricsToPlainText(lines)); setCursor(0); setSuggestion(null); toast('LRC применён: караоке-тайминги сохранены') }} className="solid justify-center">Применить с таймингами (LRC)</button>}
            {suggestion.plainLyrics && <button type="button" onClick={() => { setDraft(suggestion.plainLyrics ?? ''); setLyricsFromText(suggestion.plainLyrics ?? ''); setCursor(0); setSuggestion(null); toast('Текст вставлен для ручной синхронизации') }} className="ghost justify-center">Вставить только текст</button>}
            <button type="button" onClick={() => { setDraft(''); setLyricsFromText(''); setSuggestion(null); toast('Пустой редактор готов для авторского текста') }} className="ghost justify-center">Написать свой</button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Кнопка открытия полноэкранного текста для плеера. */
export function LyricsFullscreenButton({ className }: { className?: string }) {
  const { lyricsOpen, setLyricsOpen } = usePlayer()
  return (
    <button
      type="button"
      onClick={() => setLyricsOpen(!lyricsOpen)}
      aria-pressed={lyricsOpen}
      aria-label="Текст во весь экран"
      className={className}
    >
      <Maximize2 width={14} height={14} />
    </button>
  )
}
