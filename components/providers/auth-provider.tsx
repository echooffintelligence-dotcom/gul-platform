'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabaseAuthClient } from '@/lib/supabase-auth'
import { setAccessToken } from '@/lib/api-client'

type LocalSession = {
  mode: 'local'
  accessToken: string
  userId: string
  email: string
  username: string
}

export type AuthIdentity = {
  id: string
  email: string
  username: string
}

type AuthContextValue = {
  user: AuthIdentity | null
  session: Session | LocalSession | null
  /**
   * Настоящий JWT Supabase — или null. У локальной fallback-сессии токена нет:
   * её «accessToken» это случайный uuid, и отправлять его на сервер бессмысленно.
   * Поэтому в fallback-режиме запись на сервер недоступна, а работа продолжается
   * локально. Это осознанный размен: иначе поддельная сессия писала бы в общие данные.
   */
  accessToken: string | null
  isLoading: boolean
  isFallback: boolean
  signUp: (email: string, password: string, username: string) => Promise<{ error?: string; fallback?: boolean }>
  signIn: (email: string, password: string) => Promise<{ error?: string; fallback?: boolean }>
  signOut: () => Promise<void>
}

const LOCAL_SESSION_KEY = 'gul.auth.local.v1'
const AuthContext = createContext<AuthContextValue | null>(null)

function toIdentity(user: User): AuthIdentity {
  const rawUsername = user.user_metadata?.username
  return {
    id: user.id,
    email: user.email ?? '',
    username: typeof rawUsername === 'string' && rawUsername.trim() ? rawUsername : (user.email?.split('@')[0] ?? 'слушатель'),
  }
}

function readLocalSession(): LocalSession | null {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(LOCAL_SESSION_KEY) ?? 'null')
    if (!value || typeof value !== 'object') return null
    const candidate = value as Partial<LocalSession>
    if (candidate.mode !== 'local' || typeof candidate.userId !== 'string' || typeof candidate.email !== 'string' || typeof candidate.username !== 'string' || typeof candidate.accessToken !== 'string') return null
    return candidate as LocalSession
  } catch {
    window.localStorage.removeItem(LOCAL_SESSION_KEY)
    return null
  }
}

function identityFromLocal(session: LocalSession): AuthIdentity {
  return { id: session.userId, email: session.email, username: session.username }
}

function createLocalSession(email: string, username?: string): LocalSession {
  const normalizedEmail = email.trim().toLowerCase()
  const local: LocalSession = {
    mode: 'local',
    accessToken: crypto.randomUUID(),
    userId: `local-${crypto.randomUUID()}`,
    email: normalizedEmail,
    username: username?.trim() || normalizedEmail.split('@')[0] || 'слушатель',
  }
  window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(local))
  return local
}

function isNetworkFailure(error: unknown): boolean {
  const text = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  return /network|fetch|failed to fetch|timeout|offline|load failed/i.test(text)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthIdentity | null>(null)
  const [session, setSession] = useState<Session | LocalSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFallback, setIsFallback] = useState(false)

  const applyLocalSession = useCallback((local: LocalSession | null) => {
    setSession(local)
    setUser(local ? identityFromLocal(local) : null)
    setIsFallback(Boolean(local))
  }, [])

  useEffect(() => {
    const local = readLocalSession()
    const client = getSupabaseAuthClient()
    if (!client) {
      applyLocalSession(local)
      setIsLoading(false)
      return
    }

    let active = true
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      if (nextSession?.user) {
        window.localStorage.removeItem(LOCAL_SESSION_KEY)
        setSession(nextSession)
        setUser(toIdentity(nextSession.user))
        setIsFallback(false)
      } else if (local) {
        applyLocalSession(local)
      } else {
        setSession(null)
        setUser(null)
        setIsFallback(false)
      }
      setIsLoading(false)
    })

    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (data.session?.user) {
        window.localStorage.removeItem(LOCAL_SESSION_KEY)
        setSession(data.session)
        setUser(toIdentity(data.session.user))
        setIsFallback(false)
      } else if (local) {
        applyLocalSession(local)
      } else if (error && isNetworkFailure(error)) {
        applyLocalSession(local)
      }
      setIsLoading(false)
    }).catch(() => {
      if (active) {
        applyLocalSession(local)
        setIsLoading(false)
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [applyLocalSession])

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    if (!email.includes('@')) return { error: 'Введите корректный email.' }
    if (password.length < 8) return { error: 'Пароль должен содержать не менее 8 символов.' }
    if (!username.trim()) return { error: 'Укажите имя пользователя.' }
    const client = getSupabaseAuthClient()
    if (!client) {
      const local = createLocalSession(email, username)
      applyLocalSession(local)
      return { fallback: true }
    }
    try {
      const { data, error } = await client.auth.signUp({ email: email.trim(), password, options: { data: { username: username.trim() } } })
      if (error) {
        if (isNetworkFailure(error)) {
          const local = createLocalSession(email, username)
          applyLocalSession(local)
          return { fallback: true }
        }
        return { error: error.message }
      }
      if (data.session?.user) return {}
      const attempt = await client.auth.signInWithPassword({ email: email.trim(), password })
      if (attempt.error) {
        if (isNetworkFailure(attempt.error)) {
          const local = createLocalSession(email, username)
          applyLocalSession(local)
          return { fallback: true }
        }
        return { error: 'Аккаунт создан, но Supabase требует подтверждение email. Отключите Confirm email в настройках Auth, чтобы включить моментальный вход.' }
      }
      return {}
    } catch (error) {
      if (isNetworkFailure(error)) {
        const local = createLocalSession(email, username)
        applyLocalSession(local)
        return { fallback: true }
      }
      return { error: 'Не удалось создать аккаунт.' }
    }
  }, [applyLocalSession])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!email.includes('@') || !password) return { error: 'Введите email и пароль.' }
    const client = getSupabaseAuthClient()
    if (!client) {
      const local = createLocalSession(email)
      applyLocalSession(local)
      return { fallback: true }
    }
    try {
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password })
      if (!error && data.session?.user) return {}
      if (error && !isNetworkFailure(error)) return { error: error.message }
      const local = createLocalSession(email)
      applyLocalSession(local)
      return { fallback: true }
    } catch (error) {
      if (!isNetworkFailure(error)) return { error: 'Не удалось выполнить вход.' }
      const local = createLocalSession(email)
      applyLocalSession(local)
      return { fallback: true }
    }
  }, [applyLocalSession])

  const signOut = useCallback(async () => {
    const client = getSupabaseAuthClient()
    if (client) {
      try { await client.auth.signOut({ scope: 'local' }) } catch { /* local clearing is always completed */ }
    }
    window.localStorage.removeItem(LOCAL_SESSION_KEY)
    setSession(null)
    setUser(null)
    setIsFallback(false)
  }, [])

  const accessToken = useMemo(() => {
    if (!session) return null
    return 'mode' in session && session.mode === 'local' ? null : (session as Session).access_token ?? null
  }, [session])

  // Один источник истины о токене: api-client подставляет его в каждый запрос,
  // поэтому ни один вызывающий код не обязан помнить про заголовок.
  useEffect(() => { setAccessToken(accessToken) }, [accessToken])

  const value = useMemo<AuthContextValue>(() => ({ user, session, accessToken, isLoading, isFallback, signUp, signIn, signOut }), [user, session, accessToken, isLoading, isFallback, signUp, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
