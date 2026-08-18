'use client'

import { Pause, Play, Volume1 } from 'lucide-react'
import { usePlayer } from '@/components/providers/player-provider'
import { useToast } from '@/components/providers/toast-provider'
import { Credits } from '@/components/shared/credits'
import { TrackActions } from '@/components/social/track-actions'
import type { Track } from '@/lib/data'
import { cn } from '@/lib/utils'

export function TrackList({ tracks }: { tracks: Track[] }) {
  const { currentTrack, isPlaying, playTrack, pause, resume, setLyricsOpen } = usePlayer()

  const activateTrack = (t: Track) => {
    const isCurrent = currentTrack.id === t.id
    if (isCurrent) { if (isPlaying) pause(); else resume(); return }
    playTrack({ id: t.id, title: t.title, credits: t.credits, cover: t.cover, coverUrl: t.coverUrl, durationSec: t.durationSec, audioUrl: t.audioUrl ?? '/audio/gul-demo.wav', waveform: t.waveform, releaseId: t.releaseId })
  }
  const { toast } = useToast()

  return (
    <div className="border-t border-ink">
      {tracks.map((t, i) => {
        const isCurrent = currentTrack.id === t.id
        const isThisPlaying = isCurrent && isPlaying
        return (
          <div
            key={t.id}
            className={cn(
              'grid grid-cols-[28px_minmax(0,1fr)_78px_58px_72px] items-center gap-4 border-b border-rule-soft px-2 py-3 transition-colors hover:bg-paper-2',
              isThisPlaying && 'bg-paper-2',
            )}
          >
            <button
              type="button"
              className="text-right font-mono text-[0.8125rem] text-ink-3"
              onClick={() => activateTrack(t)}
              aria-label={`Слушать ${t.title}`}
            >
              {isThisPlaying ? <Volume1 width={13} height={13} className="ml-auto text-red" /> : isCurrent ? <Pause width={13} height={13} className="ml-auto text-cyan-200" /> : i + 1}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={cn('truncate text-[0.9375rem] font-semibold hover:text-red', isThisPlaying && 'text-red')}
                  onClick={() => activateTrack(t)}
                >
                  {t.title}{!isCurrent && <Play className="ml-1 hidden h-3 w-3 text-ink-3 sm:inline" />}
                </button>
                {t.hasLyrics && (
                  <button
                    type="button"
                    onClick={() => {
                      setLyricsOpen(true)
                      toast('Текст открыт')
                    }}
                    className="rounded-[2px] border border-blue-soft px-1 font-mono text-[0.5625rem] tracking-[0.06em] text-blue"
                  >
                    TXT
                  </button>
                )}
              </div>
              <Credits credits={t.credits} />
            </div>
            <div className="text-right font-mono text-[0.75rem] text-ink-2">{t.plays.toLocaleString('ru-RU')}</div>
            <div className="text-right font-mono text-[0.75rem] text-ink-3">{t.duration}</div>
            <TrackActions trackId={t.id} title={t.title} className="justify-end" />
          </div>
        )
      })}
    </div>
  )
}
