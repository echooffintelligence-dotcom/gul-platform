'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Play, RotateCw } from 'lucide-react'
import { usePlayer } from '@/components/providers/player-provider'
import { useToast } from '@/components/providers/toast-provider'
import { Cover } from '@/components/shared/art'
import { Credits } from '@/components/shared/credits'
import { fmt, type ChartEntry } from '@/lib/data'
import { useReleases } from '@/components/providers/release-provider'
import { cn } from '@/lib/utils'

type SortKey = 'day' | 'week' | 'rzt' | 'new'

const filters: { key: SortKey; label: string }[] = [
  { key: 'day', label: 'За 24 часа' },
  { key: 'week', label: 'За неделю' },
  { key: 'rzt', label: 'Оценка РЗТ' },
  { key: 'new', label: 'Новинки' },
]

function Move({ move }: { move: number | 'new' }) {
  if (move === 'new') return <div className="mv text-right font-mono text-xs font-semibold text-red">NEW</div>
  if (typeof move === 'number' && move > 0)
    return (
      <div className="mv flex items-center justify-end gap-0.5 text-right font-mono text-xs text-blue">
        <ArrowUp width={11} height={11} />
        {move}
      </div>
    )
  if (typeof move === 'number' && move < 0)
    return (
      <div className="mv flex items-center justify-end gap-0.5 text-right font-mono text-xs text-ink-3">
        <ArrowDown width={11} height={11} />
        {Math.abs(move)}
      </div>
    )
  return <div className="mv text-right font-mono text-xs text-ink-3">—</div>
}

export function ChartTable() {
  const { current, playing, play } = usePlayer()
  const { chart, getTrack } = useReleases()
  const { toast } = useToast()
  const [sort, setSort] = useState<SortKey>('week')
  const [loading, setLoading] = useState(false)

  const rows = useMemo(() => {
    const list = [...chart]
    if (sort === 'day') list.sort((a, b) => b.plays24 - a.plays24)
    if (sort === 'week') list.sort((a, b) => b.playsWeek - a.playsWeek)
    if (sort === 'rzt') list.sort((a, b) => b.score - a.score)
    if (sort === 'new') list.sort((a, b) => (a.move === 'new' ? -1 : b.move === 'new' ? 1 : b.playsWeek - a.playsWeek))
    return list
  }, [sort])

  const playEntry = (e: ChartEntry) => {
    const t = getTrack(e.trackId)
    play({
      id: e.trackId,
      title: e.title,
      credits: e.credits,
      cover: e.cover,
      coverUrl: t?.coverUrl ?? e.coverUrl,
      durationSec: t?.durationSec ?? 18,
      audioUrl: t?.audioUrl ?? '/audio/gul-demo.wav',
      waveform: t?.waveform,
      releaseId: e.releaseId,
    })
    toast(`Играет «${e.title}»`)
  }

  const refresh = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast('Чарт пересчитан')
    }, 800)
  }

  const playsLabel = sort === 'day' ? 'за 24ч' : 'прослуш.'
  const playsValue = (e: ChartEntry) => (sort === 'day' ? e.plays24 : e.playsWeek)

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end gap-6">
        <div>
          <div className="eyebrow">неделя 11–17 августа</div>
          <h1 className="text-[clamp(2.25rem,5.5vw,3.5rem)] font-black uppercase leading-[0.95] [font-stretch:66%]">Чарт ГУЛа</h1>
          <p className="max-w-[52ch] text-[0.9375rem] text-ink-2">
            Позиция считается по прослушиваниям и средней оценке РЗТ. Фиты идут двумя карточками, не одной — каждый автор кликабелен.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="seg">
            {filters.map((f) => (
              <button key={f.key} type="button" className={cn(sort === f.key && 'on')} onClick={() => setSort(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
          <button type="button" className="ghost" onClick={refresh}>
            <RotateCw width={14} height={14} /> Обновить
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[36px_44px_minmax(0,1fr)_112px_84px_36px] items-center gap-4 border-b border-ink px-2 pb-2 font-mono text-[0.625rem] uppercase tracking-[0.09em] text-ink-3 md:grid-cols-[44px_48px_minmax(0,1fr)_132px_96px_92px_36px]">
        <div className="text-right">#</div>
        <div />
        <div>трек и все авторы</div>
        <div>оценка</div>
        <div className="text-right">{playsLabel}</div>
        <div className="mv hidden text-right md:block">за неделю</div>
        <div />
      </div>

      <div>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[36px_44px_minmax(0,1fr)_112px_84px_36px] items-center gap-4 border-b border-rule-soft px-2 py-3 md:grid-cols-[44px_48px_minmax(0,1fr)_132px_96px_92px_36px]">
                <div className="skel h-5" />
                <div className="skel h-12" />
                <div>
                  <div className="skel h-4 w-[58%]" />
                  <div className="skel mt-1.5 h-3 w-[36%]" />
                </div>
                <div className="skel h-3.5" />
                <div className="skel h-3.5" />
                <div className="skel mv hidden h-3.5 md:block" />
                <div />
              </div>
            ))
          : rows.map((e, i) => {
              const now = current.id === e.trackId && playing
              return (
                <div
                  key={e.trackId}
                  className={cn(
                    'group relative grid grid-cols-[36px_44px_minmax(0,1fr)_112px_84px_36px] items-center gap-4 border-b border-rule-soft px-2 py-3 transition-colors hover:bg-paper-2 md:grid-cols-[44px_48px_minmax(0,1fr)_132px_96px_92px_36px]',
                    now && 'bg-paper-2',
                  )}
                >
                  <div className={cn('tabnum text-right font-mono text-[1.375rem] font-semibold text-ink-3 transition-colors group-hover:text-red', now && 'text-red')}>
                    {i + 1}
                  </div>
                  <button type="button" onClick={() => playEntry(e)} aria-label={`Слушать ${e.title}`}>
                    <Cover cover={e.cover} coverUrl={e.coverUrl} className="h-12 w-12" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center truncate text-[1.0625rem] font-bold [font-stretch:84%]">
                      <Link href={`/release/${e.releaseId}`} className="truncate hover:text-red">
                        {e.title}
                      </Link>
                      {now && (
                        <span className="eq">
                          <i /><i /><i />
                        </span>
                      )}
                    </div>
                    <Credits credits={e.credits} />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <b className="tabnum font-mono text-[1.0625rem] font-semibold">{e.score.toFixed(1)}</b>
                      <small className="font-mono text-[0.625rem] text-ink-3">{fmt(e.votes)} оц.</small>
                    </div>
                    <div className="relative mt-1.5 h-[3px] overflow-hidden bg-paper-3">
                      <i className="absolute inset-y-0 left-0 w-full origin-left bg-ink" style={{ transform: `scaleX(${e.score / 10})` }} />
                    </div>
                  </div>
                  <div className="tabnum text-right font-mono text-[0.875rem] text-ink-2">{fmt(playsValue(e))}</div>
                  <div className="hidden md:block">
                    <Move move={e.move} />
                  </div>
                  <button
                    type="button"
                    onClick={() => playEntry(e)}
                    aria-label={`Слушать ${e.title}`}
                    className="grid h-7 w-7 place-items-center rounded-[2px] text-ink-3 opacity-0 transition-all hover:bg-ink hover:text-paper group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    <Play width={13} height={13} />
                  </button>
                </div>
              )
            })}
      </div>
    </>
  )
}
