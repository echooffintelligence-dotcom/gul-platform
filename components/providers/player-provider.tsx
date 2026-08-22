'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { CoverKey, Credit, LyricLine, Track } from '@/lib/data'
import { chart, getTrack, lyricsByTrack, tracks as seedTracks } from '@/lib/data'
import { recommendTracks } from '@/lib/recommend'
import { useReleases } from '@/components/providers/release-provider'
import { useSocial } from '@/components/providers/social-provider'

const AUDIO_FALLBACK = '/audio/gul-demo.wav'
const lyricsStorageKey = (trackId: string) => `gul.lyrics.${trackId}.v1`
const commentsStorageKey = (trackId: string) => `gul.comments.${trackId}.v1`

export type NowPlaying = {
  id: string
  title: string
  credits: Credit[]
  featuring?: string[]
  cover: CoverKey
  coverUrl?: string
  durationSec: number
  audioUrl: string
  waveform?: number[]
  releaseId?: string
  /** Показывает бейдж 🤖 AI в плеере. */
  isAiGenerated?: boolean
  /** Видеоклип: включает кнопку «Клип» в плеере. */
  videoUrl?: string
}

/** Режимы повтора: выключен / по кругу весь список / один трек. */
export type RepeatMode = 'off' | 'all' | 'one'

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
  repeat: RepeatMode
  shuffle: boolean
  lyricsOpen: boolean
  editingLyrics: boolean
  lyrics: LyricLine[]
  queue: NowPlaying[]
  queueOpen: boolean
  /** «Моя волна»: бесконечный поток, который сам дополняет очередь. */
  waveActive: boolean
  /** Открыт полноэкранный просмотр клипа. */
  clipOpen: boolean
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
  cycleRepeat: () => void
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
  toggleWave: () => void
  setClipOpen: (value: boolean) => void
  playCollection: (tracks: NowPlaying[], startIndex?: number) => void
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

