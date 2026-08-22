'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, Disc3 } from 'lucide-react'
import { Avatar, Cover } from '@/components/shared/art'
import { useReleases, gztAverage } from '@/components/providers/release-provider'
import { GztRating } from './gzt-rating'
import { TrackList } from './track-list'
import { DiscManager } from './disc-manager'
import { TrackFactsPanel } from './track-facts-panel'
import { AudioVisualizer } from '@/components/player/audio-visualizer'
import { RepostButton } from '@/components/social/repost-button'
import { CreatorSuite } from '@/components/creator/creator-suite'
import { Reviews } from './reviews'
import { fmt, getArtist, mmss, gztCertification, type Release } from '@/lib/data'

export function ReleaseView({ releaseId, release: initialRelease }: { releaseId: string; release?: Release }) {
  const { getRelease, getTrack, hydrated } = useReleases()
  const [showVisualizer, setShowVisualizer] = useState(true)
  const release = getRelease(releaseId) ?? initialRelease
  if (!release) return <div className="mx-auto max-w-[1180px] px-4 py-16 font-mono text-sm text-ink-3 sm:px-12">{hydrated ? 'Релиз не найден.' : 'Загружаем локальный каталог…'}</div>
  const tracks = release.trackIds.map((id) => getTrack(id)).filter((track): track is NonNullable<typeof track> => Boolean(track))

  // Диски показываем только когда автор их задал; иначе релиз остаётся одним списком.
  const discs = (release.discs ?? [])
    .map((disc) => ({ ...disc, tracks: disc.trackIds.map((id) => getTrack(id)).filter((track): track is NonNullable<typeof track> => Boolean(track)) }))
    .filter((disc) => disc.tracks.length > 0)
  const artistsResolved = release.artistIds.map((id) => getArtist(id)).filter((artist): artist is NonNullable<typeof artist> => Boolean(artist))
  const totalSec = tracks.reduce((sum, track) => sum + track.durationSec, 0)
  const factsTrack = tracks.find((track) => track.facts)
  const audienceAverage = gztAverage(release.distribution)
  const rated = release.votes > 0
  const gzt90 = audienceAverage * 9
  const certification = gztCertification(gzt90)
  const nominationLabels = { track_of_month: '👑 Трек месяца', track_of_year: '👑 Трек года', cover_of_month: '✦ Обложка месяца', album_of_year: '🏆 Альбом года' } as const

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-12 sm:pb-24">
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
        <div className="grid gap-4 md:sticky md:top-0">
          <Cover cover={release.cover} coverUrl={release.coverUrl} className="aspect-square w-full" />
          <div className="border border-ink p-4">
            <div className="eyebrow">средняя оценка слушателей · ГЗТ</div>
            {rated ? (
              <>
                <div className="flex items-baseline">
                  <span className="tabnum font-mono text-[2.75rem] font-semibold leading-none tracking-[-0.03em]">{audienceAverage.toFixed(2)}</span>
                  <span className="font-mono text-sm text-ink-3">/10 · {gzt90.toFixed(1)}/90</span>
                </div>
                <div className="eyebrow mt-1">{fmt(release.votes)} оценок · {release.reviewCount} рецензий</div>
              </>
            ) : (
              <p className="mt-2 text-[0.9375rem] text-ink-2">Оценок пока нет. Стань первым, кто разберёт релиз по критериям.</p>
            )}
          </div>
          <GztRating releaseId={release.id} />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2"><div className="eyebrow">{release.kind} · {release.year}</div><span className={certification === 'diamond' ? 'chip done !border-accent-1/50 !text-accent-1' : certification === 'gold' ? 'chip !border-accent-hot/40 !text-accent-hot' : 'chip'}>{certification === 'diamond' ? '💎 Бриллиант ГУЛА' : certification === 'gold' ? '🏆 Золотой релиз' : '📦 Underground / Свежий звук'}</span>{release.nomination && <span className="chip !border-accent-hot/45 !bg-accent-hot/10 !text-accent-hot shadow-[0_0_18px_rgba(232,121,249,.18)]">{nominationLabels[release.nomination]}</span>}</div>
          <div className="flex flex-wrap items-start justify-between gap-3"><h1 className="text-[clamp(2rem,4.4vw,3rem)] font-black uppercase leading-[0.94] [font-stretch:66%]">{release.title}</h1><RepostButton releaseId={release.id} title={release.title} /></div>

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
          </div>

          <div className="mt-5 flex items-center justify-between gap-3"><div className="eyebrow">живой спектр · web audio</div><button type="button" className="ghost !px-3 !py-1.5 !text-xs" onClick={() => setShowVisualizer((value) => !value)}>{showVisualizer ? 'Скрыть визуализатор' : 'Показать визуализатор'}</button></div>
          {showVisualizer && <AudioVisualizer />}
          <div className="section-h"><h3>Треки</h3><span className="line" /><span className="eyebrow">все авторы кликабельны</span></div>
          {discs.length > 0 ? (
            // Релиз разбит на диски: каждый со своим заголовком и сквозной нумерацией внутри.
            discs.map((disc) => (
              <section key={disc.id} className="mb-6">
                <div className="mb-1 flex items-center gap-2 px-2 pt-2">
                  <Disc3 className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                  <h4 className="text-[0.8125rem] font-semibold text-ink-2">{disc.title}</h4>
                  <span className="ml-auto font-mono text-[0.65rem] text-ink-3">{disc.tracks.length}</span>
                </div>
                <TrackList tracks={disc.tracks} />
              </section>
            ))
          ) : (
            <TrackList tracks={tracks} />
          )}
          <TrackFactsPanel track={factsTrack} />
          <DiscManager release={release} />
          <CreatorSuite releaseId={release.id} releaseTitle={release.title} />

          <div className="section-h"><h3>Рецензии</h3><span className="line" /><span className="eyebrow">{release.reviewCount}</span></div>
          <Reviews reviews={release.reviews} />

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
