'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_THEME, THEMES, type Theme, type ThemeId, themeById, themeVariables } from '@/lib/themes'

type ThemeContextValue = {
  theme: Theme
  themeId: ThemeId
  themes: Theme[]
  /** Пользовательский акцент поверх темы. null — акцент самой темы. */
  accent: string | null
  setTheme: (id: ThemeId) => void
  setAccent: (hex: string | null) => void
  /** Показывать ли размытую обложку текущего трека фоном. */
  ambientEnabled: boolean
  setAmbientEnabled: (value: boolean) => void
}

const STORAGE_KEY = 'gul.theme.v1'
const Ctx = createContext<ThemeContextValue | null>(null)

type Stored = { id?: string; accent?: string | null; ambient?: boolean }

function readStored(): Stored {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Stored) : {}
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return {}
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME)
  const [accent, setAccentState] = useState<string | null>(null)
  const [ambientEnabled, setAmbientState] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = readStored()
    if (stored.id) setThemeId(themeById(stored.id).id)
    if (typeof stored.accent === 'string') setAccentState(stored.accent)
    if (typeof stored.ambient === 'boolean') setAmbientState(stored.ambient)
    setHydrated(true)
  }, [])

  const theme = useMemo(() => themeById(themeId), [themeId])

  // Переменные вешаем на <html>: так тема достаёт и портал-элементы,
  // и всё, что отрисовано вне React-дерева.
  useEffect(() => {
    const root = document.documentElement
    // Глушим переходы на время подмены переменных — см. комментарий в globals.css.
    root.classList.add('theme-switching')
    for (const [name, value] of themeVariables(theme, accent)) root.style.setProperty(name, value)
    root.dataset.theme = theme.id
    root.style.colorScheme = theme.tokens.scheme

    // Два кадра: первый применяет стили, во втором их уже безопасно анимировать.
    let second = 0
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => root.classList.remove('theme-switching'))
    })
    return () => {
      window.cancelAnimationFrame(first)
      if (second) window.cancelAnimationFrame(second)
      root.classList.remove('theme-switching')
    }
  }, [theme, accent])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: themeId, accent, ambient: ambientEnabled }))
  }, [hydrated, themeId, accent, ambientEnabled])

  const setTheme = useCallback((id: ThemeId) => setThemeId(themeById(id).id), [])
  const setAccent = useCallback((hex: string | null) => setAccentState(hex), [])
  const setAmbientEnabled = useCallback((value: boolean) => setAmbientState(value), [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, themeId, themes: THEMES, accent, setTheme, setAccent, ambientEnabled, setAmbientEnabled }),
    [theme, themeId, accent, setTheme, setAccent, ambientEnabled, setAmbientEnabled],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTheme() {
  const context = useContext(Ctx)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
