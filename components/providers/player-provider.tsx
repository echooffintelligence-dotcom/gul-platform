'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { CoverKey, Credit, LyricLine, Track } from '@/lib/data'
import { chart, getTrack, lyricsByTrack } from '@/lib/data'

const AUDIO_FALLBACK = '/audio/gul-demo.wav'
const lyricsStorageKey = (trackId: string) => `gul.lyrics.${trackId}.v1`

export type NowPlaying = {
  id: string
  title: string
  credits: Credit[]
  cover: CoverKey
  coverUrl?: string
  durationSec: number
  audioUrl: string
  waveform?: number[]
  releaseId?: string
}

type PlayerState = {
  current: NowPlaying
  time: number
  playing: boolean
  volume: number
  muted: boolean
  loop: boolean
  shuffle: boolean
  lyricsOpen: boolean
  editingLyrics: boolean
  lyrics: LyricLine[]
  play: (track: NowPlaying) => void
  togglePlay: () => void
  seek: (seconds: number) => void
  seekFraction: (fraction: number) => void
  setVolume: (value: number) => void
  toggleMute: () => void
  toggleLoop: () => void
  toggleShuffle: () => void
  next: () => void
  prev: () => void
  setLyricsOpen: (value: boolean) => void
  toggleLyrics: () => void
  toggleEditing: () => void
  setLyricsFromText: (text: string) => void
  stampLine: (index: number) => void
  jumpToLine: (seconds: number) => void
}

const Ctx = createContext<PlayerState | null>(null)

function toNowPlaying(track: Track): NowPlaying {
  return {
    id: track.id,
    title: track.title,
    credits: track.credits,
    cover: track.cover,
    coverUrl: track.coverUrl,
    durationSec: track.durationSec,
    audioUrl: track.audioUrl ?? AUDIO_FALLBACK,
    waveform: track.waveform,
    releaseId: track.releaseId,
  }
}

function loadLyrics(trackId: string): LyricLine[] {
  if (typeof window === 'undefined') return lyricsByTrack[trackId]?.map((line) => ({ ...line })) ?? []
  try {
    const raw = window.localStorage.getItem(lyricsStorageKey(trackId))
    if (raw) {
      const saved: unknown = JSON.parse(raw)
      if (Array.isArray(saved)) return saved as LyricLine[]
    }
  } catch {
    window.localStorage.removeItem(lyricsStorageKey(trackId))
  }
  return lyricsByTrack[trackId]?.map((line) => ({ ...line })) ?? []
}

