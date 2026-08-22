'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { BadgeCheck, Play, Shuffle, Sparkles, UserCheck, UserPlus } from 'lucide-react'
import { Avatar, Cover } from '@/components/shared/art'
import { AiBadge } from '@/components/shared/ai-badge'
import { TrackArt, TrackIndex } from '@/components/shared/track-art'
import { TrackTitle } from '@/components/shared/track-title'
import { ArtistLinks } from '@/components/artist/artist-links'
import { usePlayer, toNowPlaying } from '@/components/providers/player-provider'
import { useReleases } from '@/components/providers/release-provider'
import { useSocial } from '@/components/providers/social-provider'
import { similarArtists } from '@/lib/recommend'
import { artists, fmt, mmss, type Artist, type Track } from '@/lib/data'
import { cn } from '@/lib/utils'

export function ArtistView({ artist }: { artist: Artist }) {
  const { playTrack, playCollection, currentTrack, isPlaying, pause, resume } = usePlayer()
  const { isFollowing, toggleFollow, profileFor } = useSocial()
  const { getRelease, getTrack } = useReleases()
  const following = isFollowing(artist.id)
  // Правки автора перекрывают данные каталога, но не заменяют их целиком.
  const profile = profileFor(artist.id)
  const bio = profile.bio ?? artist.bio
  const avatarUrl = profile.avatarUrl || artist.avatarUrl
  const bannerUrl = profile.bannerUrl || artist.bannerUrl

  const activateTrack = (track: Track) => {
    if (currentTrack.id === track.id) {
      if (isPlaying) pause()
      else resume()
      return
    }
    playTrack(toNowPlaying(track))
  }

  const releases = artist.releaseIds.map((id) => getRelease(id)).filter((release): release is NonNullable<typeof release> => Boolean(release))
  const allTracks = releases
    .flatMap((release) => release.trackIds)
    .map((id) => getTrack(id))
    .filter((track): track is Track => Boolean(track))
  const topTracks = [...allTracks].sort((left, right) => right.plays - left.plays).slice(0, 5)

  const similar = useMemo(() => similarArtists({ artist, artists, getRelease, getTrack }), [artist, getRelease, getTrack])

  function playAll(shuffled = false) {
    if (allTracks.length === 0) return
    const queue = shuffled ? [...allTracks].sort(() => Math.random() - 0.5) : [...allTracks].sort((a, b) => b.plays - a.plays)
    playCollection(queue.map(toNowPlaying))
  }

  return (
    <div>
      {/* Шапка артиста: обложка-баннер, крупная аватарка, описание. */}
      <header className="relative overflow-hidden border-b border-rule">
        <div aria-hidden className="absolute inset-0">
          {bannerUrl ? (
            <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(bannerUrl)})` }} />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,var(--accent-2-soft),transparent_55%),linear-gradient(300deg,var(--accent-1-soft),transparent_60%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-paper via-paper/70 to-paper/25" />
        </div>

        <div className="relative mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:gap-8 sm:px-12 sm:py-14">
          {avatarUrl ? (
            <span
              aria-hidden
              className="h-32 w-32 shrink-0 rounded-full border border-[var(--glass-border)] bg-cover bg-center shadow-[0_18px_50px_rgba(0,0,0,.35)] sm:h-40 sm:w-40"
              style={{ backgroundImage: `url(${JSON.stringify(avatarUrl)})` }}
            />
          ) : (
            <Avatar initials={artist.initials} color={artist.color} className="h-32 w-32 shrink-0 rounded-full text-4xl shadow-[0_18px_50px_rgba(0,0,0,.35)] sm:h-40 sm:w-40 sm:text-5xl" />
          )}

          <div className="min-w-0 flex-1">
            <div className="eyebrow">исполнитель</div>
            <h1 className="flex items-center gap-2 font-mono text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">
              <span className="text-balance">{artist.name}</span>
              {artist.verified && <BadgeCheck className="h-6 w-6 shrink-0 text-accent-1 sm:h-8 sm:w-8" aria-label="подтверждён" />}
            </h1>

            {bio && <p className="mt-3 max-w-[62ch] text-sm text-ink-2">{bio}</p>}

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 font-mono text-sm text-ink-2">
              <span><span className="tabnum text-ink">{fmt(artist.monthly)}</span> слушателей / мес</span>
              <span>средний ГЗТ <span className="tabnum text-ink">{artist.avg.toFixed(2)}</span></span>
              <span><span className="tabnum text-ink">{artist.tracks}</span> треков · с {artist.since}</span>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => playAll(false)} className="solid" disabled={allTracks.length === 0}>
                <Play className="h-4 w-4" fill="currentColor" /> Слушать
              </button>
              <button type="button" onClick={() => playAll(true)} className="ghost" disabled={allTracks.length === 0}>
                <Shuffle className="h-4 w-4" /> Вперемешку
              </button>
              {/* Кнопка подписки читается в любой теме: заливка акцентом, а не полупрозрачный текст. */}
              <button
                type="button"
                onClick={() => toggleFollow(artist.id)}
                aria-pressed={following}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[0.8125rem] font-bold transition-colors',
                  following
                    ? 'border-[var(--accent-1-edge)] bg-accent-1 text-on-accent hover:bg-[color-mix(in_srgb,var(--accent-1)_85%,white)]'
                    : 'border-rule bg-paper-2 text-ink hover:border-[var(--accent-1-edge)] hover:bg-paper-3',
                )}
              >
                {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {following ? 'Вы подписаны' : 'Подписаться'}
              </button>
            </div>

            <ArtistLinks artistId={artist.id} className="mt-4" />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-8 px-4 py-8 sm:px-12 sm:pb-24 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
        <div className="grid gap-10">
          <section>
            <h2 className="eyebrow mb-3">популярное</h2>
            <ol className="border-t border-rule">
              {topTracks.map((track, index) => {
                const isCurrent = currentTrack.id === track.id
                const isThisPlaying = isCurrent && isPlaying
                return (
                  <li
                    key={track.id}
                    onDoubleClick={() => activateTrack(track)}
                    className={cn('track-row grid grid-cols-[22px_44px_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg border-b border-rule-soft px-2 py-2 transition-colors hover:bg-paper-2', isCurrent && 'bg-paper-2')}
                  >
                    <TrackIndex index={index + 1} className="text-center font-mono text-sm text-ink-3" />
                    <TrackArt
                      cover={track.cover}
                      coverUrl={track.coverUrl}
                      title={track.title}
                      isCurrent={isCurrent}
                      isPlaying={isThisPlaying}
                      onToggle={() => activateTrack(track)}
                      className="h-11 w-11"
                    />
                    <div className="flex min-w-0 items-center gap-2">
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
                      <div className={cn('truncate font-mono text-sm group-hover:text-accent-1', isCurrent && 'text-accent-1')}>{release.title}</div>
                      <div className="font-mono text-xs text-ink-3">{release.kind} · {release.year}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>

          {similar.length > 0 && (
            <section aria-labelledby="similar-title">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-accent-2" />
                <h2 id="similar-title" className="eyebrow">слушателям также нравится</h2>
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {similar.map(({ item, reasons }) => (
                  <li key={item.id}>
                    <Link
                      href={`/artist/${item.id}`}
                      className="flex h-full items-center gap-3 rounded-xl border border-rule bg-paper-2 p-3 transition-colors hover:border-[var(--accent-2-edge)] hover:bg-paper-3"
                    >
                      <Avatar initials={item.initials} color={item.color} className="h-10 w-10 shrink-0 rounded-full text-sm" />
                      <div className="min-w-0">
                        <div className="truncate font-mono text-sm">{item.name}</div>
                        {/* Показываем причину: рекомендация без объяснения выглядит случайной. */}
                        <div className="truncate font-mono text-[.62rem] text-ink-3">{reasons[0] ?? 'близкое звучание'}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="grid content-start gap-4 lg:border-l lg:border-rule lg:pl-8">
          <div className="rounded-2xl border border-rule bg-paper-2 p-4">
            <div className="eyebrow">досье</div>
            <dl className="mt-2 grid gap-2 font-mono text-sm">
              <div className="flex justify-between gap-4"><dt className="text-ink-3">на площадке с</dt><dd className="tabnum">{artist.since}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-3">релизов</dt><dd className="tabnum">{releases.length}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-3">треков</dt><dd className="tabnum">{artist.tracks}</dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  )
}
