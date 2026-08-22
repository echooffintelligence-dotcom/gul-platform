'use client'

import { useState } from 'react'
import { CalendarDays, Clock, Play, Podcast as PodcastIcon } from 'lucide-react'
import { usePlayer, toNowPlaying } from '@/components/providers/player-provider'
import { useToast } from '@/components/providers/toast-provider'
import { Cover } from '@/components/shared/art'
import { episodeAsTrack, episodeLength, podcasts, type Podcast } from '@/lib/podcasts'
import { cn } from '@/lib/utils'

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

export function PodcastsView() {
  const { playTrack, playCollection, currentTrack, isPlaying, pause, resume } = usePlayer()
  const { toast } = useToast()
  const [openId, setOpenId] = useState<string>(podcasts[0]?.id ?? '')

  const activeShow = podcasts.find((show) => show.id === openId) ?? podcasts[0]

  function playEpisode(show: Podcast, episodeId: string) {
    const episode = show.episodes.find((item) => item.id === episodeId)
    if (!episode) return
    if (currentTrack.id === episode.id) {
      if (isPlaying) pause()
      else resume()
      return
    }
    playTrack(toNowPlaying(episodeAsTrack(show, episode)))
  }

  function playShow(show: Podcast) {
    if (show.episodes.length === 0) return
    // Выпуски ставим в очередь от свежего к старому — так их обычно и слушают.
    playCollection(show.episodes.map((episode) => toNowPlaying(episodeAsTrack(show, episode))))
    toast(`Играет «${show.title}»`)
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-12 sm:pb-24">
      <div className="eyebrow">подкасты</div>
      <h1 className="mt-1 text-[clamp(1.9rem,4vw,2.6rem)] font-black uppercase leading-[0.98] [font-stretch:70%]">Разговоры о музыке</h1>
      <p className="mt-2 max-w-[60ch] text-sm text-ink-2">Выпуски проигрываются тем же плеером, что и треки: очередь, перемотка и комментарии по таймкоду работают так же.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
        {/* Список шоу */}
        <aside className="grid content-start gap-2">
          {podcasts.map((show) => {
            const selected = show.id === activeShow?.id
            return (
              <button
                key={show.id}
                type="button"
                onClick={() => setOpenId(show.id)}
                onDoubleClick={() => playShow(show)}
                aria-pressed={selected}
                title="Двойной клик — включить все выпуски"
                className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition-colors', selected ? 'is-selected border-rule bg-paper-3' : 'border-rule bg-paper-2 hover:bg-paper-3')}
              >
                <Cover cover={show.cover} coverUrl={show.coverUrl} className="h-12 w-12 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{show.title}</span>
                  <span className="block truncate font-mono text-[0.62rem] text-ink-3">{show.author} · {show.episodes.length} вып.</span>
                </span>
              </button>
            )
          })}
        </aside>

        {/* Выпуски выбранного шоу */}
        {activeShow && (
          <section aria-labelledby="show-title">
            <div className="flex flex-col gap-4 rounded-2xl border border-rule bg-paper-2 p-5 sm:flex-row sm:items-end">
              <Cover cover={activeShow.cover} coverUrl={activeShow.coverUrl} className="h-28 w-28 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <div className="eyebrow flex items-center gap-1.5"><PodcastIcon className="h-3 w-3" /> {activeShow.category}</div>
                <h2 id="show-title" className="mt-1 text-2xl font-bold">{activeShow.title}</h2>
                <p className="mt-1 font-mono text-xs text-ink-3">{activeShow.author}</p>
                <p className="mt-2 max-w-[60ch] text-sm text-ink-2">{activeShow.description}</p>
                <button type="button" onClick={() => playShow(activeShow)} className="solid mt-4">
                  <Play className="h-4 w-4" fill="currentColor" /> Слушать все выпуски
                </button>
              </div>
            </div>

            <ol className="mt-6 border-t border-rule">
              {activeShow.episodes.map((episode) => {
                const isCurrent = currentTrack.id === episode.id
                const isThisPlaying = isCurrent && isPlaying
                return (
                  <li
                    key={episode.id}
                    onDoubleClick={() => playEpisode(activeShow, episode.id)}
                    className={cn('track-row grid grid-cols-[44px_minmax(0,1fr)] items-start gap-3 rounded-lg border-b border-rule-soft px-2 py-3 transition-colors hover:bg-paper-2', isCurrent && 'bg-paper-2')}
                  >
                    <button
                      type="button"
                      onClick={() => playEpisode(activeShow, episode.id)}
                      aria-label={isThisPlaying ? `Пауза: ${episode.title}` : `Слушать ${episode.title}`}
                      className={cn('grid h-10 w-10 place-items-center rounded-full border border-rule transition-colors hover:border-[var(--accent-1-edge)] hover:bg-paper-3', isThisPlaying && 'border-[var(--accent-1-edge)] bg-accent-1 text-on-accent')}
                    >
                      <Play className="h-3.5 w-3.5" fill="currentColor" />
                    </button>
                    <div className="min-w-0">
                      <div className={cn('text-[0.9375rem] font-semibold', isCurrent && 'text-accent-1')}>
                        <span className="font-mono text-xs text-ink-3">№{episode.number}</span> {episode.title}
                      </div>
                      <p className="mt-1 max-w-[70ch] text-sm text-ink-2">{episode.summary}</p>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.65rem] text-ink-3">
                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {dateLabel(episode.publishedAt)}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {episodeLength(episode.durationSec)}</span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        )}
      </div>
    </div>
  )
}
