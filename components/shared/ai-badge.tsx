import { cn } from '@/lib/utils'

/**
 * Маркировка треков, созданных нейросетями (Suno, Udio и подобные).
 *
 * Полупрозрачный бейдж: он должен читаться, но не спорить за внимание
 * с названием трека. Показывается в карточке, чарте и плеере.
 */
export function AiBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span
      title="Трек создан с помощью ИИ"
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border border-accent-2/35 bg-accent-2/15 font-mono uppercase tracking-[.08em] text-accent-2/90 backdrop-blur-sm',
        compact ? 'px-1.5 py-0 text-[.5rem]' : 'px-2 py-0.5 text-[.55rem]',
        className,
      )}
    >
      <span aria-hidden>🤖</span>
      <span>AI</span>
      <span className="sr-only">Трек создан с помощью искусственного интеллекта</span>
    </span>
  )
}
