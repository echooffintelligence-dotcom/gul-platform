'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { CoverKey, Credit, LyricLine, Track } from '@/lib/data'
import { chart, getTrack, lyricsByTrack } from '@/lib/data'

const AUDIO_FALLBACK = '/audio/gul-demo.wav'
const lyricsStorageKey = (trackId: string) => `gul.lyrics.${trackId}.v1`
const commentsStorageKey = (trackId: string) => `gul.comments.${trackId}.v1`

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

export type TimedComment = {
  id: string
  trackId: string
  seconds: number
  author: string
  initials: string
  text: string
  color: 'b' | 'r' | 'o' | 'g'
}

type PlayerState = {
  current: NowPlaying
  currentTrack: NowPlaying
  time: number
  playing: boolean
  isPlaying: boolean
  volume: number
  muted: boolean
  loop: boolean
  shuffle: boolean
  lyricsOpen: boolean
  editingLyrics: boolean
  lyrics: LyricLine[]
  queue: NowPlaying[]
  queueOpen: boolean
  comments: TimedComment[]
  commentMode: boolean
  visualizerEnabled: boolean
  frequencyData: number[]
  play: (track: NowPlaying) => void
  playTrack: (track: NowPlaying) => void
  pause: () => void
  resume: () => void
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
  setTimedLyrics: (lines: LyricLine[]) => void
  stampLine: (index: number) => void
  jumpToLine: (seconds: number) => void
  toggleQueue: () => void
  addToQueue: (track: NowPlaying) => void
  moveQueueItem: (index: number, direction: -1 | 1) => void
  removeQueueItem: (index: number) => void
  clearQueue: () => void
  saveQueueAsPlaylist: () => void
  toggleCommentMode: () => void
  addComment: (seconds: number, text: string) => void
  toggleVisualizer: () => void
}

const Ctx = createContext<PlayerState | null>(null)

function toNowPlaying(track: Track): NowPlaying {
  return { id: track.id, title: track.title, credits: track.credits, cover: track.cover, coverUrl: track.coverUrl, durationSec: track.durationSec, audioUrl: track.audioUrl ?? AUDIO_FALLBACK, waveform: track.waveform, releaseId: track.releaseId }
}

function loadLyrics(trackId: string): LyricLine[] {
  if (typeof window === 'undefined') return lyricsByTrack[trackId]?.map((line) => ({ ...line })) ?? []
  try {
    const raw = window.localStorage.getItem(lyricsStorageKey(trackId))
    if (raw) {
      const saved: unknown = JSON.parse(raw)
      if (Array.isArray(saved)) return saved as LyricLine[]
    }
  } catch { window.localStorage.removeItem(lyricsStorageKey(trackId)) }
  return lyricsByTrack[trackId]?.map((line) => ({ ...line })) ?? []
}

function loadComments(trackId: string): TimedComment[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(commentsStorageKey(trackId))
    const saved: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(saved) ? saved.filter((item): item is TimedComment => Boolean(item) && typeof item === 'object' && typeof (item as TimedComment).seconds === 'number' && typeof (item as TimedComment).text === 'string') : []
  } catch { return [] }
}