const initialTrack = getTrack(chart[0].trackId) ?? {
  id: chart[0].trackId, title: chart[0].title, credits: chart[0].credits, cover: chart[0].cover, durationSec: 18, plays: 0, duration: '0:18', releaseId: chart[0].releaseId,
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [current, setCurrent] = useState<NowPlaying>(() => toNowPlaying(initialTrack))
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolumeState] = useState(0.8)
  const [muted, setMuted] = useState(false)
  const [loop, setLoop] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [lyricsOpen, setLyricsOpen] = useState(true)
  const [editingLyrics, setEditing] = useState(false)
  const [lyrics, setLyrics] = useState<LyricLine[]>(() => loadLyrics(initialTrack.id))

  useEffect(() => {
    const audio = new Audio(AUDIO_FALLBACK)
    audio.preload = 'metadata'
    audio.volume = 0.8
    audioRef.current = audio
    const onTimeUpdate = () => setTime(audio.currentTime)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onVolumeChange = () => { setVolumeState(audio.volume); setMuted(audio.muted) }
    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setCurrent((previous) => ({ ...previous, durationSec: audio.duration }))
    }
    const onError = () => setPlaying(false)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('volumechange', onVolumeChange)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('error', onError)
    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('volumechange', onVolumeChange)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('error', onError)
      audioRef.current = null
    }
  }, [])

  const play = useCallback((track: NowPlaying) => {
    const audio = audioRef.current
    setCurrent(track)
    setTime(0)
    setEditing(false)
    setLyrics(loadLyrics(track.id))
    if (!audio) return
    const absoluteUrl = new URL(track.audioUrl, window.location.origin).href
    if (audio.src !== absoluteUrl) { audio.src = track.audioUrl; audio.load() }
    audio.currentTime = 0
    void audio.play().catch(() => setPlaying(false))
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play().catch(() => setPlaying(false))
    else audio.pause()
  }, [])

  const seek = useCallback((seconds: number) => {
    const safe = Math.max(0, Math.min(current.durationSec || 0, seconds))
    setTime(safe)
    if (audioRef.current) audioRef.current.currentTime = safe
  }, [current.durationSec])

  const seekFraction = useCallback((fraction: number) => seek(Math.max(0, Math.min(1, fraction)) * current.durationSec), [current.durationSec, seek])

  const setVolume = useCallback((value: number) => {
    const safe = Math.max(0, Math.min(1, value))
    setVolumeState(safe)
    setMuted(false)
    if (audioRef.current) { audioRef.current.volume = safe; audioRef.current.muted = false }
  }, [])

  const toggleMute = useCallback(() => {
    const nextMuted = !audioRef.current?.muted
    setMuted(nextMuted)
    if (audioRef.current) audioRef.current.muted = nextMuted
  }, [])

  const toggleLoop = useCallback(() => setLoop((value) => !value), [])
  const toggleShuffle = useCallback(() => setShuffle((value) => !value), [])

  useEffect(() => {
    if (audioRef.current) audioRef.current.loop = loop
  }, [loop])

  const playChartIndex = useCallback((index: number) => {
    const entry = chart[(index + chart.length) % chart.length]
    const track = getTrack(entry.trackId)
    if (track) play(toNowPlaying(track))
  }, [play])

  const next = useCallback(() => {
    const index = chart.findIndex((entry) => entry.trackId === current.id)
    const nextIndex = shuffle && chart.length > 1 ? (() => { let candidate = Math.floor(Math.random() * chart.length); if (candidate === index) candidate = (candidate + 1) % chart.length; return candidate })() : (index < 0 ? 0 : index + 1)
    playChartIndex(nextIndex)
  }, [current.id, playChartIndex, shuffle])

  const prev = useCallback(() => {
    const index = chart.findIndex((entry) => entry.trackId === current.id)
    playChartIndex(index < 0 ? 0 : index - 1)
  }, [current.id, playChartIndex])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.onended = loop ? null : next
    return () => { audio.onended = null }
  }, [next, loop])

  const toggleLyrics = useCallback(() => setLyricsOpen((value) => !value), [])
  const toggleEditing = useCallback(() => setEditing((value) => !value), [])

  const persistLyrics = useCallback((nextLyrics: LyricLine[]) => {
    setLyrics(nextLyrics)
    window.localStorage.setItem(lyricsStorageKey(current.id), JSON.stringify(nextLyrics))
  }, [current.id])

  const setLyricsFromText = useCallback((text: string) => {
    const nextLyrics = text.split(/\r?\n/).map((line, index) => ({ t: index === 0 ? 0 : index * 4, text: line.trim() })).filter((line) => line.text.length > 0)
    persistLyrics(nextLyrics)
  }, [persistLyrics])

  const stampLine = useCallback((index: number) => {
    const nextLyrics = lyrics.map((line, lineIndex) => lineIndex === index ? { ...line, t: Math.floor(time) } : { ...line }).sort((first, second) => first.t - second.t)
    persistLyrics(nextLyrics)
  }, [lyrics, persistLyrics, time])

  const jumpToLine = useCallback((seconds: number) => seek(seconds), [seek])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select, [contenteditable=true]')) return
      if (event.code === 'Space' && !editingLyrics) { event.preventDefault(); togglePlay() }
      if (event.code === 'ArrowLeft') { event.preventDefault(); seek(time - 5) }
      if (event.code === 'ArrowRight') { event.preventDefault(); seek(time + 5) }
      if (event.key.toLowerCase() === 'm') { event.preventDefault(); toggleMute() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editingLyrics, seek, time, toggleMute, togglePlay])

  const value = useMemo<PlayerState>(() => ({
    current, time, playing, volume, muted, loop, shuffle, lyricsOpen, editingLyrics, lyrics, play, togglePlay, seek, seekFraction, setVolume, toggleMute, toggleLoop, toggleShuffle, next, prev, setLyricsOpen, toggleLyrics, toggleEditing, setLyricsFromText, stampLine, jumpToLine,
  }), [current, time, playing, volume, muted, loop, shuffle, lyricsOpen, editingLyrics, lyrics, play, togglePlay, seek, seekFraction, setVolume, toggleMute, toggleLoop, toggleShuffle, next, prev, toggleLyrics, toggleEditing, setLyricsFromText, stampLine, jumpToLine])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePlayer() {
  const context = useContext(Ctx)
  if (!context) throw new Error('usePlayer must be used within PlayerProvider')
  return context
}
