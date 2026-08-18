'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Avatar, Cover } from '@/components/shared/art'
import { useReleases, rztAverage } from '@/components/providers/release-provider'
import { RztRating } from './rzt-rating'
import { RatingHistogram } from './rating-histogram'
import { TrackList } from './track-list'
import { Reviews } from './reviews'
import { fmt, getArtist, mmss, type Release } from '@/lib/data'

export function ReleaseView({ releaseId, release: initialRelease }: { releaseId: string; release?: Release }) {
  const { getRelease, getTrack, hydrated } = useReleases()
  const release = getRelease(releaseId) ?? initialRelease
  if (!release) return <div className="mx-auto max-w-[1180px] px-4 py-16 font-mono text-sm text-ink-3 sm:px-12">{hydrated ? 'Релиз не найден.' : 'Загружаем локальный каталог…'}</div>
  const tracks = release.trackIds.map((id) => getTrack(id)).filter((track): track is NonNullable<typeof track> => Boolean(track))
  const artistsResolved = release.artistIds.map((id) => getArtist(id)).filter((artist): artist is NonNullable<typeof artist> => Boolean(artist))
  const totalSec = tracks.reduce((sum, track) => sum + track.durationSec, 0)
  const audienceAverage = rztAverage(release.distribution)
  const rated = release.votes > 0

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-12 sm:pb-24">
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
        <div className="grid gap-4 md:sticky md:top-0">
          <Cover cover={release.cover} coverUrl={release.coverUrl} className="aspect-square w-full" />
          <div className="border border-ink p-4">
            <div className="eyebrow">средняя оценка слушателей · РЗТ</div>
            {rated ? (
              <>
                <div className="flex items-baseline">
                  <span className="tabnum font-mono text-[2.75rem] font-semibold leading-none tracking-[-0.03em]">{audienceAverage.toFixed(2)}</span>
                  <span className="font-mono text-sm text-ink-3">/10</span>
                </div>
                <div className="eyebrow mt-1">{fmt(release.votes)} оценок · {release.reviewCount} рецензий</div>
                <RatingHistogram distribution={release.distribution} />
              </>
            ) : (
              <p className="mt-2 text-[0.9375rem] text-ink-2">Оценок пока нет. Стань первым, кто разберёт релиз по критериям.</p>
            )}
          </div>
          <RztRating releaseId={release.id} />
        </div>

        <div>
          <div className="eyebrow">{release.kind} · {release.year}</div>
          <h1 className="text-[clamp(2rem,4.4vw,3rem)] font-black uppercase leading-[0.94] [font-stretch:66%]">{release.title}</h1>

          <div className="mt-3 inline-flex items-center gap-2 rounded-[2px] border border-ink py-[3px] pl-[3px] pr-2 text-[0.8125rem]">
            <span className="flex">
              {artistsResolved.map((artist, index) => <Avatar key={artist.id} initials={artist.initials} color={artist.color} className={`h-[22px] w-[22px] text-[0.625rem] ring-[1.5px] ring-paper ${index > 0 ? '-ml-1.5' : ''}`} />)}
            </span>
            <span>
              Совместный релиз:{' '}
              {artistsResolved.map((artist, index) => (
                <span key={artist.id}>
                  {index > 0 && ' и '}
                  <Link href={`/artist/${artist.id}`} className="border-b border-rule hover:border-red hover:text-red">{artist.name}</Link>
                </span>
              ))}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.75rem] text-ink-2">
            <div>{tracks.length} треков</div>
            <div>{mmss(totalSec)} мин</div>
            <div>Прослушивания <b className="text-ink">{fmt(release.plays)}</b></div>
            {release.weeksInChart && <div>В чарте <b className="text-ink">{release.weeksInChart} недели</b></div>}
            {release.label && <div>Лейбл <b className="text-ink">{release.label}</b></div>}
          </div>

          <div className="section-h"><h3>Треки</h3><span className="line" /><span className="eyebrow">все авторы кликабельны</span></div>
          <TrackList tracks={tracks} />

          <div className="section-h"><h3>Рецензии</h3><span className="line" /><span className="eyebrow">{release.reviewCount}</span></div>
          {release.reviews.length > 0 ? <Reviews reviews={release.reviews} /> : (
            <div className="border border-dashed border-rule p-6 text-center text-ink-2">
              <b className="mb-1 block [font-stretch:80%] text-ink">Рецензий пока нет</b>
              <p className="mx-auto max-w-[44ch] text-sm">Будь первым — разбор появится здесь сразу после публикации.</p>
            </div>
          )}

          <div className="section-h"><h3>Похожие релизы</h3><span className="line" /></div>
          <div className="border border-dashed border-rule p-6 text-center text-ink-2">
            <b className="mb-1 block [font-stretch:80%] text-ink">Пока не с чем сравнить</b>
            <p className="mx-auto mb-4 max-w-[44ch] text-sm">Рекомендации включатся, когда у релиза будет 2 000 оценок. Сейчас {fmt(release.votes)}.</p>
            <button type="button" className="ghost mx-auto"><Bell width={14} height={14} /> Сообщить, когда появятся</button>
          </div>
        </div>
      </div>
    </div>
  )
}
