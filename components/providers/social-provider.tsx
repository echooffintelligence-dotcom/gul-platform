'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ArtistLink } from '@/lib/data'

/** Пользовательские правки профиля артиста. */
export type ArtistProfile = { bio?: string; avatarUrl?: string; bannerUrl?: string }

export type Repost = { id: string; releaseId: string; title: string; username: string; createdAt: string }
export type LegacyExternalLinks = { vk: string; telegram: string; bandcamp: string; boosty: string; spotify: string }
export type CreatorSettings = {
  allowDownload: boolean
  secretToken: string
  /** Legacy: жёсткий набор площадок. Оставлен только для миграции старых данных. */
  externalLinks?: Partial<LegacyExternalLinks>
  replacementAudioName?: string
}
export type PlaylistPrivacy = 'public' | 'private' | 'link'
export type SocialPlaylist = { id: string; title: string; description: string; coverUrl?: string; privacy: PlaylistPrivacy; trackIds: string[]; createdAt: string; system?: boolean }
export type Blend = { id: string; friendId: string; friendName: string; friendInitials: string; trackIds: string[]; matchScore: number; createdAt: string }

type State = {
  reposts: Repost[]
  spotlight: Record<string, string[]>
  settings: Record<string, CreatorSettings>
  followingArtistIds: string[]
  likedTrackIds: string[]
  playlists: SocialPlaylist[]
  blends: Blend[]
  /** Ссылки профиля по id карточки артиста. */
  artistLinks: Record<string, ArtistLink[]>
  /** Правки профиля артиста поверх каталога: описание, аватар, шапка. */
  artistProfiles: Record<string, ArtistProfile>
  /** История прослушиваний, свежие первыми. Питает «Мою волну». */
  history: string[]
  /**
   * Секунды прослушивания по месяцам: { '2026-08': { trackId: 320 } }.
   * Питает раздел «Топ артистов месяца» и счётчик наслушанного времени.
   */
  listenStats: Record<string, Record<string, number>>
}

type SocialContext = {
  reposts: Repost[]
  playlists: SocialPlaylist[]
  likedPlaylist: SocialPlaylist
  blends: Blend[]
  followingArtistIds: string[]
  likedTrackIds: string[]
  history: string[]
  listenStats: Record<string, Record<string, number>>
  /** Прибавляет прослушанные секунды к текущему месяцу. */
  addListenSeconds: (trackId: string, seconds: number) => void
  spotlightFor: (artistId: string) => string[]
  linksFor: (artistId: string) => ArtistLink[]
  profileFor: (artistId: string) => ArtistProfile
  setArtistProfile: (artistId: string, patch: ArtistProfile) => void
  isReposted: (releaseId: string) => boolean
  isFollowing: (artistId: string) => boolean
  isLiked: (trackId: string) => boolean
  toggleRepost: (releaseId: string, title: string, username?: string) => void
  toggleFollow: (artistId: string) => void
  toggleLike: (trackId: string) => void
  toggleSpotlight: (artistId: string, releaseId: string) => { error?: string }
  addArtistLink: (artistId: string, kind: ArtistLink['kind']) => void
  updateArtistLink: (artistId: string, linkId: string, patch: Partial<Pick<ArtistLink, 'url' | 'title'>>) => void
  removeArtistLink: (artistId: string, linkId: string) => void
  createPlaylist: (input: Pick<SocialPlaylist, 'title' | 'description' | 'coverUrl' | 'privacy'>) => SocialPlaylist
  updatePlaylist: (playlistId: string, patch: Partial<Pick<SocialPlaylist, 'title' | 'description' | 'coverUrl' | 'privacy'>>) => void
  deletePlaylist: (playlistId: string) => void
  toggleTrackInPlaylist: (playlistId: string, trackId: string) => void
  createBlend: (friend: { id: string; name: string; initials: string }, trackIds: string[], matchScore: number) => Blend
  recordPlay: (trackId: string) => void
  getSettings: (releaseId: string) => CreatorSettings
  patchSettings: (releaseId: string, patch: Partial<CreatorSettings>) => void
}

