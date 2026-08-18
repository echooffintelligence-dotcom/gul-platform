'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { chart as seedChart, getTrack as getSeedTrack, releases as seedReleases, rztTotal, type ChartEntry, type CoverKey, type Credit, type Release, type RztScore, type Track } from '@/lib/data'

type PublishReleaseInput = {
  releaseTitle: string
  kind: 'сингл' | 'EP' | 'альбом'
  genre: string
  artistId: string
  artistName: string
  ownerId: string
  trackTitle: string
  durationSec: number
  audioUrl: string
  coverUrl?: string
}

type PublishedRelease = { release: Release; track: Track }

type ReleaseStore = {
  releases: Release[]
  chart: ChartEntry[]
  customTracks: Track[]
  hydrated: boolean
  getRelease: (id: string) => Release | undefined
  getTrack: (id: string) => Track | undefined
  rateRelease: (releaseId: string, score: RztScore) => void
  publishRelease: (input: PublishReleaseInput) => PublishedRelease
}

const STORAGE_KEY = 'gul.releases.v2'
const Ctx = createContext<ReleaseStore | null>(null)
type StoredState = { releases: Release[]; chart: ChartEntry[]; customTracks: Track[] }

function cloneSeeds(): StoredState {
  return JSON.parse(JSON.stringify({ releases: seedReleases, chart: seedChart, customTracks: [] })) as StoredState
}

function isStoredState(value: unknown): value is StoredState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<StoredState>
  return Array.isArray(candidate.releases) && Array.isArray(candidate.chart) && Array.isArray(candidate.customTracks)
}

function mmss(seconds: number) {
  const safe = Math.max(0, Math.round(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

export function rztAverage(distribution: number[]) {
  const votes = distribution.reduce((sum, count) => sum + count, 0)
  if (votes === 0) return 0
  return distribution.reduce((sum, count, index) => sum + (10 - index) * count, 0) / votes
}

export function ReleaseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoredState>(cloneSeeds)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const stored: unknown = JSON.parse(raw)
        if (isStoredState(stored)) setState(stored)
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [hydrated, state])

  const rateRelease = useCallback((releaseId: string, score: RztScore) => {
    const rating = rztTotal(score)
    const bucket = Math.max(1, Math.min(10, Math.round(rating)))
    setState((previous) => {
      const releases = previous.releases.map((release) => {
        if (release.id !== releaseId) return release
        const distribution = [...release.distribution]
        while (distribution.length < 10) distribution.push(0)
        distribution[10 - bucket] += 1
        return { ...release, votes: release.votes + 1, distribution }
      })
      const updatedRelease = releases.find((release) => release.id === releaseId)
      const average = updatedRelease ? rztAverage(updatedRelease.distribution) : rating
      const chart = previous.chart.map((entry) => entry.releaseId === releaseId ? { ...entry, score: Math.round(average * 10) / 10, votes: updatedRelease?.votes ?? 0 } : entry)
      return { ...previous, releases, chart }
    })
  }, [])

  const publishRelease = useCallback((input: PublishReleaseInput): PublishedRelease => {
    const releaseId = `release-${crypto.randomUUID()}`
    const trackId = `track-${crypto.randomUUID()}`
    const cover: CoverKey = 'c1'
    const credits: Credit[] = [{ artistId: input.artistId, name: input.artistName }]
    const track: Track = {
      id: trackId,
      title: input.trackTitle.trim(),
      credits,
      duration: mmss(input.durationSec),
      durationSec: input.durationSec,
      plays: 0,
      cover,
      coverUrl: input.coverUrl,
      audioUrl: input.audioUrl,
      hasLyrics: false,
      releaseId,
      owner_id: input.ownerId,
    }
    const release: Release = {
      id: releaseId,
      title: input.releaseTitle.trim(),
      kind: input.kind,
      genre: input.genre,
      year: new Date().getFullYear(),
      cover,
      coverUrl: input.coverUrl,
      artistIds: [input.artistId],
      plays: 0,
      trackIds: [trackId],
      votes: 0,
      reviewCount: 0,
      editorial: null,
      distribution: Array(10).fill(0),
      reviews: [],
      owner_id: input.ownerId,
    }
    const entry: ChartEntry = {
      trackId, title: track.title, credits, cover, coverUrl: input.coverUrl, score: 0, votes: 0, plays24: 0, playsWeek: 0, move: 'new', releaseId, fresh: true,
    }
    setState((previous) => ({ releases: [release, ...previous.releases], chart: [entry, ...previous.chart], customTracks: [track, ...previous.customTracks] }))
    return { release, track }
  }, [])

  const getRelease = useCallback((id: string) => state.releases.find((release) => release.id === id), [state.releases])
  const getTrack = useCallback((id: string) => state.customTracks.find((track) => track.id === id) ?? getSeedTrack(id), [state.customTracks])

  const value = useMemo<ReleaseStore>(() => ({ releases: state.releases, chart: state.chart, customTracks: state.customTracks, hydrated, getRelease, getTrack, rateRelease, publishRelease }), [state.releases, state.chart, state.customTracks, hydrated, getRelease, getTrack, rateRelease, publishRelease])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useReleases() {
  const context = useContext(Ctx)
  if (!context) throw new Error('useReleases must be used within ReleaseProvider')
  return context
}
