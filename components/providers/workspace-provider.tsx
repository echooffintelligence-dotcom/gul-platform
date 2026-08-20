'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { AvColor, CardShare, WorkspaceCard } from '@/lib/data'
import { ACCOUNT, workspaceCards as seedCards } from '@/lib/data'
import { supabase, type WorkspaceSnapshot } from '@/lib/supabase'
import { useAuth } from '@/components/providers/auth-provider'

export type WorkspaceDraft = {
  name: string
  slug: string
  color: AvColor
  role: string
  bio: string
}

type Result<T> = { value: T } | { error: string }

type WorkspaceContextType = {
  cards: WorkspaceCard[]
  active: WorkspaceCard
  activeId: string
  loading: boolean
  canEditActive: boolean
  setActive: (id: string) => void
  addCard: (draft: WorkspaceDraft) => Result<WorkspaceCard>
  shareCard: (cardId: string, email: string, role: CardShare['role']) => Result<void>
  revokeShare: (cardId: string, email: string) => void
  incrementActiveTracks: () => void
}

/**
 * Ключ хранения привязан к пользователю: на общем компьютере рабочее
 * пространство одного аккаунта больше не подхватывается другим.
 */
const storageKeyFor = (userId?: string | null) => (userId ? `gul.workspace.v4.${userId}` : 'gul.workspace.v4.guest')
const LEGACY_STORAGE_KEY = 'gul.workspace.v3'
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const Ctx = createContext<WorkspaceContextType | null>(null)

function seedSnapshot(): WorkspaceSnapshot {
  return { cards: seedCards, activeId: seedCards[0].id, updatedAt: new Date(0).toISOString() }
}

function isSnapshot(value: unknown): value is WorkspaceSnapshot {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<WorkspaceSnapshot>
  return Array.isArray(candidate.cards) && candidate.cards.length > 0 && typeof candidate.activeId === 'string' && typeof candidate.updatedAt === 'string'
}

function normalize(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
  const cards = snapshot.cards.map((card) => card.role === 'лейбл' ? { ...card, role: 'коллектив' } : card)
  const activeId = cards.some((card) => card.id === snapshot.activeId) ? snapshot.activeId : cards[0].id
  return { ...snapshot, cards, activeId }
}

