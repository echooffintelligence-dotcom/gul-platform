'use client'

import { useEffect, useRef } from 'react'
import { Film, X } from 'lucide-react'
import { usePlayer } from '@/components/providers/player-provider'
import { TrackTitle } from '@/components/shared/track-title'
import { cn } from '@/lib/utils'

/**
 * Просмотр видеоклипа поверх интерфейса.
 *
 * Аудио и видео не проигрываются одновременно — иначе получится эхо с
 * рассинхроном. При открытии аудиодорожка ставится на паузу, клип
 * стартует с той же секунды и звучит сам; при закрытии позиция
 * возвращается в аудиоплеер, и трек продолжается с того же места.
 */
export function ClipOverlay() {
  const { current, clipOpen, setClipOpen, time, seek, playing, pause, resume } = usePlayer()
  const videoRef = useRef<HTMLVideoElement>(null)
  const wasPlayingRef = useRef(false)

  useEffect(() => {
    if (!clipOpen) return
    wasPlayingRef.current = playing
    pause()
    const video = videoRef.current
    if (video) {
      video.currentTime = Math.min(time, Math.max(0, video.duration || time))
      void video.play().catch(() => undefined)
    }
    // Открытие — разовое действие: playing в зависимостях вызвал бы перезапуск клипа.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipOpen])

  useEffect(() => {
    if (!clipOpen) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipOpen])

  function close() {
    const video = videoRef.current
    if (video) {
      video.pause()
      if (Number.isFinite(video.currentTime)) seek(video.currentTime)
    }
    setClipOpen(false)
    if (wasPlayingRef.current) resume()
  }

  if (!clipOpen || !current.videoUrl) return null

  return (
    <div role="dialog" aria-modal="true" aria-label={`Клип: ${current.title}`} className="fixed inset-0 z-[130] grid grid-rows-[auto_1fr] bg-black/92 backdrop-blur-xl">
      <header className="flex items-center gap-3 px-5 py-4">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white"><Film className="h-4 w-4" /></span>
        <div className="min-w-0">
          <div className="eyebrow">клип</div>
          <TrackTitle title={current.title} credits={current.credits} featuring={current.featuring} className="truncate text-sm font-semibold text-white" artistClassName="text-white/60" />
        </div>
        <button type="button" onClick={close} aria-label="Закрыть клип" className="ml-auto grid h-9 w-9 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white">
          <X className="h-4.5 w-4.5" />
        </button>
      </header>

      <div className="grid min-h-0 place-items-center px-4 pb-8">
        <video
          ref={videoRef}
          src={current.videoUrl}
          poster={current.coverUrl}
          controls
          playsInline
          onEnded={close}
          className="max-h-full w-auto max-w-full rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,.6)]"
        />
      </div>
    </div>
  )
}

/** Кнопка «Клип» в плеере. Появляется только если у трека есть видео. */
export function ClipButton({ className }: { className?: string }) {
  const { current, clipOpen, setClipOpen } = usePlayer()
  if (!current.videoUrl) return null
  return (
    <button
      type="button"
      onClick={() => setClipOpen(!clipOpen)}
      aria-pressed={clipOpen}
      title="Смотреть клип"
      className={cn('inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent-2-edge)] bg-accent-2/15 px-2 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.07em] text-ink transition-colors hover:bg-accent-2/25 active:scale-95', className)}
    >
      <Film width={13} height={13} /> <span className="hidden sm:inline">Клип</span>
    </button>
  )
}