const initialTrack = getTrack(chart[0].trackId) ?? { id: chart[0].trackId, title: chart[0].title, credits: chart[0].credits, cover: chart[0].cover, durationSec: 18, plays: 0, duration: '0:18', releaseId: chart[0].releaseId }

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const rafRef = useRef<number | null>(null)
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
  const [queue, setQueue] = useState<NowPlaying[]>([])
  const [queueOpen, setQueueOpen] = useState(false)
  const [comments, setComments] = useState<TimedComment[]>(() => loadComments(initialTrack.id))
  const [commentMode, setCommentMode] = useState(false)
  const [visualizerEnabled, setVisualizerEnabled] = useState(false)
  const [frequencyData, setFrequencyData] = useState<number[]>(Array(48).fill(0))

  const ensureAnalyser = useCallback(() => {
    const audio = audioRef.current
    if (!audio || analyserRef.current) return
    try {
      const AudioContextCtor = window.AudioContext
      if (!AudioContextCtor) return
      const context = new AudioContextCtor()
      const source = context.createMediaElementSource(audio)
      const analyser = context.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.78
      source.connect(analyser)
      analyser.connect(context.destination)
      contextRef.current = context
      sourceRef.current = source
      analyserRef.current = analyser
      const values = new Uint8Array(analyser.frequencyBinCount)
      const render = () => {
        analyser.getByteFrequencyData(values)
        setFrequencyData(Array.from(values.slice(0, 48), (value) => value / 255))
        rafRef.current = window.requestAnimationFrame(render)
      }
      render()
    } catch { setVisualizerEnabled(false) }
  }, [])

  useEffect(() => {
    const audio = new Audio(AUDIO_FALLBACK)
    audio.preload = 'metadata'
    audio.volume = 0.8
    audioRef.current = audio
    const onTimeUpdate = () => setTime(audio.currentTime)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onVolumeChange = () => { setVolumeState(audio.volume); setMuted(audio.muted) }
    const onLoadedMetadata = () => { if (Number.isFinite(audio.duration) && audio.duration > 0) setCurrent((previous) => ({ ...previous, durationSec: audio.duration })) }
    const onError = () => setPlaying(false)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('volumechange', onVolumeChange)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('error', onError)
    return () => {
      audio.pause()
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current)
      void contextRef.current?.close()
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
    const isSameTrack = current.id === track.id
    if (isSameTrack && audio) {
      if (audio.paused) { ensureAnalyser(); void audio.play().catch(() => setPlaying(false)) } else audio.pause()
      return
    }
    setCurrent(track)
    setTime(0)
    setEditing(false)
    setLyrics(loadLyrics(track.id))
    setComments(loadComments(track.id))
    if (!audio) return
    const absoluteUrl = new URL(track.audioUrl, window.location.origin).href
    if (audio.src !== absoluteUrl) { audio.src = track.audioUrl; audio.load() }
    audio.currentTime = 0
    ensureAnalyser()
    void audio.play().catch(() => setPlaying(false))
  }, [current.id, ensureAnalyser])

  const pause = useCallback(() => audioRef.current?.pause(), [])
  const resume = useCallback(() => { ensureAnalyser(); void audioRef.current?.play().catch(() => setPlaying(false)) }, [ensureAnalyser])
  const togglePlay = useCallback(() => { if (audioRef.current?.paused) resume(); else pause() }, [pause, resume])
  const seek = useCallback((seconds: number) => { const safe = Math.max(0, Math.min(current.durationSec || 0, seconds)); setTime(safe); if (audioRef.current) audioRef.current.currentTime = safe }, [current.durationSec])
  const seekFraction = useCallback((fraction: number) => seek(Math.max(0, Math.min(1, fraction)) * current.durationSec), [current.durationSec, seek])
  const setVolume = useCallback((value: number) => { const safe = Math.max(0, Math.min(1, value)); setVolumeState(safe); setMuted(false); if (audioRef.current) { audioRef.current.volume = safe; audioRef.current.muted = false } }, [])
  const toggleMute = useCallback(() => { const nextMuted = !audioRef.current?.muted; setMuted(nextMuted); if (audioRef.current) audioRef.current.muted = nextMuted }, [])
  const toggleLoop = useCallback(() => setLoop((value) => !value), [])
  const toggleShuffle = useCallback(() => setShuffle((value) => !value), [])

  useEffect(() => { if (audioRef.current) audioRef.current.loop = loop }, [loop])

  const stationTrack = useCallback((excludeId: string) => {
    const eligible = chart.filter((entry) => entry.trackId !== excludeId)
    const selected = eligible[Math.floor(Math.random() * Math.max(eligible.length, 1))]
    return selected ? getTrack(selected.trackId) : undefined
  }, [])

  const next = useCallback(() => {
    if (queue.length) {
      const [candidate, ...rest] = queue
      setQueue(rest)
      play(candidate)
      return
    }
    const index = chart.findIndex((entry) => entry.trackId === current.id)
    const nextIndex = shuffle && chart.length > 1 ? (() => { let candidate = Math.floor(Math.random() * chart.length); if (candidate === index) candidate = (candidate + 1) % chart.length; return candidate })() : (index < 0 ? 0 : index + 1)
    const entry = chart[nextIndex % chart.length]
    const track = entry ? getTrack(entry.trackId) : stationTrack(current.id)
    if (track) play(toNowPlaying(track))
  }, [current.id, play, queue, shuffle, stationTrack])

  const prev = useCallback(() => { const index = chart.findIndex((entry) => entry.trackId === current.id); const entry = chart[(index - 1 + chart.length) % chart.length]; const track = entry ? getTrack(entry.trackId) : undefined; if (track) play(toNowPlaying(track)) }, [current.id, play])
  useEffect(() => { const audio = audioRef.current; if (!audio) return; audio.onended = loop ? null : next; return () => { audio.onended = null } }, [next, loop])

  const persistLyrics = useCallback((nextLyrics: LyricLine[]) => { setLyrics(nextLyrics); window.localStorage.setItem(lyricsStorageKey(current.id), JSON.stringify(nextLyrics)) }, [current.id])
  const setLyricsFromText = useCallback((text: string) => { persistLyrics(text.split(/\r?\n/).map((line, index) => ({ t: index === 0 ? 0 : index * 4, text: line.trim() })).filter((line) => line.text.length > 0)) }, [persistLyrics])
  const setTimedLyrics = useCallback((lines: LyricLine[]) => persistLyrics(lines), [persistLyrics])
  const stampLine = useCallback((index: number) => { persistLyrics(lyrics.map((line, lineIndex) => lineIndex === index ? { ...line, t: Math.round(time * 100) / 100 } : { ...line }).sort((first, second) => first.t - second.t)) }, [lyrics, persistLyrics, time])
  const jumpToLine = useCallback((seconds: number) => seek(seconds), [seek])

  const addComment = useCallback((seconds: number, rawText: string) => {
    const text = rawText.trim()
    if (!text) return
    const next = [...comments, { id: crypto.randomUUID(), trackId: current.id, seconds: Math.max(0, Math.min(current.durationSec, seconds)), author: 'Вы', initials: 'ВЫ', text: text.slice(0, 280), color: 'b' as const }].sort((a, b) => a.seconds - b.seconds)
    setComments(next)
    window.localStorage.setItem(commentsStorageKey(current.id), JSON.stringify(next))
    setCommentMode(false)
  }, [comments, current.durationSec, current.id])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select, [contenteditable=true]')) return
      if ((event.code === 'Space' || event.key === 'Enter') && editingLyrics) return
      if (event.code === 'Space') { event.preventDefault(); togglePlay() }
      if (event.code === 'ArrowLeft') { event.preventDefault(); seek(time - 5) }
      if (event.code === 'ArrowRight') { event.preventDefault(); seek(time + 5) }
      if (event.key.toLowerCase() === 'm') { event.preventDefault(); toggleMute() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editingLyrics, seek, time, toggleMute, togglePlay])

  const value = useMemo<PlayerState>(() => ({
    current, currentTrack: current, time, playing, isPlaying: playing, volume, muted, loop, shuffle, lyricsOpen, editingLyrics, lyrics, queue, queueOpen, comments, commentMode, visualizerEnabled, frequencyData,
    play, playTrack: play, pause, resume, togglePlay, seek, seekFraction, setVolume, toggleMute, toggleLoop, toggleShuffle, next, prev,
    setLyricsOpen, toggleLyrics: () => setLyricsOpen((open) => !open), toggleEditing: () => setEditing((value) => !value), setLyricsFromText, setTimedLyrics, stampLine, jumpToLine,
    toggleQueue: () => setQueueOpen((open) => !open), addToQueue: (track) => setQueue((existing) => [...existing, track]), moveQueueItem: (index, direction) => setQueue((existing) => { const target = index + direction; if (target < 0 || target >= existing.length) return existing; const nextQueue = [...existing]; [nextQueue[index], nextQueue[target]] = [nextQueue[target], nextQueue[index]]; return nextQueue }), removeQueueItem: (index) => setQueue((existing) => existing.filter((_, itemIndex) => itemIndex !== index)), clearQueue: () => setQueue([]), saveQueueAsPlaylist: () => window.localStorage.setItem('gul.playlist.last.v1', JSON.stringify(queue)),
    toggleCommentMode: () => setCommentMode((enabled) => !enabled), addComment, toggleVisualizer: () => { setVisualizerEnabled((enabled) => { const nextValue = !enabled; if (nextValue) ensureAnalyser(); return nextValue }) },
  }), [addComment, commentMode, comments, current, editingLyrics, frequencyData, jumpToLine, loop, lyrics, lyricsOpen, muted, next, pause, playing, prev, queue, queueOpen, resume, seek, seekFraction, setLyricsFromText, setTimedLyrics, shuffle, stampLine, time, toggleLoop, toggleMute, togglePlay, toggleShuffle, visualizerEnabled, volume, ensureAnalyser])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePlayer() {
  const context = useContext(Ctx)
  if (!context) throw new Error('usePlayer must be used within PlayerProvider')
  return context
}
