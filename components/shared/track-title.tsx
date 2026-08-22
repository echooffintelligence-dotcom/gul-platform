import Link from 'next/link'
import type { Credit } from '@/lib/data'
import { artists } from '@/lib/data'
import { cn } from '@/lib/utils'

type TrackTitleProps = {
  title: string
  credits: Credit[]
  featuring?: string[]
  trackHref?: string
  /**
   * true — название сверху, артисты отдельной строкой снизу (как в Spotify).
   * false — одна строка «Артист feat. Гость — Название».
   */
  stacked?: boolean
  className?: string
  artistClassName?: string
  titleClassName?: string
}

const isFeaturedCredit = (credit: Credit) => /^(feat\.?|фит)$/i.test(credit.role?.trim() ?? '')
const isProductionCredit = (credit: Credit) => /^(prod\.?|producer|прод)$/i.test(credit.role?.trim() ?? '')

function artistCard(name: string) {
  const normalized = name.trim().toLocaleLowerCase('ru-RU')
  return artists.find((artist) => artist.id.toLocaleLowerCase('ru-RU') === normalized || artist.name.toLocaleLowerCase('ru-RU') === normalized)
}

function ArtistName({ name, className }: { name: string; className?: string }) {
  const artist = artistCard(name)
  return artist
    ? <Link href={`/artist/${artist.id}`} className={cn('transition-colors hover:text-accent-1 hover:underline', className)}>{name}</Link>
    : <span className={className}>{name}</span>
}

function ArtistList({ names, className }: { names: string[]; className?: string }) {
  return <>{names.map((name, index) => <span key={`${name}-${index}`}>{index > 0 && <span className="opacity-60">, </span>}<ArtistName name={name} className={className} /></span>)}</>
}

/**
 * Строка трека: название и его авторы.
 *
 * Ники получают ссылку только когда совпадают с карточкой артиста ГУЛа.
 * Для старых записей роль `фит` в credits остаётся совместимым fallback.
 */
export function TrackTitle({ title, credits, featuring, trackHref, stacked = false, className, artistClassName, titleClassName }: TrackTitleProps) {
  const mainArtists = credits.filter((credit) => !isFeaturedCredit(credit) && !isProductionCredit(credit)).map((credit) => credit.name)
  const fallbackArtists = mainArtists.length ? mainArtists : credits.filter((credit) => !isProductionCredit(credit)).map((credit) => credit.name)
  const legacyFeaturing = credits.filter(isFeaturedCredit).map((credit) => credit.name)
  const featuredArtists = (featuring?.length ? featuring : legacyFeaturing).map((name) => name.trim()).filter(Boolean)
  const everyone = [...fallbackArtists, ...featuredArtists]

  const titleNode = trackHref
    ? <Link href={trackHref} className={cn('transition-colors hover:text-accent-1', titleClassName)}>{title}</Link>
    : <span className={titleClassName}>{title}</span>

  if (stacked) {
    return (
      <span className={cn('grid min-w-0', className)}>
        <span className="min-w-0 truncate">{titleNode}</span>
        <span className={cn('min-w-0 truncate', artistClassName)}>
          <ArtistList names={fallbackArtists} />
          {featuredArtists.length > 0 && <><span className="opacity-60">, </span><ArtistList names={featuredArtists} /></>}
          {everyone.length === 0 && <span className="opacity-60">неизвестный артист</span>}
        </span>
      </span>
    )
  }

  return (
    <span className={cn('min-w-0', className)}>
      <ArtistList names={fallbackArtists} className={artistClassName} />
      {featuredArtists.length > 0 && <><span className="text-ink-3"> feat. </span><ArtistList names={featuredArtists} className={artistClassName} /></>}
      <span className="text-ink-3"> — </span>
      {titleNode}
    </span>
  )
}
