'use client'

import { MoreHorizontal, Volume1 } from 'lucide-react'
import { usePlayer } from '@/components/providers/player-provider'
import { useToast } from '@/components/providers/toast-provider'
import { Credits } from '@/components/shared/credits'
import type { Track } from '@/lib/data'
import { cn } from '@/lib/utils'

export function TrackList({ tracks }: { tracks: Track[] }) {
  const { current, playing, play, toggleLyrics, setLyricsOpen } = usePlayer()
  const { toast } = useToast()

  return (
    <div className="border-t border-ink">
      {tracks.map((t, i) => {
        const now = current.id === t.id && playing
        return (
          <div
            key={t.id}
            className={cn(
              'grid grid-cols-[28px_minmax(0,1fr)_78px_58px_30px] items-center gap-4 border-b border-rule-soft px-2 py-3 transition-colors hover:bg-paper-2',
              now && 'bg-paper-2',
            )}
          >
            <button
              type="button"
              className="text-right font-mono text-[0.8125rem] text-ink-3"
              onClick={() =>
                play({ id: t.id, title: t.title, credits: t.credits, cover: t.cover, coverUrl: t.coverUrl, durationSec: t.durationSec, audioUrl: t.audioUrl ?? '/audio/gul-demo.wav', waveform: t.waveform, releaseId: t.releaseId })
              }
              aria-label={`Слушать ${t.title}`}
            >
              {now ? <Volume1 width={13} height={13} className="ml-auto text-red" /> : i + 1}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={cn('truncate text-[0.9375rem] font-semibold hover:text-red', now && 'text-red')}
                  onClick={() =>
                    play({ id: t.id, title: t.title, credits: t.credits, cover: t.cover, coverUrl: t.coverUrl, durationSec: t.durationSec, audioUrl: t.audioUrl ?? '/audio/gul-demo.wav', waveform: t.waveform, releaseId: t.releaseId })
                  }
                >
                  {t.title}
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
            <button type="button" aria-label="Ещё" className="ghost !border-transparent !px-1.5" onClick={() => toast('Меню трека')}>
              <MoreHorizontal width={14} height={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