const KEY = 'gul.social.v3'
const LEGACY_KEYS = ['gul.social.v2', 'gul.social.creator.v1']
const HISTORY_LIMIT = 200

/** Текущий месяц в виде '2026-08' — ключ для помесячной статистики. */
export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const likedPlaylist = (trackIds: string[]): SocialPlaylist => ({
  id: 'liked',
  title: 'Понравившиеся треки',
  description: 'Автоматическая сборка всех треков с активным ❤️.',
  privacy: 'private',
  trackIds,
  createdAt: 'system',
  system: true,
})

const emptyState = (): State => ({ reposts: [], spotlight: {}, settings: {}, followingArtistIds: [], likedTrackIds: [], playlists: [], blends: [], artistLinks: {}, artistProfiles: {}, history: [], listenStats: {} })
const defaultSettings = (): CreatorSettings => ({ allowDownload: false, secretToken: crypto.randomUUID().replaceAll('-', '') })
const Ctx = createContext<SocialContext | null>(null)

const stringList = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [])

function normalizeLinks(value: unknown): ArtistLink[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is ArtistLink => Boolean(item) && typeof item === 'object' && typeof (item as ArtistLink).url === 'string')
    .map((item) => ({
      id: typeof item.id === 'string' && item.id ? item.id : crypto.randomUUID(),
      url: item.url,
      title: typeof item.title === 'string' ? item.title : '',
      kind: item.kind === 'support' ? 'support' : 'link',
    }))
}

/**
 * Переносит прежние фиксированные ссылки (vk/telegram/bandcamp/boosty/spotify)
 * в модульный формат, чтобы после обновления у артиста ничего не пропало.
 * Boosty попадает в группу поддержки — по смыслу это донат-площадка.
 */
function migrateLegacyLinks(settings: Record<string, CreatorSettings>): ArtistLink[] {
  const collected: ArtistLink[] = []
  const seen = new Set<string>()
  for (const setting of Object.values(settings)) {
    for (const [platform, url] of Object.entries(setting.externalLinks ?? {})) {
      const address = typeof url === 'string' ? url.trim() : ''
      if (!address || seen.has(address)) continue
      seen.add(address)
      collected.push({
        id: crypto.randomUUID(),
        url: address,
        title: platform,
        kind: platform === 'boosty' ? 'support' : 'link',
      })
    }
  }
  return collected
}

