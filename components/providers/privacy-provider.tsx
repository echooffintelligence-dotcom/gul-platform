'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Режим стримера.
 *
 * Скрывает всё, что не должно попасть в кадр: почту, приватные ссылки,
 * секретные токены релизов. Логика собрана в одном месте намеренно — если
 * каждый компонент решает сам, один из них рано или поздно забудет,
 * и почта утечёт именно в эфир.
 */
type PrivacyContextValue = {
  streamerMode: boolean
  setStreamerMode: (value: boolean) => void
  /** Почта: показывает j•••@mail.com либо полный адрес. */
  maskEmail: (email: string) => string
  /** Произвольный секрет: токен, приватная ссылка. */
  maskSecret: (value: string) => string
}

const STORAGE_KEY = 'gul.privacy.v1'
const Ctx = createContext<PrivacyContextValue | null>(null)

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [streamerMode, setStreamerState] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (parsed && typeof parsed === 'object' && typeof (parsed as { streamerMode?: unknown }).streamerMode === 'boolean') {
          setStreamerState((parsed as { streamerMode: boolean }).streamerMode)
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ streamerMode }))
  }, [hydrated, streamerMode])

  const maskEmail = useCallback((email: string) => {
    if (!streamerMode) return email
    const [name, domain] = email.split('@')
    if (!domain) return '•••'
    // Первая буква оставлена, чтобы владелец узнал свой аккаунт на экране.
    return `${name.slice(0, 1)}•••@${domain.replace(/^[^.]+/, (part) => part.slice(0, 1) + '•••')}`
  }, [streamerMode])

  const maskSecret = useCallback((value: string) => (streamerMode ? '•'.repeat(Math.min(18, Math.max(8, value.length))) : value), [streamerMode])

  const setStreamerMode = useCallback((value: boolean) => setStreamerState(value), [])

  const value = useMemo<PrivacyContextValue>(
    () => ({ streamerMode, setStreamerMode, maskEmail, maskSecret }),
    [streamerMode, setStreamerMode, maskEmail, maskSecret],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePrivacy() {
  const context = useContext(Ctx)
  if (!context) throw new Error('usePrivacy must be used within PrivacyProvider')
  return context
}
