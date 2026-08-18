'use client'

import Link from 'next/link'
import { BadgeCheck, Play } from 'lucide-react'
import { Avatar, Cover } from '@/components/shared/art'
import { Credits } from '@/components/shared/credits'
import { usePlayer } from '@/components/providers/player-provider'
import { fmt, getRelease, getTrack, mmss, type Artist } from '@/lib/data'

export function ArtistView({ artist }: { artist: Artist }) {
  const { play, current, playing } = usePlayer()
  const releases = artist.releaseIds.map((id) => getRelease(id)).filter((r): r is NonNullable<typeof r> => Boolean(r))
  const topTracks = releases
    .flatMap((r) => r.trackIds)
    .map((id) => getTrack(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 5)

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
              <span>
                <span className="tabnum text-paper">{fmt(artist.monthly)}</span> слушателей / мес
              </span>
              <span>
                средний РЗТ <span className="tabnum text-paper">{artist.avg.toFixed(2)}</span>
              </span>
              <span>
                <span className="tabnum text-paper">{artist.tracks}</span> треков · с {artist.since}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-8 px-4 py-8 sm:px-12 sm:pb-24 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
        {/* левая колонка — популярное + релизы */}
        <div className="grid gap-10">
          <section>
            <h2 className="eyebrow mb-3">популярное</h2>
            <ol className="border-t border-ink-1">
              {topTracks.map((t, i) => {
                const isCur = current?.id === t.id
                return (
                  <li
                    key={t.id}
                    className="group flex items-center gap-4 border-b border-ink-1 py-3"
                  >
                    <button
                      type="button"
                      onClick={() => play({ id: t.id, title: t.title, credits: t.credits, cover: t.cover, durationSec: t.durationSec, audioUrl: t.audioUrl ?? '/audio/gul-demo.wav', releaseId: t.releaseId })}
                      aria-label={`Воспроизвести ${t.title}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center border border-ink text-ink transition-colors hover:bg-ink hover:text-paper"
                    >
                      {isCur && playing ? (
                        <span className="tabnum font-mono text-xs">||</span>
                      ) : (
                        <Play className="h-4 w-4" fill="currentColor" />
                      )}
                    </button>
                    <span className="tabnum w-5 shrink-0 text-center font-mono text-sm text-ink-3">{i + 1}</span>
                    <Cover cover={t.cover} className="h-10 w-10 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className={`truncate font-mono text-sm ${isCur ? 'text-accent-r' : ''}`}>{t.title}</div>
                      <Credits credits={t.credits} className="text-xs text-ink-3" />
                    </div>
                    <span className="tabnum hidden shrink-0 font-mono text-sm text-ink-3 sm:block">{fmt(t.plays)}</span>
                    <span className="tabnum shrink-0 font-mono text-sm text-ink-3">{t.duration ?? mmss(t.durationSec)}</span>
                  </li>
                )
              })}
            </ol>
          </section>

          <section>
            <h2 className="eyebrow mb-3">релизы</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {releases.map((r) => (
                <Link key={r.id} href={`/release/${r.id}`} className="group grid gap-2">
                  <Cover cover={r.cover} className="aspect-square w-full transition-transform group-hover:-translate-y-1" />
                  <div>
                    <div className="truncate font-mono text-sm group-hover:text-accent-r">{r.title}</div>
                    <div className="font-mono text-xs text-ink-3">
                      {r.kind} · {r.year}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* правая колонка — досье */}
        <aside className="grid content-start gap-4 lg:border-l lg:border-ink-1 lg:pl-8">
          <div className="border border-ink p-4">
            <div className="eyebrow">досье</div>
            <dl className="mt-2 grid gap-2 font-mono text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-3">город</dt>
                <dd>{artist.city}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-3">на площадке с</dt>
                <dd className="tabnum">{artist.since}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-3">привязан к</dt>
                <dd>@{artist.account}</dd>
              </div>
            </dl>
          </div>

          <div className="border border-ink-1 p-4">
            <div className="eyebrow">карточкой управляют</div>
            <ul className="mt-2 grid gap-1 font-mono text-sm">
              {artist.managedBy.map((m) => (
                <li key={m} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-accent-b" aria-hidden />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
