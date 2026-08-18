import Link from 'next/link'
import { Fragment } from 'react'
import type { Credit } from '@/lib/data'
import { cn } from '@/lib/utils'

/**
 * Кликабельные авторы трека. Каждое имя — отдельная ссылка на страницу артиста.
 * Фиты разделяются знаком ×.
 */
export function Credits({ credits, className }: { credits: Credit[]; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {credits.map((c, i) => (
        <Fragment key={`${c.name}-${i}`}>
          {i > 0 && <span className="text-xs text-ink-3">×</span>}
          {c.artistId ? (
            <Link
              href={`/artist/${c.artistId}`}
              className="border-b border-transparent text-[0.8125rem] text-ink-2 transition-colors hover:border-red hover:text-red"
            >
              {c.name}
            </Link>
          ) : (
            <span className="text-[0.8125rem] text-ink-2">{c.name}</span>
          )}
          {c.role && <span className="role">{c.role}</span>}
        </Fragment>
      ))}
    </div>
  )
}
