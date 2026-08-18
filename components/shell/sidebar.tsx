'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Disc3, Layers, Mic2 } from 'lucide-react'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { Avatar } from '@/components/shared/art'
import { getArtist } from '@/lib/data'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/', label: 'Чарт', icon: BarChart3, match: (p: string) => p === '/' },
  { href: '/release/steklovata', label: 'Релиз', icon: Disc3, match: (p: string) => p.startsWith('/release') },
  { href: '/artist/yegeor', label: 'Артист', icon: Mic2, match: (p: string) => p.startsWith('/artist') },
  { href: '/account', label: 'Кабинет', icon: Layers, match: (p: string) => p.startsWith('/account') },
]

export function Sidebar() {
  const pathname = usePathname()
  const { cards, setActive } = useWorkspace()

  return (
    <aside className="glass-panel hidden min-h-0 flex-col gap-8 overflow-auto border-y-0 border-l-0 border-r border-white/10 px-4 py-6 md:flex">
      <nav className="flex flex-col gap-0.5">
        {nav.map(({ href, label, icon: Icon, match }) => {
          const on = match(pathname)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-[0.875rem] text-ink-2 transition-all duration-300 hover:translate-x-[3px] hover:bg-white/5 hover:text-ink',
                on && 'border border-cyan-300/20 bg-cyan-300/10 font-bold text-cyan-100 shadow-[0_0_22px_rgba(78,230,255,0.08)]',
              )}
            >
              <Icon width={16} height={16} />
              {label}
              {on && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-b shadow-[0_0_12px_var(--blue)]" />}
            </Link>
          )
        })}
      </nav>

      <div>
        <h4 className="mb-3 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-ink-3">Мои карточки</h4>
        <div className="flex flex-col gap-1">
          {cards.slice(0, 4).map((card) => {
            const content = <><Avatar initials={card.initials} color={card.color} className="h-[18px] w-[18px] text-[0.5rem]" />{card.name}</>
            const className = 'flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.8125rem] text-ink-2 transition-all duration-300 hover:bg-white/5 hover:text-cyan-100'
            return getArtist(card.id) ? (
              <Link key={card.id} href={`/artist/${card.id}`} onClick={() => setActive(card.id)} className={className}>{content}</Link>
            ) : (
              <button key={card.id} type="button" onClick={() => setActive(card.id)} className={className}>{content}</button>
            )
          })}
          <Link href="/account" className="pt-1 text-left font-mono text-[0.6875rem] text-ink-3 transition-colors hover:text-ink">
            + 49 ещё
          </Link>
        </div>
      </div>

      <div>
        <h4 className="mb-3 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-ink-3">Слушаю</h4>
        <div className="flex flex-col gap-1">
          {[
            { c: 'var(--blue)', n: 'плагг-подвал' },
            { c: 'var(--red)', n: 'кассетный чарт' },
            { c: 'oklch(42% 0.13 300)', n: 'ночная смена' },
          ].map((p) => (
            <button key={p.n} type="button" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.8125rem] text-ink-2 transition-all duration-300 hover:bg-white/5 hover:text-cyan-100">
              <span className="h-[18px] w-[18px] rounded-[2px]" style={{ background: p.c }} />
              {p.n}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
