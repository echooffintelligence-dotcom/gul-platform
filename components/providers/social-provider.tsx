'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type Repost = { id: string; releaseId: string; title: string; username: string; createdAt: string }
export type CreatorSettings = { allowDownload: boolean; secretToken: string; externalLinks: { vk: string; telegram: string; bandcamp: string; boosty: string; spotify: string }; replacementAudioName?: string }
export type PlaylistPrivacy = 'public' | 'private' | 'link'
export type SocialPlaylist = { id: string; title: string; description: string; coverUrl?: string; privacy: PlaylistPrivacy; trackIds: string[]; createdAt: string; system?: boolean }
export type Blend = { id: string; friendId: string; friendName: string; friendInitials: string; trackIds: string[]; matchScore: number; createdAt: string }

type State = { reposts: Repost[]; spotlight: Record<string, string[]>; settings: Record<string, CreatorSettings>; followingArtistIds: string[]; likedTrackIds: string[]; playlists: SocialPlaylist[]; blends: Blend[] }
type SocialContext = {
  reposts: Repost[]
  playlists: SocialPlaylist[]
  likedPlaylist: SocialPlaylist
  blends: Blend[]
  followingArtistIds: string[]
  likedTrackIds: string[]
  spotlightFor: (artistId: string) => string[]
  isReposted: (releaseId: string) => boolean
  isFollowing: (artistId: string) => boolean
  isLiked: (trackId: string) => boolean
  toggleRepost: (releaseId: string, title: string, username?: string) => void
  toggleFollow: (artistId: string) => void
  toggleLike: (trackId: string) => void
  toggleSpotlight: (artistId: string, releaseId: string) => { error?: string }
  createPlaylist: (input: Pick<SocialPlaylist, 'title' | 'description' | 'coverUrl' | 'privacy'>) => SocialPlaylist
  updatePlaylist: (playlistId: string, patch: Partial<Pick<SocialPlaylist, 'title' | 'description' | 'coverUrl' | 'privacy'>>) => void
  deletePlaylist: (playlistId: string) => void
  toggleTrackInPlaylist: (playlistId: string, trackId: string) => void
  createBlend: (friend: { id: string; name: string; initials: string }, trackIds: string[], matchScore: number) => Blend
  getSettings: (releaseId: string) => CreatorSettings
  patchSettings: (releaseId: string, patch: Partial<CreatorSettings>) => void
}

const KEY = 'gul.social.v2'
const LEGACY_KEY = 'gul.social.creator.v1'
const likedPlaylist = (trackIds: string[]): SocialPlaylist => ({ id: 'liked', title: 'Мне нравится', description: 'Треки, которые вы сохранили сердцем.', privacy: 'private', trackIds, createdAt: 'system', system: true })
const emptyState = (): State => ({ reposts: [], spotlight: {}, settings: {}, followingArtistIds: [], likedTrackIds: [], playlists: [], blends: [] })
const defaultSettings = (): CreatorSettings => ({ allowDownload: false, secretToken: crypto.randomUUID().replaceAll('-', ''), externalLinks: { vk: '', telegram: '', bandcamp: '', boosty: '', spotify: '' } })
const Ctx = createContext<SocialContext | null>(null)

