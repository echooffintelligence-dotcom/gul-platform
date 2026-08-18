'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { useToast } from '@/components/providers/toast-provider'
import { Avatar } from '@/components/shared/art'
import { ACCOUNT } from '@/lib/data'

export function WorkspaceSwitcher() {
  const { cards, active, activeId, setActive } = useWorkspace()
  const { toast } = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-3 rounded-[2px] border border-ink bg-paper py-1 pl-1 pr-3 transition-colors hover:bg-paper-3"
      >
        <Avatar initials={active.initials} color={active.color} className="h-8 w-8 text-sm" />
        <span className="hidden flex-col items-start leading-tight sm:flex">
          <span className="text-[0.8125rem] font-semibold">{active.name}</span>
          <span className="font-mono text-[0.625rem] text-ink-3">
            аккаунт {ACCOUNT.handle} · {ACCOUNT.totalCards} карточки
          </span>
        </span>
        <ChevronsUpDown width={14} height={14} className="text-ink-3" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-[60] w-80 border border-ink bg-paper shadow-[6px_6px_0_oklch(21%_0.021_62_/_0.12)]"
        >
          <div className="border-b border-rule px-4 py-3">
            <div className="eyebrow">карточки артиста</div>
            <p className="mt-0.5 text-[0.8125rem] text-ink-2">
              Все на одной почте <b className="text-ink">{ACCOUNT.email}</b>. Переключайся без выхода из аккаунта.
            </p>
          </div>

          <div className="max-h-[min(46dvh,340px)] overflow-auto py-2">
            {cards.map((c) => {
              const isActive = c.id === activeId
              return (
                <button
                  key={c.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => {
                    setActive(c.id)
                    setOpen(false)
                    toast(`Работаешь как «${c.name}»`)
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-paper-2 aria-checked:bg-paper-3"
                >
                  <Avatar initials={c.initials} color={c.color} className="h-8 w-8 text-sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{c.name}</span>
                    <span className="block font-mono text-[0.625rem] text-ink-3">
                      {c.role} · {c.tracks} треков
                    </span>
                  </span>
                  {isActive && <Check width={15} height={15} className="ml-auto text-red" />}
                </button>
              )
            })}
            <div className="px-4 py-2">
              <span className="font-mono text-[0.625rem] text-ink-3">+ {ACCOUNT.totalCards - cards.length} карточек</span>
            </div>
          </div>

          <div className="grid gap-2 border-t border-rule px-4 py-3">
            <button
              type="button"
              className="solid"
              onClick={() => {
                setOpen(false)
                router.push('/account')
              }}
            >
              <Plus width={14} height={14} /> Создать карточку
            </button>
            <span className="eyebrow">лимита нет. и почты новой не надо</span>
          </div>
        </div>
      )}
    </div>
  )
}
