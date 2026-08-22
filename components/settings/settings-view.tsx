'use client'

import { useState } from 'react'
import { Check, Eye, EyeOff, Image as ImageIcon, Palette, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { usePrivacy } from '@/components/providers/privacy-provider'
import { useTheme } from '@/components/providers/theme-provider'
import { useToast } from '@/components/providers/toast-provider'
import { readableOn, type ThemeId } from '@/lib/themes'
import { cn } from '@/lib/utils'

const ACCENT_PRESETS = ['#eccfa9', '#4ee6ff', '#8ab4f8', '#f2a2c0', '#9ede9b', '#d8a7ff', '#ffb26b']

export function SettingsView() {
  const { user, isFallback } = useAuth()
  const { theme, themes, setTheme, accent, setAccent, ambientEnabled, setAmbientEnabled } = useTheme()
  const { streamerMode, setStreamerMode, maskEmail } = usePrivacy()
  const { toast } = useToast()
  const [revealEmail, setRevealEmail] = useState(false)

  const email = user?.email ?? ''
  // В режиме стримера «показать» недоступно: иначе смысл режима теряется.
  const shownEmail = streamerMode ? maskEmail(email) : revealEmail ? email : maskEmail(email) || '•••'

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8 sm:px-12 sm:pb-24">
      <div className="eyebrow">настройки</div>
      <h1 className="mt-1 text-[clamp(1.9rem,4vw,2.6rem)] font-black uppercase leading-[0.98] [font-stretch:70%]">Профиль и оформление</h1>

      {/* ── Профиль ─────────────────────────────────────────────────────── */}
      <section className="mt-8 rounded-2xl border border-rule bg-paper-2 p-5" aria-labelledby="profile-title">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-paper-3 text-ink-2"><UserRound className="h-4 w-4" /></span>
          <div>
            <div className="eyebrow">аккаунт</div>
            <h2 id="profile-title" className="font-semibold">Профиль</h2>
          </div>
        </div>

        {!user ? (
          <p className="mt-4 text-sm text-ink-3">Войдите, чтобы управлять профилем.</p>
        ) : (
          <dl className="mt-4 grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule-soft pb-3">
              <dt className="font-mono text-xs text-ink-3">Имя пользователя</dt>
              <dd className="text-sm">{user.username}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule-soft pb-3">
              <dt className="font-mono text-xs text-ink-3">Почта</dt>
              <dd className="flex items-center gap-2">
                <span className="font-mono text-sm">{shownEmail}</span>
                <button
                  type="button"
                  disabled={streamerMode}
                  onClick={() => setRevealEmail((value) => !value)}
                  title={streamerMode ? 'Недоступно в режиме стримера' : revealEmail ? 'Скрыть' : 'Показать'}
                  className="grid h-7 w-7 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-paper-3 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {revealEmail && !streamerMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <dt className="font-mono text-xs text-ink-3">Режим сессии</dt>
              <dd className="text-sm">{isFallback ? 'локальный (без синхронизации)' : 'подтверждённый'}</dd>
            </div>
          </dl>
        )}
        <p className="mt-3 font-mono text-[0.65rem] text-ink-3">Почта больше не показывается в шапке сайта — только здесь.</p>
      </section>

      {/* ── Режим стримера ──────────────────────────────────────────────── */}
      <section className="mt-5 rounded-2xl border border-rule bg-paper-2 p-5" aria-labelledby="streamer-title">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-paper-3 text-ink-2"><ShieldCheck className="h-4 w-4" /></span>
          <div>
            <div className="eyebrow">приватность</div>
            <h2 id="streamer-title" className="font-semibold">Режим стримера</h2>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={streamerMode}
            onClick={() => { setStreamerMode(!streamerMode); toast(streamerMode ? 'Режим стримера выключен' : 'Режим стримера включён') }}
            className={cn('ml-auto relative h-6 w-11 shrink-0 rounded-full transition-colors', streamerMode ? 'bg-accent-1' : 'bg-paper-3')}
          >
            <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-ink transition-transform', streamerMode ? 'translate-x-[22px]' : 'translate-x-0.5')} />
          </button>
        </div>
        <p className="mt-3 max-w-prose text-sm text-ink-2">
          Скрывает почту, приватные ссылки предпрослушивания и секретные токены релизов — всё, что не должно попасть в кадр.
          Работает на всех страницах сразу.
        </p>
      </section>

      {/* ── Тема ────────────────────────────────────────────────────────── */}
      <section className="mt-5 rounded-2xl border border-rule bg-paper-2 p-5" aria-labelledby="theme-title">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-paper-3 text-ink-2"><Palette className="h-4 w-4" /></span>
          <div>
            <div className="eyebrow">оформление</div>
            <h2 id="theme-title" className="font-semibold">Тема</h2>
          </div>
        </div>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {themes.map((item) => {
            const selected = item.id === theme.id
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => { setTheme(item.id as ThemeId); toast(`Тема «${item.label}»`) }}
                  aria-pressed={selected}
                  className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors', selected ? 'is-selected border-rule bg-paper-3' : 'border-rule hover:bg-paper-3')}
                >
                  {/* Превью собрано из токенов самой темы — видно, что получишь. */}
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border"
                    style={{ background: item.tokens.paper, borderColor: item.tokens.glassBorder }}
                  >
                    <span className="flex gap-1">
                      <span className="h-4 w-1.5 rounded-full" style={{ background: item.tokens.accent1 }} />
                      <span className="h-4 w-1.5 rounded-full" style={{ background: item.tokens.accent2 }} />
                      <span className="h-4 w-1.5 rounded-full" style={{ background: item.tokens.accentHot }} />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="block truncate font-mono text-[0.62rem] text-ink-3">{item.hint}</span>
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-accent-1" />}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="mt-5 border-t border-rule-soft pt-4">
          <div className="font-mono text-xs text-ink-3">Свой акцентный цвет</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAccent(null)}
              aria-pressed={accent === null}
              className={cn('rounded-lg border px-2.5 py-1.5 font-mono text-[0.7rem] transition-colors', accent === null ? 'is-selected border-rule' : 'border-rule text-ink-2 hover:text-ink')}
            >
              из темы
            </button>
            {ACCENT_PRESETS.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => setAccent(hex)}
                aria-label={`Акцент ${hex}`}
                aria-pressed={accent === hex}
                className={cn('h-8 w-8 rounded-lg border border-rule transition-transform hover:scale-110', accent === hex && 'is-selected')}
                style={{ background: hex }}
              >
                {accent === hex && <Check className="mx-auto h-3.5 w-3.5" style={{ color: readableOn(hex) }} />}
              </button>
            ))}
            <label className="flex items-center gap-2 rounded-lg border border-rule px-2.5 py-1.5">
              <span className="font-mono text-[0.7rem] text-ink-3">свой</span>
              <input
                type="color"
                value={accent ?? theme.tokens.accent1}
                onChange={(event) => setAccent(event.target.value)}
                aria-label="Выбрать акцентный цвет"
                className="h-6 w-8 cursor-pointer border-none bg-transparent p-0"
              />
            </label>
          </div>
          <p className="mt-2 font-mono text-[0.62rem] text-ink-3">Цвет текста на кнопках подбирается автоматически, чтобы надписи не пропадали.</p>
        </div>

        <div className="mt-5 flex items-start gap-3 border-t border-rule-soft pt-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-paper-3 text-ink-2"><ImageIcon className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Фон из обложки</div>
            <p className="mt-0.5 text-xs text-ink-3">Размытая обложка текущего трека подсвечивает интерфейс. Отключите, если фон отвлекает.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={ambientEnabled}
            onClick={() => setAmbientEnabled(!ambientEnabled)}
            className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', ambientEnabled ? 'bg-accent-1' : 'bg-paper-3')}
          >
            <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-ink transition-transform', ambientEnabled ? 'translate-x-[22px]' : 'translate-x-0.5')} />
          </button>
        </div>
      </section>
    </div>
  )
}