function normalizeState(value: unknown): State {
  if (!value || typeof value !== 'object') return emptyState()
  const raw = value as Partial<State>
  const settings = raw.settings && typeof raw.settings === 'object' ? (raw.settings as Record<string, CreatorSettings>) : {}

  const artistLinks: Record<string, ArtistLink[]> = {}
  if (raw.artistLinks && typeof raw.artistLinks === 'object') {
    for (const [artistId, links] of Object.entries(raw.artistLinks)) artistLinks[artistId] = normalizeLinks(links)
  }

  return {
    reposts: Array.isArray(raw.reposts) ? (raw.reposts as Repost[]) : [],
    spotlight: raw.spotlight && typeof raw.spotlight === 'object' ? (raw.spotlight as Record<string, string[]>) : {},
    settings,
    followingArtistIds: stringList(raw.followingArtistIds),
    likedTrackIds: stringList(raw.likedTrackIds),
    playlists: Array.isArray(raw.playlists)
      ? raw.playlists.filter((item): item is SocialPlaylist => Boolean(item) && typeof item === 'object' && typeof (item as SocialPlaylist).id === 'string' && Array.isArray((item as SocialPlaylist).trackIds))
      : [],
    blends: Array.isArray(raw.blends) ? (raw.blends as Blend[]) : [],
    artistLinks,
    artistProfiles: raw.artistProfiles && typeof raw.artistProfiles === 'object' ? (raw.artistProfiles as Record<string, ArtistProfile>) : {},
    history: stringList(raw.history).slice(0, HISTORY_LIMIT),
    listenStats: raw.listenStats && typeof raw.listenStats === 'object' ? (raw.listenStats as Record<string, Record<string, number>>) : {},
  }
}

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(emptyState)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const current = window.localStorage.getItem(KEY)
      if (current) {
        setState(normalizeState(JSON.parse(current)))
        return
      }
      const legacyRaw = LEGACY_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean)
      if (!legacyRaw) return
      const migrated = normalizeState(JSON.parse(legacyRaw))
      const inherited = migrateLegacyLinks(migrated.settings)
      // Старые ссылки не привязаны к карточке, поэтому кладём их в общий раздел '*',
      // откуда артист перенесёт их в свой профиль осознанно.
      setState(inherited.length ? { ...migrated, artistLinks: { ...migrated.artistLinks, '*': inherited } } : migrated)
    } catch {
      window.localStorage.removeItem(KEY)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(KEY, JSON.stringify(state))
  }, [hydrated, state])

  const getSettings = useCallback((releaseId: string) => state.settings[releaseId] ?? defaultSettings(), [state.settings])

  const recordPlay = useCallback((trackId: string) => {
    if (!trackId) return
    setState((previous) => {
      // Повторный запуск того же трека подряд не должен раздувать историю.
      if (previous.history[0] === trackId) return previous
      return { ...previous, history: [trackId, ...previous.history.filter((id) => id !== trackId)].slice(0, HISTORY_LIMIT) }
    })
  }, [])

  const addListenSeconds = useCallback((trackId: string, seconds: number) => {
    if (!trackId || seconds <= 0) return
    const month = monthKey()
    setState((previous) => {
      const forMonth = previous.listenStats[month] ?? {}
      return {
        ...previous,
        listenStats: { ...previous.listenStats, [month]: { ...forMonth, [trackId]: (forMonth[trackId] ?? 0) + seconds } },
      }
    })
  }, [])

  const value = useMemo<SocialContext>(() => ({
    reposts: state.reposts,
    playlists: state.playlists,
    likedPlaylist: likedPlaylist(state.likedTrackIds),
    blends: state.blends,
    followingArtistIds: state.followingArtistIds,
    likedTrackIds: state.likedTrackIds,
    history: state.history,
    listenStats: state.listenStats,
    addListenSeconds,
    spotlightFor: (artistId) => state.spotlight[artistId] ?? [],
    linksFor: (artistId) => state.artistLinks[artistId] ?? [],
    profileFor: (artistId) => state.artistProfiles[artistId] ?? {},
    setArtistProfile: (artistId, patch) => setState((previous) => ({
      ...previous,
      artistProfiles: { ...previous.artistProfiles, [artistId]: { ...(previous.artistProfiles[artistId] ?? {}), ...patch } },
    })),
    isReposted: (releaseId) => state.reposts.some((repost) => repost.releaseId === releaseId),
    isFollowing: (artistId) => state.followingArtistIds.includes(artistId),
    isLiked: (trackId) => state.likedTrackIds.includes(trackId),
    toggleRepost: (releaseId, title, username = 'you') => setState((previous) => previous.reposts.some((repost) => repost.releaseId === releaseId)
      ? { ...previous, reposts: previous.reposts.filter((repost) => repost.releaseId !== releaseId) }
      : { ...previous, reposts: [{ id: crypto.randomUUID(), releaseId, title, username, createdAt: new Date().toISOString() }, ...previous.reposts] }),
    toggleFollow: (artistId) => setState((previous) => ({ ...previous, followingArtistIds: previous.followingArtistIds.includes(artistId) ? previous.followingArtistIds.filter((id) => id !== artistId) : [...previous.followingArtistIds, artistId] })),
    toggleLike: (trackId) => setState((previous) => ({ ...previous, likedTrackIds: previous.likedTrackIds.includes(trackId) ? previous.likedTrackIds.filter((id) => id !== trackId) : [trackId, ...previous.likedTrackIds] })),
    toggleSpotlight: (artistId, releaseId) => {
      const current = state.spotlight[artistId] ?? []
      if (!current.includes(releaseId) && current.length >= 3) return { error: 'Можно закрепить не более трёх релизов.' }
      setState((previous) => ({ ...previous, spotlight: { ...previous.spotlight, [artistId]: current.includes(releaseId) ? current.filter((id) => id !== releaseId) : [...current, releaseId] } }))
      return {}
    },
    addArtistLink: (artistId, kind) => setState((previous) => ({
      ...previous,
      artistLinks: { ...previous.artistLinks, [artistId]: [...(previous.artistLinks[artistId] ?? []), { id: crypto.randomUUID(), url: '', title: '', kind }] },
    })),
    updateArtistLink: (artistId, linkId, patch) => setState((previous) => ({
      ...previous,
      artistLinks: { ...previous.artistLinks, [artistId]: (previous.artistLinks[artistId] ?? []).map((link) => link.id === linkId ? { ...link, ...patch } : link) },
    })),
    removeArtistLink: (artistId, linkId) => setState((previous) => ({
      ...previous,
      artistLinks: { ...previous.artistLinks, [artistId]: (previous.artistLinks[artistId] ?? []).filter((link) => link.id !== linkId) },
    })),
    createPlaylist: (input) => {
      const playlist: SocialPlaylist = {
        id: crypto.randomUUID(),
        title: input.title.trim(),
        description: input.description.trim(),
        coverUrl: input.coverUrl?.trim() || undefined,
        privacy: input.privacy,
        trackIds: [],
        createdAt: new Date().toISOString(),
      }
      setState((previous) => ({ ...previous, playlists: [playlist, ...previous.playlists] }))
      return playlist
    },
    updatePlaylist: (playlistId, patch) => setState((previous) => ({ ...previous, playlists: previous.playlists.map((playlist) => playlist.id === playlistId ? { ...playlist, ...patch } : playlist) })),
    deletePlaylist: (playlistId) => setState((previous) => ({ ...previous, playlists: previous.playlists.filter((playlist) => playlist.id !== playlistId) })),
    toggleTrackInPlaylist: (playlistId, trackId) => {
      if (playlistId === 'liked') {
        setState((previous) => ({ ...previous, likedTrackIds: previous.likedTrackIds.includes(trackId) ? previous.likedTrackIds.filter((id) => id !== trackId) : [trackId, ...previous.likedTrackIds] }))
        return
      }
      setState((previous) => ({
        ...previous,
        playlists: previous.playlists.map((playlist) => playlist.id === playlistId
          ? { ...playlist, trackIds: playlist.trackIds.includes(trackId) ? playlist.trackIds.filter((id) => id !== trackId) : [...playlist.trackIds, trackId] }
          : playlist),
      }))
    },
    createBlend: (friend, trackIds, matchScore) => {
      const blend: Blend = { id: crypto.randomUUID(), friendId: friend.id, friendName: friend.name, friendInitials: friend.initials, trackIds: [...new Set(trackIds)], matchScore, createdAt: new Date().toISOString() }
      setState((previous) => ({ ...previous, blends: [blend, ...previous.blends] }))
      return blend
    },
    recordPlay,
    getSettings,
    patchSettings: (releaseId, patch) => setState((previous) => ({ ...previous, settings: { ...previous.settings, [releaseId]: { ...(previous.settings[releaseId] ?? defaultSettings()), ...patch } } })),
  }), [addListenSeconds, getSettings, recordPlay, state.artistLinks, state.artistProfiles, state.blends, state.followingArtistIds, state.history, state.listenStats, state.likedTrackIds, state.playlists, state.reposts, state.spotlight])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSocial() {
  const context = useContext(Ctx)
  if (!context) throw new Error('useSocial must be used within SocialProvider')
  return context
}
