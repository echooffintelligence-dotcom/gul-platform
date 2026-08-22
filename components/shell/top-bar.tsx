'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ChevronDown, EyeOff, LogOut, Search, Settings, Upload, UserRound } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AuthModal } from '@/components/auth/auth-modal'
import { useAuth } from '@/components/providers/auth-provider'
import { usePrivacy } from '@/components/providers/privacy-provider'
import { useToast } from '@/components/providers/toast-provider'
import { cn } from '@/lib/utils'

function initials(value: string) {
  return value.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'Г'
}

export function TopBar() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isLoading, isFallback, signOut } = useAuth()
  const { streamerMode } = usePrivacy()
  const [authOpen, setAuthOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  // Меню закрывается по клику мимо и по Esc — иначе оно висит поверх страницы.
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  async function handleSignOut() {
    await signOut()
    setMenuOpen(false)
    toast('Сессия завершена')
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const value = query.trim()
    if (!value) return
    router.push(`/search?q=${encodeURIComponent(value)}`)
  }

  return (
    <>
      <header className="glass-panel z-40 flex items-center gap-4 rounded-none border-x-0 border-t-0 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2" aria-label="ГУЛ: на главную">
          <b className="text-2xl font-black leading-none tracking-[0.01em] text-ink [font-stretch:72%]">ГУЛ</b>
          <span className="hidden font-mono text-[0.6875rem] text-ink-3 sm:inline">gul.fm</span>
        </Link>

        <form onSubmit={submitSearch} className="hidden max-w-[460px] flex-1 md:block">
          <label className="flex items-center gap-2 rounded-xl border border-rule bg-paper-2 px-3 py-2 text-ink-1 transition-all duration-300 focus-within:border-[var(--accent-1-edge)] focus-within:bg-paper-3">
            <Search width={15} height={15} className="shrink-0 text-ink-3" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="трек, артист, релиз, строчка из текста"
              aria-label="Поиск"
              className="w-full border-none bg-transparent text-[0.875rem] outline-none placeholder:text-ink-3"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {streamerMode && (
            <span title="Режим стримера включён: чувствительные данные скрыты" className="hidden items-center gap-1.5 rounded-lg border border-[var(--accent-2-edge)] bg-accent-2/15 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-ink sm:inline-flex">
              <EyeOff className="h-3 w-3" /> стрим
            </span>
          )}
          <button type="button" className="ghost hidden sm:inline-flex" onClick={() => router.push('/account')}><Upload width={14} height={14} /> Загрузить</button>

          {isLoading ? <div className="h-9 w-28 animate-pulse rounded-xl bg-paper-2" /> : !user ? (
            <button type="button" className="solid" onClick={() => setAuthOpen(true)}><UserRound className="h-4 w-4" /> <span className="hidden sm:inline">Войти</span><span className="sm:hidden">Вход</span></button>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((value) => !value)}
                className="group flex items-center gap-2 rounded-xl border border-rule bg-paper-2 py-1.5 pl-1.5 pr-2.5 transition-all duration-300 hover:border-[var(--accent-1-edge)] hover:bg-paper-3 active:scale-95"
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-1 font-mono text-[.65rem] font-black text-on-accent">{initials(user.username)}</span>
                {/* Почты здесь больше нет: она видна только в настройках профиля. */}
                <span className="hidden max-w-28 truncate text-left sm:block">
                  <span className="block text-xs font-semibold text-ink-1">{user.username}</span>
                  {isFallback && <span className="block font-mono text-[.58rem] text-ink-3">локальный режим</span>}
                </span>
                <ChevronDown className={cn('h-3.5 w-3.5 text-ink-3 transition-transform', menuOpen && 'rotate-180')} />
              </button>

              {menuOpen && (
                <div className="glass-panel absolute right-0 top-[calc(100%+10px)] z-50 w-56 rounded-2xl p-2 shadow-2xl">
                  <div className="border-b border-rule px-3 py-2">
                    <p className="truncate text-sm font-semibold">{user.username}</p>
                    <p className="truncate font-mono text-[.62rem] text-ink-3">аккаунт ГУЛа</p>
                  </div>
                  <Link href="/account" onClick={() => setMenuOpen(false)} className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-paper-3 hover:text-ink"><UserRound className="h-4 w-4" /> Мои карточки</Link>
                  <Link href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-paper-3 hover:text-ink"><Settings className="h-4 w-4" /> Настройки</Link>
                  <button type="button" onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-accent-hot transition-colors hover:bg-accent-hot/10"><LogOut className="h-4 w-4" /> Выйти</button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
