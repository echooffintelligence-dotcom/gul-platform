'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Layers, Podcast, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/', label: 'Чарт', icon: BarChart3, match: (p: string) => p === '/' },
  { href: '/search', label: 'Поиск', icon: Search, match: (p: string) => p.startsWith('/search') },
  { href: '/podcasts', label: 'Подкасты', icon: Podcast, match: (p: string) => p.startsWith('/podcast') },
  { href: '/account', label: 'Кабинет', icon: Layers, match: (p: string) => p.startsWith('/account') },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[57px] border-t border-ink bg-paper md:hidden">
      {items.map(({ href, label, icon: Icon, match }) => {
        const on = match(pathname)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.06em]',
              on ? 'text-red' : 'text-ink-3',
            )}
          >
            <Icon width={18} height={18} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
