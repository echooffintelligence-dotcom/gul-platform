import type { AvColor, CoverKey } from '@/lib/data'
import { cn } from '@/lib/utils'

export function Cover({ cover, coverUrl, className }: { cover: CoverKey; coverUrl?: string; className?: string }) {
  return coverUrl ? <span aria-hidden className={cn('cover', className)} style={{ backgroundImage: `url(${coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} /> : <span aria-hidden className={cn('cover', cover, className)} />
}

export function Avatar({
  initials,
  color = '',
  className,
}: {
  initials: string
  color?: AvColor
  className?: string
}) {
  return <span className={cn('av', color, className)}>{initials}</span>
}
