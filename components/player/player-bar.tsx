'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronUp, ListMusic, MessageCircle, Mic2, Pause, Play,
  Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX,
} from 'lucide-react'
import { usePlayer } from '@/components/providers/player-provider'
import { Cover } from '@/components/shared/art'
import { AiBadge } from '@/components/shared/ai-badge'
import { TrackTitle } from '@/components/shared/track-title'
import { TrackActions } from '@/components/social/track-actions'
import { MyWaveToggle } from './my-wave'
import { Waveform } from './waveform'
import { QueueDrawer } from './queue-drawer'
import { ClipButton, ClipOverlay } from './clip-overlay'
import { mmss } from '@/lib/data'
import { cn } from '@/lib/utils'

/**
 * Нижний плеер.
 *
 * Компоновка выровнена по референсу: слева обложка с названием, по центру
 * транспорт и тонкая дорожка, справа второстепенные действия. Волновая форма
 * специально низкая — прежняя занимала пол-плеера и вытесняла всё остальное.
 */
export function PlayerBar() {
  const {
    current, time, playing, togglePlay, seekFraction, next, prev,
    volume, muted, setVolume, toggleMute, repeat, cycleRepeat, shuffle, toggleShuffle,
    lyricsOpen, toggleLyrics, queue, toggleQueue, comments, commentMode, toggleCommentMode, addComment,
  } = usePlayer()
  const [collapsed, setCollapsed] = useState(false)
  const progress = current.durationSec > 0 ? time / current.durationSec : 0

  const transport = 'grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-2 transition-colors hover:bg-paper-3 hover:text-ink active:scale-95'
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat
  const repeatLabel = repeat === 'off' ? 'Повтор выключен' : repeat === 'all' ? 'Повтор списка' : 'Повтор одного трека'

  return (
    <>
      <footer
        className={cn(
          'glass-panel fixed inset-x-0 bottom-0 z-[100] rounded-none border-x-0 border-b-0 transition-[padding] duration-300',
          collapsed ? 'px-3 py-1.5' : 'px-3 py-2 md:px-5',
        )}
      >
        {collapsed ? (
          <div className="mx-auto flex max-w-[1520px] items-center gap-3">
            <Cover cover={current.cover} coverUrl={current.coverUrl} className="h-8 w-8" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <TrackTitle title={current.title} credits={current.credits} featuring={current.featuring} className="truncate text-[0.8125rem] font-semibold" artistClassName="text-ink-3" />
                {current.isAiGenerated && <AiBadge compact />}
              </div>
              <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-paper-3">
                <div className="h-full rounded-full bg-accent-1" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
            <button type="button" aria-label={playing ? 'Пауза' : 'Играть'} onClick={togglePlay} className="grid h-8 w-8 place-items-center rounded-full bg-accent-1 text-on-accent transition-transform hover:scale-105 active:scale-95">
              {playing ? <Pause className="h-3.5 w-3.5" fill="currentColor" /> : <Play className="h-3.5 w-3.5" fill="currentColor" />}
            </button>
            <button type="button" aria-label="Развернуть плеер" onClick={() => setCollapsed(false)} className={transport}><ChevronUp className="h-4 w-4" /></button>
          </div>
        ) : (
          <div className="mx-auto grid max-w-[1520px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[minmax(180px,1fr)_minmax(320px,1.8fr)_minmax(180px,1fr)] md:gap-5">
            {/* Слева: обложка, название и артист под ним */}
            <div className="flex min-w-0 items-center gap-2.5">
              <Cover cover={current.cover} coverUrl={current.coverUrl} className="h-11 w-11" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <TrackTitle
                    title={current.title}
                    credits={current.credits}
                    featuring={current.featuring}
                    stacked
                    className="min-w-0"
                    titleClassName="truncate text-[0.875rem] font-semibold"
                    artistClassName="truncate text-[0.72rem] text-ink-3"
                  />
                  {current.isAiGenerated && <AiBadge compact />}
                </div>
              </div>
              <TrackActions trackId={current.id} title={current.title} className="ml-1 hidden shrink-0 sm:flex" />
            </div>

            {/* По центру: транспорт и дорожка */}
            <div className="order-3 col-span-2 grid gap-1 md:order-none md:col-span-1">
              <div className="flex items-center justify-center gap-1.5">
                <MyWaveToggle />
                <button type="button" aria-label="Перемешать" aria-pressed={shuffle} onClick={toggleShuffle} className={cn(transport, shuffle && 'text-accent-1')}><Shuffle width={15} height={15} /></button>
                <button type="button" aria-label="Назад" onClick={prev} className={transport}><SkipBack width={17} height={17} /></button>
                <button type="button" aria-label={playing ? 'Пауза' : 'Играть'} onClick={togglePlay} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-1 text-on-accent transition-transform duration-200 hover:scale-105 active:scale-95">
                  {playing ? <Pause width={16} height={16} fill="currentColor" /> : <Play width={16} height={16} fill="currentColor" />}
                </button>
                <button type="button" aria-label="Вперёд" onClick={next} className={transport}><SkipForward width={17} height={17} /></button>
                <button type="button" aria-label={repeatLabel} title={repeatLabel} aria-pressed={repeat !== 'off'} onClick={cycleRepeat} className={cn(transport, repeat !== 'off' && 'text-accent-1')}><RepeatIcon width={15} height={15} /></button>
              </div>
              <div className="grid grid-cols-[34px_1fr_34px] items-center gap-2">
                <span className="tabnum font-mono text-[0.625rem] text-ink-3">{mmss(time)}</span>
                <Waveform
                  seed={current.id}
                  values={current.waveform}
                  progress={progress}
                  playing={playing}
                  durationSec={current.durationSec}
                  comments={comments}
                  commentMode={commentMode}
                  onSeek={seekFraction}
                  onAddComment={addComment}
                />
                <span className="tabnum text-right font-mono text-[0.625rem] text-ink-3">{mmss(current.durationSec)}</span>
              </div>
            </div>

            {/* Справа: второстепенные действия */}
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={toggleLyrics}
                aria-pressed={lyricsOpen}
                title="Текст во весь экран"
                className={cn('inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.07em] text-ink-2 transition-colors hover:border-rule hover:bg-paper-3 hover:text-ink active:scale-95', lyricsOpen && 'border-accent-1/40 bg-accent-1/12 text-ink')}
              >
                <Mic2 width={13} height={13} /> <span className="hidden sm:inline">Текст</span>
              </button>
              <ClipButton />
              <button type="button" aria-label="Комментарий по таймкоду" aria-pressed={commentMode} onClick={toggleCommentMode} className={cn(transport, commentMode && 'bg-accent-1/12 text-accent-1')}><MessageCircle width={14} height={14} /></button>
              <button type="button" aria-label="Очередь" onClick={toggleQueue} className={cn(transport, 'relative hidden sm:grid', queue.length > 0 && 'text-accent-1')}>
                <ListMusic width={14} height={14} />
                {queue.length > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-accent-1 px-0.5 font-mono text-[0.5rem] font-black text-on-accent">{queue.length}</span>}
              </button>
              <button type="button" aria-label={muted ? 'Включить звук' : 'Выключить звук'} onClick={toggleMute} className={transport}>{muted || volume === 0 ? <VolumeX width={15} height={15} /> : <Volume2 width={15} height={15} />}</button>
              <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="Громкость" className="h-1 w-14 cursor-pointer appearance-none rounded-full bg-paper-3 accent-[var(--accent-1)] sm:w-20" />
              <button type="button" aria-label="Свернуть плеер" onClick={() => setCollapsed(true)} className={transport}><ChevronDown className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </footer>
      <QueueDrawer />
      <ClipOverlay />
    </>
  )
}
