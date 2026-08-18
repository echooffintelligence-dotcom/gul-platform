'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronDown, LogOut, Search, Settings, Upload, UserRound } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AuthModal } from '@/components/auth/auth-modal'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/providers/toast-provider'

function initials(value: string) {
  return value.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'Г'
}

export function TopBar() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isLoading, isFallback, signOut } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    setMenuOpen(false)
    toast('Сессия завершена')
  }

  return (
    <>
      <header className="glass-panel z-40 flex items-center gap-4 border-x-0 border-t-0 border-b border-white/10 bg-black/60 px-4 py-3 backdrop-blur-xl sm:px-6">
        <Link href="/" className="flex items-baseline gap-2" aria-label="ГУЛ: на главную">
          <b className="bg-[linear-gradient(110deg,#fff,#4ee6ff,#b7a2ff,#fff)] bg-[length:200%_100%] bg-clip-text text-2xl font-black leading-none tracking-[0.01em] text-transparent [font-stretch:72%]">ГУЛ</b>
          <span className="hidden font-mono text-[0.6875rem] text-ink-3 sm:inline">gul.fm</span>
        </Link>

        <label className="hidden max-w-[460px] flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-ink-1 shadow-inner shadow-black/20 transition-all duration-300 focus-within:border-cyan-300/45 focus-within:bg-cyan-300/5 focus-within:shadow-[0_0_22px_rgba(78,230,255,0.1)] md:flex">
          <Search width={15} height={15} className="text-ink-3" />
          <input type="search" placeholder="трек, артист, релиз, строчка из текста" aria-label="Поиск" className="w-full border-none bg-transparent text-[0.875rem] outline-none placeholder:text-ink-3" />
        </label>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button type="button" className="ghost hidden sm:inline-flex" onClick={() => router.push('/account')}><Upload width={14} height={14} /> Загрузить</button>
          {isLoading ? <div className="h-9 w-28 rounded-xl bg-white/5 animate-pulse" /> : !user ? (
            <button type="button" className="solid" onClick={() => setAuthOpen(true)}><UserRound className="h-4 w-4" /> <span className="hidden sm:inline">Войти</span><span className="sm:hidden">Вход</span></button>
          ) : (
            <div className="relative">
              <button type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)} className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-2.5 transition-all duration-300 hover:border-cyan-300/35 hover:bg-cyan-300/10 active:scale-95">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[linear-gradient(135deg,#4ee6ff,#a78bfa)] font-mono text-[.65rem] font-black text-slate-950 shadow-[0_0_16px_rgba(78,230,255,.3)]">{initials(user.username)}</span>
                <span className="hidden max-w-28 truncate text-left sm:block"><span className="block text-xs font-semibold text-ink-1">{user.username}</span><span className="block font-mono text-[.58rem] text-ink-3">{isFallback ? 'локальный режим' : user.email}</span></span>
                <ChevronDown className="h-3.5 w-3.5 text-ink-3 transition-transform group-aria-expanded:rotate-180" />
              </button>
              {menuOpen && <div className="glass-panel absolute right-0 top-[calc(100%+10px)] z-50 w-56 rounded-2xl border border-white/12 bg-slate-950/90 p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="border-b border-white/8 px-3 py-2"><p className="truncate text-sm font-semibold">{user.username}</p><p className="truncate font-mono text-[.62rem] text-ink-3">{user.email}</p></div>
                <Link href="/account" onClick={() => setMenuOpen(false)} className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-cyan-300/10 hover:text-cyan-100"><UserRound className="h-4 w-4" /> Мои карточки</Link>
                <button type="button" onClick={() => { setMenuOpen(false); toast('Настройки профиля появятся в следующем обновлении') }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-ink-2 transition-colors hover:bg-cyan-300/10 hover:text-cyan-100"><Settings className="h-4 w-4" /> Настройки</button>
                <button type="button" onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-pink-200 transition-colors hover:bg-pink-400/10"><LogOut className="h-4 w-4" /> Выйти</button>
              </div>}
            </div>
          )}
        </div>
      </header>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
