'use client'

import { Volume1 } from 'lucide-react'
import { usePlayer } from '@/components/providers/player-provider'
import { useToast } from '@/components/providers/toast-provider'
import { TrackTitle } from '@/components/shared/track-title'
import { TrackArt, TrackIndex } from '@/components/shared/track-art'
import { TrackActions } from '@/components/social/track-actions'
import { AiBadge } from '@/components/shared/ai-badge'
import type { Track } from '@/lib/data'
import { cn } from '@/lib/utils'

export function TrackList({ tracks, startIndex = 0 }: { tracks: Track[]; startIndex?: number }) {
  const { currentTrack, isPlaying, playTrack, pause, resume, setLyricsOpen } = usePlayer()
  const { toast } = useToast()

  const activateTrack = (track: Track) => {
    if (currentTrack.id === track.id) {
      if (isPlaying) pause()
      else resume()
      return
    }
    playTrack({
      id: track.id, title: track.title, credits: track.credits, featuring: track.featuring,
      cover: track.cover, coverUrl: track.coverUrl, durationSec: track.durationSec,
      audioUrl: track.audioUrl ?? '/audio/gul-demo.wav', waveform: track.waveform,
      releaseId: track.releaseId, isAiGenerated: track.isAiGenerated,
    })
  }

  return (
    <div className="border-t border-rule">
      {tracks.map((track, index) => {
        const isCurrent = currentTrack.id === track.id
        const isThisPlaying = isCurrent && isPlaying
        return (
          <div
            key={track.id}
            onDoubleClick={() => activateTrack(track)}
            className={cn(
              'track-row grid grid-cols-[24px_40px_minmax(0,1fr)_72px_52px_72px] items-center gap-3 rounded-lg border-b border-rule-soft px-2 py-2 transition-colors hover:bg-paper-2',
              isCurrent && 'bg-paper-2',
            )}
          >
            <span className="text-right font-mono text-[0.8125rem] text-ink-3">
              {isThisPlaying ? <Volume1 width={13} height={13} className="ml-auto text-accent-1" /> : <TrackIndex index={startIndex + index + 1} />}
            </span>

            {/* Обложка вместо кнопки: play проявляется при наведении на строку */}
            <TrackArt
              cover={track.cover}
              coverUrl={track.coverUrl}
              title={track.title}
              isCurrent={isCurrent}
              isPlaying={isThisPlaying}
              onToggle={() => activateTrack(track)}
              className="h-10 w-10"
            />

            <div className="flex min-w-0 items-center gap-2">
              <TrackTitle
                title={track.title}
                credits={track.credits}
                featuring={track.featuring}
                stacked
                className="min-w-0 flex-1"
                titleClassName={cn('text-[0.9375rem] font-semibold', isCurrent && 'text-accent-1')}
                artistClassName="text-[0.75rem] text-ink-3"
              />
              {track.isAiGenerated && <AiBadge compact />}
              {track.hasLyrics && (
                <button
                  type="button"
                  onClick={() => { setLyricsOpen(true); toast('Текст открыт') }}
                  className="shrink-0 rounded border border-rule px-1 font-mono text-[0.5625rem] tracking-[0.06em] text-accent-1 transition-colors hover:border-accent-1/50"
                >
                  TXT
                </button>
              )}
            </div>

            <div className="text-right font-mono text-[0.75rem] text-ink-2">{track.plays.toLocaleString('ru-RU')}</div>
            <div className="text-right font-mono text-[0.75rem] text-ink-3">{track.duration}</div>
            <TrackActions trackId={track.id} title={track.title} className="justify-end" />
          </div>
        )
      })}
    </div>
  )
}
