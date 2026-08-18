'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AtSign, Eye, EyeOff, LockKeyhole, Sparkles, UserRound, X } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/providers/toast-provider'
import { cn } from '@/lib/utils'

type Mode = 'signin' | 'signup'

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const { signIn, signUp } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (open) setError('')
  }, [open, mode])

  if (!open) return null

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password, username)
    setBusy(false)
    if (result.error) { setError(result.error); return }
    toast(result.fallback ? 'Включён локальный режим: сессия сохранена на устройстве' : mode === 'signin' ? 'С возвращением в ГУЛ' : 'Аккаунт создан. Добро пожаловать в ГУЛ')
    onClose()
  }

  const fieldClass = 'peer w-full rounded-xl border border-white/10 bg-black/30 px-10 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-transparent focus:border-cyan-300/55 focus:bg-cyan-300/5 focus:ring-2 focus:ring-cyan-300/15'

  return (
    <div role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose() }} className="fixed inset-0 z-[80] grid place-items-center bg-[#02040b]/70 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="auth-title" className="glass-panel relative w-full max-w-[440px] overflow-hidden rounded-3xl border border-white/15 bg-[linear-gradient(145deg,rgba(24,37,67,.92),rgba(4,8,19,.88))] p-6 shadow-[0_24px_100px_rgba(0,0,0,.65),0_0_70px_rgba(78,230,255,.13)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-28 h-64 w-64 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <button type="button" aria-label="Закрыть" onClick={onClose} className="absolute right-4 top-4 rounded-xl border border-transparent p-2 text-ink-3 transition-all hover:border-white/10 hover:bg-white/5 hover:text-white active:scale-95"><X className="h-4 w-4" /></button>
        <div className="relative">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-[.62rem] uppercase tracking-[.14em] text-cyan-100"><Sparkles className="h-3 w-3" /> личный доступ</div>
          <h2 id="auth-title" className="text-3xl font-black tracking-[-.04em]">{mode === 'signin' ? 'С возвращением.' : 'Новый сигнал.'}</h2>
          <p className="mt-2 text-sm leading-6 text-ink-2">{mode === 'signin' ? 'Войдите, чтобы синхронизировать карточки, релизы и оценки.' : 'Создайте профиль, чтобы выпускать музыку и управлять доступом.'}</p>

          <div className="mt-6 grid grid-cols-2 rounded-xl border border-white/10 bg-black/20 p-1">
            {([['signin', 'Войти'], ['signup', 'Создать аккаунт']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setMode(value)} className={cn('rounded-lg px-3 py-2 font-mono text-xs uppercase tracking-[.08em] transition-all duration-300', mode === value ? 'bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(78,230,255,.35)]' : 'text-ink-3 hover:text-ink-1')}>{label}</button>)}
          </div>

          <form className="mt-5 grid gap-4" onSubmit={submit}>
            {mode === 'signup' && <label className="relative block"><UserRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink-3 transition-colors peer-focus:text-cyan-200" /><input required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Имя пользователя" className={fieldClass} /><span className="pointer-events-none absolute left-10 top-3.5 origin-left text-sm text-ink-3 transition-all duration-200 peer-focus:-translate-y-5 peer-focus:scale-75 peer-focus:text-cyan-200 peer-[:not(:placeholder-shown)]:-translate-y-5 peer-[:not(:placeholder-shown)]:scale-75">Имя пользователя</span></label>}
            <label className="relative block"><AtSign className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink-3" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className={fieldClass} /><span className="pointer-events-none absolute left-10 top-3.5 origin-left text-sm text-ink-3 transition-all duration-200 peer-focus:-translate-y-5 peer-focus:scale-75 peer-focus:text-cyan-200 peer-[:not(:placeholder-shown)]:-translate-y-5 peer-[:not(:placeholder-shown)]:scale-75">Email</span></label>
            <label className="relative block"><LockKeyhole className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink-3" /><input required minLength={8} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Пароль" className={fieldClass} /><span className="pointer-events-none absolute left-10 top-3.5 origin-left text-sm text-ink-3 transition-all duration-200 peer-focus:-translate-y-5 peer-focus:scale-75 peer-focus:text-cyan-200 peer-[:not(:placeholder-shown)]:-translate-y-5 peer-[:not(:placeholder-shown)]:scale-75">Пароль</span><button type="button" aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-3 rounded-md p-1 text-ink-3 transition-colors hover:text-cyan-100">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></label>
            {mode === 'signup' && <p className="-mt-2 font-mono text-[.625rem] text-ink-3">Минимум 8 символов. Вход производится без кодов и промежуточных экранов.</p>}
            {error && <p role="alert" className="rounded-xl border border-pink-400/25 bg-pink-400/10 px-3 py-2 text-xs text-pink-100">{error}</p>}
            <button type="submit" disabled={busy} className="solid mt-1 w-full">{busy ? 'Соединяем…' : mode === 'signin' ? 'Войти в ГУЛ' : 'Создать аккаунт'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}