function normalizeState(value: unknown): State {
  if (!value || typeof value !== 'object') return emptyState()
  const raw = value as Partial<State>
  return {
    reposts: Array.isArray(raw.reposts) ? raw.reposts as Repost[] : [],
    spotlight: raw.spotlight && typeof raw.spotlight === 'object' ? raw.spotlight as Record<string, string[]> : {},
    settings: raw.settings && typeof raw.settings === 'object' ? raw.settings as Record<string, CreatorSettings> : {},
    followingArtistIds: Array.isArray(raw.followingArtistIds) ? raw.followingArtistIds.filter((id): id is string => typeof id === 'string') : [],
    likedTrackIds: Array.isArray(raw.likedTrackIds) ? raw.likedTrackIds.filter((id): id is string => typeof id === 'string') : [],
    playlists: Array.isArray(raw.playlists) ? raw.playlists.filter((item): item is SocialPlaylist => Boolean(item) && typeof item === 'object' && typeof (item as SocialPlaylist).id === 'string' && Array.isArray((item as SocialPlaylist).trackIds)) : [],
    blends: Array.isArray(raw.blends) ? raw.blends as Blend[] : [],
  }
}

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(emptyState)
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY) ?? window.localStorage.getItem(LEGACY_KEY)
      if (raw) setState(normalizeState(JSON.parse(raw)))
    } catch { window.localStorage.removeItem(KEY) } finally { setHydrated(true) }
  }, [])
  useEffect(() => { if (hydrated) window.localStorage.setItem(KEY, JSON.stringify(state)) }, [hydrated, state])

  const getSettings = useCallback((releaseId: string) => state.settings[releaseId] ?? defaultSettings(), [state.settings])
  const value = useMemo<SocialContext>(() => ({
    reposts: state.reposts,
    playlists: state.playlists,
    likedPlaylist: likedPlaylist(state.likedTrackIds),
    blends: state.blends,
    followingArtistIds: state.followingArtistIds,
    likedTrackIds: state.likedTrackIds,
    spotlightFor: (artistId) => state.spotlight[artistId] ?? [],
    isReposted: (releaseId) => state.reposts.some((repost) => repost.releaseId === releaseId),
    isFollowing: (artistId) => state.followingArtistIds.includes(artistId),
    isLiked: (trackId) => state.likedTrackIds.includes(trackId),
    toggleRepost: (releaseId, title, username = 'you') => setState((previous) => previous.reposts.some((repost) => repost.releaseId === releaseId) ? { ...previous, reposts: previous.reposts.filter((repost) => repost.releaseId !== releaseId) } : { ...previous, reposts: [{ id: crypto.randomUUID(), releaseId, title, username, createdAt: new Date().toISOString() }, ...previous.reposts] }),
    toggleFollow: (artistId) => setState((previous) => ({ ...previous, followingArtistIds: previous.followingArtistIds.includes(artistId) ? previous.followingArtistIds.filter((id) => id !== artistId) : [...previous.followingArtistIds, artistId] })),
    toggleLike: (trackId) => setState((previous) => ({ ...previous, likedTrackIds: previous.likedTrackIds.includes(trackId) ? previous.likedTrackIds.filter((id) => id !== trackId) : [trackId, ...previous.likedTrackIds] })),
    toggleSpotlight: (artistId, releaseId) => {
      const current = state.spotlight[artistId] ?? []
      if (!current.includes(releaseId) && current.length >= 3) return { error: 'Можно закрепить не более трёх релизов.' }
      setState((previous) => ({ ...previous, spotlight: { ...previous.spotlight, [artistId]: current.includes(releaseId) ? current.filter((id) => id !== releaseId) : [...current, releaseId] } }))
      return {}
    },
    createPlaylist: (input) => {
      const playlist: SocialPlaylist = { id: crypto.randomUUID(), title: input.title.trim(), description: input.description.trim(), coverUrl: input.coverUrl?.trim() || undefined, privacy: input.privacy, trackIds: [], createdAt: new Date().toISOString() }
      setState((previous) => ({ ...previous, playlists: [playlist, ...previous.playlists] }))
      return playlist
    },
    updatePlaylist: (playlistId, patch) => setState((previous) => ({ ...previous, playlists: previous.playlists.map((playlist) => playlist.id === playlistId ? { ...playlist, ...patch } : playlist) })),
    deletePlaylist: (playlistId) => setState((previous) => ({ ...previous, playlists: previous.playlists.filter((playlist) => playlist.id !== playlistId) })),
    toggleTrackInPlaylist: (playlistId, trackId) => {
      if (playlistId === 'liked') { setState((previous) => ({ ...previous, likedTrackIds: previous.likedTrackIds.includes(trackId) ? previous.likedTrackIds.filter((id) => id !== trackId) : [trackId, ...previous.likedTrackIds] })); return }
      setState((previous) => ({ ...previous, playlists: previous.playlists.map((playlist) => playlist.id === playlistId ? { ...playlist, trackIds: playlist.trackIds.includes(trackId) ? playlist.trackIds.filter((id) => id !== trackId) : [...playlist.trackIds, trackId] } : playlist) }))
    },
    createBlend: (friend, trackIds, matchScore) => {
      const blend: Blend = { id: crypto.randomUUID(), friendId: friend.id, friendName: friend.name, friendInitials: friend.initials, trackIds: [...new Set(trackIds)], matchScore, createdAt: new Date().toISOString() }
      setState((previous) => ({ ...previous, blends: [blend, ...previous.blends] }))
      return blend
    },
    getSettings,
    patchSettings: (releaseId, patch) => setState((previous) => ({ ...previous, settings: { ...previous.settings, [releaseId]: { ...(previous.settings[releaseId] ?? defaultSettings()), ...patch } } })),
  }), [getSettings, state.blends, state.followingArtistIds, state.likedTrackIds, state.playlists, state.reposts, state.spotlight])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSocial() {
  const context = useContext(Ctx)
  if (!context) throw new Error('useSocial must be used within SocialProvider')
  return context
}
