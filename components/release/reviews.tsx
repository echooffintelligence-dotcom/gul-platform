import { Avatar } from '@/components/shared/art'
import type { Review } from '@/lib/data'

export function Reviews({ reviews }: { reviews: Review[] }) {
  return (
    <div>
      {reviews.map((r) => (
        <article key={r.id} className="grid grid-cols-[44px_1fr] gap-4 border-b border-rule-soft py-4">
          <Avatar initials={r.initials} color={r.color} className="h-11 w-11 text-sm" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-[0.9375rem]">{r.author}</b>
              <span className="rounded-[2px] bg-ink px-1.5 font-mono text-[0.75rem] text-paper">{r.score.toFixed(1)}</span>
              <span className="eyebrow">{r.when}</span>
            </div>
            <p className="mt-1 max-w-[70ch] text-pretty text-[0.9375rem] text-ink-2">{r.text}</p>
          </div>
        </article>
      ))}
    </div>
  )
}
