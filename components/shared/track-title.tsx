import Link from 'next/link'
import type { Credit } from '@/lib/data'
import { artists } from '@/lib/data'
import { cn } from '@/lib/utils'

type TrackTitleProps = {
  title: string
  credits: Credit[]
  featuring?: string[]
  trackHref?: string
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
  return artist ? <Link href={`/artist/${artist.id}`} className={cn('transition-colors hover:text-red hover:underline', className)}>{name}</Link> : <span className={className}>{name}</span>
}

function ArtistList({ names, className }: { names: string[]; className?: string }) {
  return <>{names.map((name, index) => <span key={`${name}-${index}`}>{index > 0 && <span className="text-ink-3"> &amp; </span>}<ArtistName name={name} className={className} /></span>)}</>
}

/**
 * Каноничная строка трека: «Артист feat. Приглашённый — Название».
 * Ники получают ссылку только когда совпадают с карточкой артиста ГУЛа.
 * Для старых записей роль `фит` в credits остаётся совместимым fallback.
 */
export function TrackTitle({ title, credits, featuring, trackHref, className, artistClassName, titleClassName }: TrackTitleProps) {
  const mainArtists = credits.filter((credit) => !isFeaturedCredit(credit) && !isProductionCredit(credit)).map((credit) => credit.name)
  const fallbackArtists = mainArtists.length ? mainArtists : credits.filter((credit) => !isProductionCredit(credit)).map((credit) => credit.name)
  const legacyFeaturing = credits.filter(isFeaturedCredit).map((credit) => credit.name)
  const featuredArtists = (featuring?.length ? featuring : legacyFeaturing).map((name) => name.trim()).filter(Boolean)

  return <span className={cn('min-w-0', className)}>
    <ArtistList names={fallbackArtists} className={artistClassName} />
    {featuredArtists.length > 0 && <><span className="text-ink-3"> feat. </span><ArtistList names={featuredArtists} className={artistClassName} /></>}
    <span className="text-ink-3"> — </span>
    {trackHref ? <Link href={trackHref} className={cn('transition-colors hover:text-red', titleClassName)}>{title}</Link> : <span className={titleClassName}>{title}</span>}
  </span>
}