export function toNowPlaying(track: Track): NowPlaying {
  return { id: track.id, title: track.title, credits: track.credits, featuring: track.featuring, cover: track.cover, coverUrl: track.coverUrl, durationSec: track.durationSec, audioUrl: track.audioUrl ?? AUDIO_FALLBACK, waveform: track.waveform, releaseId: track.releaseId, isAiGenerated: track.isAiGenerated, videoUrl: track.videoUrl }
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
  const { customTracks, getRelease } = useReleases()
  const { recordPlay, addListenSeconds, likedTrackIds, history, followingArtistIds } = useSocial()
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
  const [repeat, setRepeat] = useState<RepeatMode>('off')
  const loop = repeat === 'one'
  const [shuffle, setShuffle] = useState(false)
  // false: текст теперь полноэкранный, открытый по умолчанию перекрыл бы весь сайт.
  const [lyricsOpen, setLyricsOpen] = useState(false)
  const [editingLyrics, setEditing] = useState(false)
  const [lyrics, setLyrics] = useState<LyricLine[]>(() => loadLyrics(initialTrack.id))
  const [queue, setQueue] = useState<NowPlaying[]>([])
  const [queueOpen, setQueueOpen] = useState(false)
  const [waveActive, setWaveActive] = useState(false)
  const [clipOpen, setClipOpen] = useState(false)
  const [waveSeed, setWaveSeed] = useState(1)
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
    // История пополняется на каждом осознанном запуске — это вход для «Моей волны».
    recordPlay(track.id)
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
  }, [current.id, ensureAnalyser, recordPlay])

  /**
   * Учёт наслушанного времени для «Топа артистов месяца».
   * Считаем интервалом, а не по timeupdate: перемотка не должна
   * засчитываться как прослушивание.
   */
  useEffect(() => {
    if (!playing) return
    const trackId = current.id
    const timer = window.setInterval(() => addListenSeconds(trackId, 5), 5_000)
    return () => window.clearInterval(timer)
  }, [playing, current.id, addListenSeconds])

  const pause = useCallback(() => audioRef.current?.pause(), [])
  const resume = useCallback(() => { ensureAnalyser(); void audioRef.current?.play().catch(() => setPlaying(false)) }, [ensureAnalyser])
  const togglePlay = useCallback(() => { if (audioRef.current?.paused) resume(); else pause() }, [pause, resume])
  const seek = useCallback((seconds: number) => { const safe = Math.max(0, Math.min(current.durationSec || 0, seconds)); setTime(safe); if (audioRef.current) audioRef.current.currentTime = safe }, [current.durationSec])
  const seekFraction = useCallback((fraction: number) => seek(Math.max(0, Math.min(1, fraction)) * current.durationSec), [current.durationSec, seek])
  const setVolume = useCallback((value: number) => { const safe = Math.max(0, Math.min(1, value)); setVolumeState(safe); setMuted(false); if (audioRef.current) { audioRef.current.volume = safe; audioRef.current.muted = false } }, [])
  const toggleMute = useCallback(() => { const nextMuted = !audioRef.current?.muted; setMuted(nextMuted); if (audioRef.current) audioRef.current.muted = nextMuted }, [])
  // Кнопка перебирает режимы по кругу: выкл → весь список → один трек.
  const cycleRepeat = useCallback(() => setRepeat((mode) => (mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off')), [])
  const toggleLoop = useCallback(() => cycleRepeat(), [cycleRepeat])
  const toggleShuffle = useCallback(() => setShuffle((value) => !value), [])

  useEffect(() => { if (audioRef.current) audioRef.current.loop = loop }, [loop])

  const stationTrack = useCallback((excludeId: string) => {
    const eligible = chart.filter((entry) => entry.trackId !== excludeId)
    const selected = eligible[Math.floor(Math.random() * Math.max(eligible.length, 1))]
    return selected ? getTrack(selected.trackId) : undefined
  }, [])

  /** Полный каталог: демо-треки платформы плюс всё, что опубликовали пользователи. */
  const pool = useMemo<Track[]>(() => {
    const merged = new Map<string, Track>()
    for (const track of seedTracks) merged.set(track.id, track)
    for (const track of customTracks) merged.set(track.id, track)
    return Array.from(merged.values())
  }, [customTracks])

  const playCollection = useCallback((items: NowPlaying[], startIndex = 0) => {
    if (items.length === 0) return
    const start = Math.max(0, Math.min(items.length - 1, startIndex))
    // Запуск подборки выключает волну: слушатель явно выбрал, что играть.
    setWaveActive(false)
    setQueue(items.slice(start + 1))
    play(items[start])
  }, [play])

  /** Подбирает следующую порцию волны с учётом того, что уже прозвучало. */
  const buildWavePicks = useCallback((exclude: Iterable<string>, limit: number, seed: number) => {
    return recommendTracks({
      taste: { likedTrackIds, historyTrackIds: history, followingArtistIds },
      pool,
      getRelease,
      exclude,
      limit,
      seed,
    }).map((pick) => toNowPlaying(pick.item))
  }, [followingArtistIds, getRelease, history, likedTrackIds, pool])

  const toggleWave = useCallback(() => {
    if (waveActive) {
      setWaveActive(false)
      return
    }
    // Новый сид на каждый запуск, иначе волна выдаст ту же последовательность.
    const seed = waveSeed + 1
    setWaveSeed(seed)
    setWaveActive(true)

    // Запускаем первый трек сразу: иначе нажатие «Запустить волну» ничего
    // не меняет до конца текущей песни, и кнопка выглядит сломанной.
    const picks = buildWavePicks([current.id], 6, seed)
    if (picks.length === 0) return
    const [first, ...rest] = picks
    setQueue(rest)
    play(first)
  }, [buildWavePicks, current.id, play, waveActive, waveSeed])

  /**
   * Пополнение «Моей волны».
   *
   * Держим в очереди небольшой запас: поток должен быть бесконечным, но считать
   * рекомендации на весь каталог заранее незачем.
   */
  useEffect(() => {
    if (!waveActive || queue.length >= 3) return
    const exclude = new Set<string>([current.id, ...queue.map((item) => item.id)])
    const picks = buildWavePicks(exclude, 6, waveSeed + history.length)
    if (picks.length === 0) return
    setQueue((existing) => [...existing, ...picks])
  }, [waveActive, queue, current.id, buildWavePicks, history.length, waveSeed])

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
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    // repeat === 'one' закрывает audio.loop, поэтому onended там не нужен.
    if (loop) { audio.onended = null; return () => { audio.onended = null } }
    audio.onended = () => {
      const isLastInChart = chart.findIndex((entry) => entry.trackId === current.id) === chart.length - 1
      // При выключенном повторе список должен заканчиваться, а не идти по кругу.
      if (repeat === 'off' && queue.length === 0 && !waveActive && isLastInChart) { setPlaying(false); return }
      next()
    }
    return () => { audio.onended = null }
  }, [next, loop, repeat, queue.length, waveActive, current.id])

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
    current, currentTrack: current, time, playing, isPlaying: playing, volume, muted, loop, shuffle, lyricsOpen, editingLyrics, lyrics, queue, queueOpen, waveActive, clipOpen, repeat, comments, commentMode, visualizerEnabled, frequencyData,
    play, playTrack: play, pause, resume, togglePlay, seek, seekFraction, setVolume, toggleMute, toggleLoop, cycleRepeat, toggleShuffle, next, prev,
    setLyricsOpen, toggleLyrics: () => setLyricsOpen((open) => !open), toggleEditing: () => setEditing((value) => !value), setLyricsFromText, setTimedLyrics, stampLine, jumpToLine,
    toggleQueue: () => setQueueOpen((open) => !open), toggleWave, setClipOpen, playCollection, addToQueue: (track) => setQueue((existing) => [...existing, track]), moveQueueItem: (index, direction) => setQueue((existing) => { const target = index + direction; if (target < 0 || target >= existing.length) return existing; const nextQueue = [...existing]; [nextQueue[index], nextQueue[target]] = [nextQueue[target], nextQueue[index]]; return nextQueue }), removeQueueItem: (index) => setQueue((existing) => existing.filter((_, itemIndex) => itemIndex !== index)), clearQueue: () => setQueue([]), saveQueueAsPlaylist: () => window.localStorage.setItem('gul.playlist.last.v1', JSON.stringify(queue)),
    toggleCommentMode: () => setCommentMode((enabled) => !enabled), addComment, toggleVisualizer: () => { setVisualizerEnabled((enabled) => { const nextValue = !enabled; if (nextValue) ensureAnalyser(); return nextValue }) },
  }), [addComment, commentMode, comments, current, editingLyrics, frequencyData, jumpToLine, loop, lyrics, lyricsOpen, muted, next, pause, playCollection, playing, prev, queue, queueOpen, resume, seek, seekFraction, setLyricsFromText, setTimedLyrics, repeat, shuffle, stampLine, time, cycleRepeat, toggleLoop, toggleMute, togglePlay, toggleShuffle, toggleWave, visualizerEnabled, volume, waveActive, clipOpen, ensureAnalyser])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePlayer() {
  const context = useContext(Ctx)
  if (!context) throw new Error('usePlayer must be used within PlayerProvider')
  return context
}
