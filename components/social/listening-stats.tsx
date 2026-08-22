'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Clock, Crown, Headphones } from 'lucide-react'
import { useReleases } from '@/components/providers/release-provider'
import { useSocial, monthKey } from '@/components/providers/social-provider'
import { Avatar, Cover } from '@/components/shared/art'
import { artists, tracks as seedTracks, type Track } from '@/lib/data'

/** «2 ч 14 мин» — читается лучше, чем 8040 секунд. */
function humanTime(seconds: number) {
  const minutes = Math.round(seconds / 60)
  if (minutes < 1) return 'меньше минуты'
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`
}

const MONTH_LABEL = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })

/**
 * Итоги месяца: сколько наслушано и кто в топе.
 *
 * Считается из локальной статистики, которую копит плеер. Пока слушали мало,
 * блок честно говорит об этом, а не показывает пустой топ.
 */
export function ListeningStats() {
  const { listenStats } = useSocial()
  const { customTracks } = useReleases()

  const month = monthKey()
  const forMonth = useMemo(() => listenStats[month] ?? {}, [listenStats, month])

  const pool = useMemo<Track[]>(() => {
    const merged = new Map<string, Track>()
    for (const track of seedTracks) merged.set(track.id, track)
    for (const track of customTracks) merged.set(track.id, track)
    return Array.from(merged.values())
  }, [customTracks])

  const totalSeconds = useMemo(() => Object.values(forMonth).reduce((sum, value) => sum + value, 0), [forMonth])

  const topTracks = useMemo(
    () => Object.entries(forMonth)
      .map(([trackId, seconds]) => ({ track: pool.find((item) => item.id === trackId), seconds }))
      .filter((entry): entry is { track: Track; seconds: number } => Boolean(entry.track))
      .sort((left, right) => right.seconds - left.seconds)
      .slice(0, 5),
    [forMonth, pool],
  )

  // Время трека делим между всеми его авторами, у кого есть карточка на ГУЛе.
  const topArtists = useMemo(() => {
    const totals = new Map<string, number>()
    for (const [trackId, seconds] of Object.entries(forMonth)) {
      const track = pool.find((item) => item.id === trackId)
      if (!track) continue
      const ids = new Set<string>()
      for (const credit of track.credits ?? []) if (credit.artistId) ids.add(credit.artistId)
      for (const id of ids) totals.set(id, (totals.get(id) ?? 0) + seconds)
    }
    return Array.from(totals.entries())
      .map(([artistId, seconds]) => ({ artist: artists.find((item) => item.id === artistId), seconds }))
      .filter((entry): entry is { artist: NonNullable<(typeof artists)[number]>; seconds: number } => Boolean(entry.artist))
      .sort((left, right) => right.seconds - left.seconds)
      .slice(0, 5)
  }, [forMonth, pool])

  const monthTitle = MONTH_LABEL.format(new Date())

  return (
    <section className="mt-8 grid gap-5" aria-label="Итоги месяца">
      <div className="section-h"><h3>Итоги месяца</h3><span className="line" /><span className="eyebrow">{monthTitle}</span></div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-rule bg-paper-2 p-4">
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-accent-1" />
            <div className="eyebrow">наслушано</div>
          </div>
          <div className="mt-3 text-3xl font-black [font-stretch:75%]">{humanTime(totalSeconds)}</div>
          <p className="mt-1 font-mono text-[0.62rem] text-ink-3">
            {totalSeconds === 0 ? 'Счётчик начнёт заполняться, как только вы что-нибудь послушаете.' : `${Object.keys(forMonth).length} треков в этом месяце`}
          </p>
        </div>

        <div className="rounded-2xl border border-rule bg-paper-2 p-4">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-accent-2" />
            <div className="eyebrow">топ артистов месяца</div>
          </div>
          {topArtists.length === 0 ? (
            <p className="mt-3 text-sm text-ink-3">Пока пусто. Топ соберётся сам из того, что вы слушаете.</p>
          ) : (
            <ol className="mt-3 grid gap-2">
              {topArtists.map(({ artist, seconds }, index) => (
                <li key={artist.id} className="flex items-center gap-3">
                  <span className="tabnum w-4 shrink-0 text-center font-mono text-sm text-ink-3">{index + 1}</span>
                  <Avatar initials={artist.initials} color={artist.color} className="h-8 w-8 shrink-0 rounded-full text-[0.6rem]" />
                  <Link href={`/artist/${artist.id}`} className="min-w-0 flex-1 truncate text-sm hover:text-accent-1">{artist.name}</Link>
                  <span className="shrink-0 font-mono text-[0.65rem] text-ink-3">{humanTime(seconds)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {topTracks.length > 0 && (
        <div className="rounded-2xl border border-rule bg-paper-2 p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent-1" />
            <div className="eyebrow">чаще всего слушали</div>
          </div>
          <ol className="mt-3 grid gap-2">
            {topTracks.map(({ track, seconds }, index) => (
              <li key={track.id} className="flex items-center gap-3">
                <span className="tabnum w-4 shrink-0 text-center font-mono text-sm text-ink-3">{index + 1}</span>
                <Cover cover={track.cover} coverUrl={track.coverUrl} className="h-8 w-8 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm">{track.title}</span>
                <span className="shrink-0 font-mono text-[0.65rem] text-ink-3">{humanTime(seconds)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
