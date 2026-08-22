'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Quote, Search as SearchIcon } from 'lucide-react'
import { usePlayer, toNowPlaying } from '@/components/providers/player-provider'
import { useReleases } from '@/components/providers/release-provider'
import { Avatar, Cover } from '@/components/shared/art'
import { AiBadge } from '@/components/shared/ai-badge'
import { TrackArt } from '@/components/shared/track-art'
import { TrackTitle } from '@/components/shared/track-title'
import { searchCatalog } from '@/lib/search'
import { fmt, tracks as seedTracks, type Track } from '@/lib/data'
import { cn } from '@/lib/utils'

export function SearchView() {
  const params = useSearchParams()
  const router = useRouter()
  const { customTracks, releases, getRelease } = useReleases()
  const { playTrack, currentTrack, isPlaying, pause, resume } = usePlayer()

  const initial = params.get('q') ?? ''
  const [query, setQuery] = useState(initial)
  useEffect(() => { setQuery(initial) }, [initial])

  const pool = useMemo<Track[]>(() => {
    const merged = new Map<string, Track>()
    for (const track of seedTracks) merged.set(track.id, track)
    for (const track of customTracks) merged.set(track.id, track)
    return Array.from(merged.values())
  }, [customTracks])

  const results = useMemo(() => searchCatalog({ query, tracks: pool, releases }), [query, pool, releases])

  const activate = (track: Track) => {
    if (currentTrack.id === track.id) {
      if (isPlaying) pause()
      else resume()
      return
    }
    playTrack(toNowPlaying(track))
  }

  const trimmed = query.trim()

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-12 sm:pb-24">
      <div className="eyebrow">поиск</div>
      <h1 className="mt-1 text-[clamp(1.9rem,4vw,2.6rem)] font-black uppercase leading-[0.98] [font-stretch:70%]">Найти в ГУЛе</h1>

      <form
        onSubmit={(event) => { event.preventDefault(); router.replace(`/search?q=${encodeURIComponent(trimmed)}`) }}
        className="mt-5 flex items-center gap-2 rounded-2xl border border-rule bg-paper-2 px-4 py-3 focus-within:border-[var(--accent-1-edge)]"
      >
        <SearchIcon className="h-4 w-4 shrink-0 text-ink-3" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="трек, артист, релиз, строчка из текста"
          aria-label="Поисковый запрос"
          className="w-full border-none bg-transparent text-base outline-none placeholder:text-ink-3"
        />
      </form>

      {trimmed.length < 2 ? (
        <p className="mt-6 text-sm text-ink-3">Введите хотя бы два символа. Поиск смотрит названия, артистов, жанры, теги и строки текста песен.</p>
      ) : results.total === 0 ? (
        <p className="mt-6 text-sm text-ink-3">По запросу «{trimmed}» ничего не нашлось.</p>
      ) : (
        <div className="mt-8 grid gap-10">
          {results.tracks.length > 0 && (
            <section>
              <div className="section-h !mt-0"><h3>Треки</h3><span className="line" /><span className="eyebrow">{results.tracks.length}</span></div>
              <div className="border-t border-rule">
                {results.tracks.map(({ track, matchedLine }) => {
                  const isCurrent = currentTrack.id === track.id
                  return (
                    <div
                      key={track.id}
                      onDoubleClick={() => activate(track)}
                      className={cn('track-row grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border-b border-rule-soft px-2 py-2 transition-colors hover:bg-paper-2', isCurrent && 'bg-paper-2')}
                    >
                      <TrackArt cover={track.cover} coverUrl={track.coverUrl} title={track.title} isCurrent={isCurrent} isPlaying={isCurrent && isPlaying} onToggle={() => activate(track)} className="h-11 w-11" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <TrackTitle
                            title={track.title}
                            credits={track.credits}
                            featuring={track.featuring}
                            stacked
                            className="min-w-0 flex-1"
                            titleClassName={cn('text-[0.9375rem] font-semibold', isCurrent && 'text-accent-1')}
                            artistClassName="text-[0.75rem] text-ink-3"
                          />
                          {track.isAiGenerated && <AiBadge compact />}
                        </div>
                        {/* Совпадение по тексту показываем строкой — иначе непонятно, почему трек нашёлся. */}
                        {matchedLine && (
                          <p className="mt-1 flex items-start gap-1.5 font-mono text-[0.68rem] text-ink-3">
                            <Quote className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                            <span className="line-clamp-1 italic">{matchedLine}</span>
                          </p>
                        )}
                      </div>
                      <span className="tabnum shrink-0 font-mono text-xs text-ink-3">{track.duration}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {results.artists.length > 0 && (
            <section>
              <div className="section-h !mt-0"><h3>Артисты</h3><span className="line" /><span className="eyebrow">{results.artists.length}</span></div>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {results.artists.map(({ artist }) => (
                  <li key={artist.id}>
                    <Link href={`/artist/${artist.id}`} className="flex items-center gap-3 rounded-xl border border-rule bg-paper-2 p-3 transition-colors hover:border-[var(--accent-1-edge)] hover:bg-paper-3">
                      <Avatar initials={artist.initials} color={artist.color} className="h-11 w-11 shrink-0 rounded-full text-sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{artist.name}</span>
                        <span className="block truncate font-mono text-[0.62rem] text-ink-3">{fmt(artist.monthly)} слушателей</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.releases.length > 0 && (
            <section>
              <div className="section-h !mt-0"><h3>Релизы</h3><span className="line" /><span className="eyebrow">{results.releases.length}</span></div>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {results.releases.map(({ release }) => (
                  <li key={release.id}>
                    <Link href={`/release/${release.id}`} className="group grid gap-2">
                      <Cover cover={release.cover} coverUrl={release.coverUrl ?? getRelease(release.id)?.coverUrl} className="aspect-square w-full transition-transform group-hover:-translate-y-1" />
                      <span>
                        <span className="block truncate text-sm group-hover:text-accent-1">{release.title}</span>
                        <span className="block font-mono text-[0.62rem] text-ink-3">{release.kind} · {release.year}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