function initialsFor(name: string) {
  return name.trim().split(/\s+/).map((part) => part.slice(0, 1)).join('').slice(0, 2).toUpperCase()
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken } = useAuth()
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(seedSnapshot)
  const [loading, setLoading] = useState(true)
  const syncReady = useRef(false)
  const snapshotRef = useRef(snapshot)
  const storageKey = storageKeyFor(user?.id)

  useEffect(() => { snapshotRef.current = snapshot }, [snapshot])

  const commit = useCallback((updater: (current: WorkspaceSnapshot) => WorkspaceSnapshot) => {
    setSnapshot((current) => ({ ...updater(current), updatedAt: new Date().toISOString() }))
  }, [])

  useEffect(() => {
    let mounted = true
    syncReady.current = false
    let local = seedSnapshot()
    try {
      const raw = window.localStorage.getItem(storageKey) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY)
      if (raw) {
        const stored: unknown = JSON.parse(raw)
        if (isSnapshot(stored)) local = normalize(stored)
      }
    } catch {
      window.localStorage.removeItem(storageKey)
    }
    setSnapshot(local)
    setLoading(false)

    // Синхронизация с сервером возможна только для настоящей сессии: у локального
    // fallback нет JWT, поэтому его данные остаются в браузере и никуда не уезжают.
    if (!user?.id || !accessToken) return () => { mounted = false }

    void supabase.loadWorkspace(user.id, accessToken).then((remote) => {
      if (!mounted) return
      const latest = snapshotRef.current
      const remoteIsNewer = remote && Date.parse(remote.updatedAt) > Date.parse(latest.updatedAt)
      if (remoteIsNewer && remote) {
        setSnapshot(normalize(remote))
      } else {
        void supabase.saveWorkspace(latest, user.id, accessToken)
      }
      syncReady.current = true
    })

    return () => { mounted = false }
  }, [storageKey, user?.id, accessToken])

  useEffect(() => {
    if (loading) return
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot))
    if (!syncReady.current || !user?.id || !accessToken) return
    const timer = window.setTimeout(() => { void supabase.saveWorkspace(snapshot, user.id, accessToken) }, 500)
    return () => window.clearTimeout(timer)
  }, [snapshot, loading, storageKey, user?.id, accessToken])

  const active = useMemo(() => snapshot.cards.find((card) => card.id === snapshot.activeId) ?? snapshot.cards[0], [snapshot])
  const canEditActive = active.access !== 'viewer'

  const setActive = useCallback((id: string) => {
    if (!snapshot.cards.some((card) => card.id === id)) return
    commit((current) => ({ ...current, activeId: id }))
  }, [snapshot.cards, commit])

  const addCard = useCallback((draft: WorkspaceDraft): Result<WorkspaceCard> => {
    const name = draft.name.trim()
    const slug = draft.slug.trim().toLowerCase()
    const bio = draft.bio.trim()
    if (name.length < 2 || name.length > 80) return { error: 'Имя должно содержать от 2 до 80 символов.' }
    if (!slugPattern.test(slug)) return { error: 'Slug: строчные латинские буквы, цифры и дефисы.' }
    if (bio.length > 280) return { error: 'Биография не должна превышать 280 символов.' }
    if (snapshot.cards.some((card) => card.slug === slug)) return { error: 'Такой slug уже существует.' }

    const card: WorkspaceCard = {
      id: crypto.randomUUID(), name, slug, initials: initialsFor(name), color: draft.color, role: draft.role,
      access: 'owner', bio, tracks: 0, listeners: '0', score: '—', who: user?.username ?? ACCOUNT.handle, status: 'wait', shares: [], owner_id: user?.id ?? 'local-anonymous',
    }
    commit((current) => ({ ...current, cards: [card, ...current.cards], activeId: card.id }))
    return { value: card }
  }, [snapshot.cards, commit, user?.id, user?.username])

  const shareCard = useCallback((cardId: string, rawEmail: string, role: CardShare['role']): Result<void> => {
    const email = rawEmail.trim().toLowerCase()
    const card = snapshot.cards.find((item) => item.id === cardId)
    if (!card) return { error: 'Карточка не найдена.' }
    if (card.access !== 'owner') return { error: 'Только владелец может управлять доступом.' }
    if (!emailPattern.test(email)) return { error: 'Введите корректный email.' }
    if (email === ACCOUNT.email.toLowerCase()) return { error: 'Основной аккаунт уже имеет доступ.' }
    commit((current) => ({
      ...current,
      cards: current.cards.map((item) => item.id === cardId ? { ...item, shares: [...(item.shares ?? []).filter((share) => share.email.toLowerCase() !== email), { email, role }] } : item),
    }))
    return { value: undefined }
  }, [snapshot.cards, commit])

  const revokeShare = useCallback((cardId: string, email: string) => {
    const card = snapshot.cards.find((item) => item.id === cardId)
    if (card?.access !== 'owner') return
    commit((current) => ({ ...current, cards: current.cards.map((item) => item.id === cardId ? { ...item, shares: (item.shares ?? []).filter((share) => share.email !== email) } : item) }))
  }, [snapshot.cards, commit])

  const incrementActiveTracks = useCallback(() => {
    if (!canEditActive) return
    commit((current) => ({ ...current, cards: current.cards.map((card) => card.id === current.activeId ? { ...card, tracks: card.tracks + 1, status: 'ok' } : card) }))
  }, [canEditActive, commit])

  const value = useMemo<WorkspaceContextType>(() => ({
    cards: snapshot.cards, active, activeId: snapshot.activeId, loading, canEditActive, setActive, addCard, shareCard, revokeShare, incrementActiveTracks,
  }), [snapshot.cards, snapshot.activeId, active, loading, canEditActive, setActive, addCard, shareCard, revokeShare, incrementActiveTracks])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useWorkspace() {
  const context = useContext(Ctx)
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return context
}
