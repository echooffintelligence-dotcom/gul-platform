'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { BadgeCheck, Pause, Play, Sparkles, UserCheck, UserPlus } from 'lucide-react'
import { Avatar, Cover } from '@/components/shared/art'
import { Credits } from '@/components/shared/credits'
import { AiBadge } from '@/components/shared/ai-badge'
import { ArtistLinks } from '@/components/artist/artist-links'
import { usePlayer } from '@/components/providers/player-provider'
import { useReleases } from '@/components/providers/release-provider'
import { useSocial } from '@/components/providers/social-provider'
import { similarArtists } from '@/lib/recommend'
import { artists, fmt, mmss, type Artist, type Track } from '@/lib/data'
import { cn } from '@/lib/utils'

export function ArtistView({ artist }: { artist: Artist }) {
  const { playTrack, currentTrack, isPlaying, pause, resume } = usePlayer()
  const { isFollowing, toggleFollow } = useSocial()
  const { getRelease, getTrack } = useReleases()
  const following = isFollowing(artist.id)

  const activateTrack = (track: Track) => {
    if (currentTrack.id === track.id) {
      if (isPlaying) pause()
      else resume()
      return
    }
    playTrack({
      id: track.id, title: track.title, credits: track.credits, featuring: track.featuring, cover: track.cover, coverUrl: track.coverUrl,
      durationSec: track.durationSec, audioUrl: track.audioUrl ?? '/audio/gul-demo.wav', waveform: track.waveform,
      releaseId: track.releaseId, isAiGenerated: track.isAiGenerated,
    })
  }

  const releases = artist.releaseIds.map((id) => getRelease(id)).filter((release): release is NonNullable<typeof release> => Boolean(release))
  const topTracks = releases
    .flatMap((release) => release.trackIds)
    .map((id) => getTrack(id))
    .filter((track): track is Track => Boolean(track))
    .sort((left, right) => right.plays - left.plays)
    .slice(0, 5)

  // Похожие артисты считаются по пересечению жанров, тегов и общих участников.
  const similar = useMemo(
    () => similarArtists({ artist, artists, getRelease, getTrack }),
    [artist, getRelease, getTrack],
  )

  return (
    <div>
      {/* шапка артиста */}
      <header className="border-b border-ink bg-ink text-paper">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-8 sm:flex-row sm:items-end sm:gap-8 sm:px-12 sm:py-12">
          <Avatar initials={artist.initials} color={artist.color} className="h-28 w-28 shrink-0 text-3xl sm:h-36 sm:w-36 sm:text-4xl" />
          <div className="min-w-0 flex-1">
            <div className="eyebrow text-paper/60">исполнитель · {artist.city}</div>
            <h1 className="flex items-center gap-2 font-mono text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">
              <span className="text-balance">{artist.name}</span>
              {artist.verified && <BadgeCheck className="h-6 w-6 shrink-0 text-accent-b sm:h-8 sm:w-8" aria-label="подтверждён" />}
            </h1>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 font-mono text-sm text-paper/70">
              <span><span className="tabnum text-paper">{fmt(artist.monthly)}</span> слушателей / мес</span>
              <span>средний ГЗТ <span className="tabnum text-paper">{artist.avg.toFixed(2)}</span></span>
              <span><span className="tabnum text-paper">{artist.tracks}</span> треков · с {artist.since}</span>
            </div>

            <button
              type="button"
              onClick={() => toggleFollow(artist.id)}
              className={following
                ? 'mt-5 inline-flex items-center gap-2 border border-cyan-200/45 bg-cyan-300/10 px-3 py-2 font-mono text-xs text-cyan-50'
                : 'mt-5 inline-flex items-center gap-2 border border-paper/35 px-3 py-2 font-mono text-xs text-paper transition-colors hover:bg-paper hover:text-ink'}
            >
              {following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
              {following ? 'Вы подписаны' : 'Подписаться'}
            </button>

            <ArtistLinks artistId={artist.id} className="mt-4" />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-8 px-4 py-8 sm:px-12 sm:pb-24 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
        {/* левая колонка — популярное + релизы */}
        <div className="grid gap-10">
          <section>
            <h2 className="eyebrow mb-3">популярное</h2>
            <ol className="border-t border-ink-1">
              {topTracks.map((track, index) => {
                const isCurrent = currentTrack.id === track.id
                const isThisPlaying = isCurrent && isPlaying
                return (
                  <li key={track.id} className={cn('group flex items-center gap-4 border-b border-ink-1 py-3', isCurrent && 'is-selected rounded-lg px-2')}>
                    <button
                      type="button"
                      onClick={() => activateTrack(track)}
                      aria-label={`Воспроизвести ${track.title}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center border border-ink text-ink transition-colors hover:bg-ink hover:text-paper"
                    >
                      {isThisPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
                    </button>
                    <span className="tabnum w-5 shrink-0 text-center font-mono text-sm text-ink-3">{index + 1}</span>
                    <Cover cover={track.cover} coverUrl={track.coverUrl} className={cn('h-10 w-10 shrink-0', isCurrent && 'is-selected-cover')} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('truncate font-mono text-sm', isCurrent && 'text-accent-r')}>{track.title}</span>
                        {track.isAiGenerated && <AiBadge compact />}
                      </div>
                      <Credits credits={track.credits} className="text-xs text-ink-3" />
                    </div>
                    <span className="tabnum hidden shrink-0 font-mono text-sm text-ink-3 sm:block">{fmt(track.plays)}</span>
                    <span className="tabnum shrink-0 font-mono text-sm text-ink-3">{track.duration ?? mmss(track.durationSec)}</span>
                  </li>
                )
              })}
            </ol>
          </section>

          <section>
            <h2 className="eyebrow mb-3">релизы</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {releases.map((release) => {
                const isCurrent = currentTrack.releaseId === release.id
                return (
                  <Link key={release.id} href={`/release/${release.id}`} className="group grid gap-2">
                    <Cover
                      cover={release.cover}
                      coverUrl={release.coverUrl}
                      className={cn('aspect-square w-full transition-transform group-hover:-translate-y-1', isCurrent && 'is-selected-cover')}
                    />
                    <div>
                      <div className={cn('truncate font-mono text-sm group-hover:text-accent-r', isCurrent && 'text-accent-r')}>{release.title}</div>
                      <div className="font-mono text-xs text-ink-3">{release.kind} · {release.year}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>

          {/* Слушателям также нравится */}
          {similar.length > 0 && (
            <section aria-labelledby="similar-title">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-accent-o" />
                <h2 id="similar-title" className="eyebrow !text-[var(--accent-o)]">слушателям также нравится</h2>
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {similar.map(({ item, reasons }) => (
                  <li key={item.id}>
                    <Link
                      href={`/artist/${item.id}`}
                      className="flex h-full items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3 transition-colors hover:border-violet-300/45 hover:bg-violet-300/[.07]"
                    >
                      <Avatar initials={item.initials} color={item.color} className="h-10 w-10 shrink-0 text-sm" />
                      <div className="min-w-0">
                        <div className="truncate font-mono text-sm">{item.name}</div>
                        {/* Показываем, почему артист попал в подборку — рекомендация без объяснения выглядит случайной. */}
                        <div className="truncate font-mono text-[.62rem] text-ink-3">{reasons[0] ?? 'близкое звучание'}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* правая колонка — досье */}
        <aside className="grid content-start gap-4 lg:border-l lg:border-ink-1 lg:pl-8">
          <div className="border border-ink p-4">
            <div className="eyebrow">досье</div>
            <dl className="mt-2 grid gap-2 font-mono text-sm">
              <div className="flex justify-between gap-4"><dt className="text-ink-3">город</dt><dd>{artist.city}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-3">на площадке с</dt><dd className="tabnum">{artist.since}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-3">привязан к</dt><dd>@{artist.account}</dd></div>
            </dl>
          </div>

          <div className="border border-ink-1 p-4">
            <div className="eyebrow">карточкой управляют</div>
            <ul className="mt-2 grid gap-1 font-mono text-sm">
              {artist.managedBy.map((manager) => (
                <li key={manager} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-accent-b" aria-hidden />
                  {manager}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
