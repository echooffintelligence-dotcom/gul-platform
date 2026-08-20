'use client'

import {
  ChevronDown,
  ChevronUp,
  ListMusic,
  MessageCircle,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  TextQuote,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useState } from 'react'
import { usePlayer } from '@/components/providers/player-provider'
import { Cover } from '@/components/shared/art'
import { TrackTitle } from '@/components/shared/track-title'

import { TrackActions } from '@/components/social/track-actions'
import { AiBadge } from '@/components/shared/ai-badge'
import { MyWaveToggle } from './my-wave'
import { Waveform } from './waveform'
import { QueueDrawer } from './queue-drawer'
import { mmss } from '@/lib/data'
import { cn } from '@/lib/utils'

export function PlayerBar() {
  const { current, time, playing, togglePlay, seekFraction, next, prev, volume, muted, setVolume, toggleMute, loop, shuffle, toggleLoop, toggleShuffle, lyricsOpen, toggleLyrics, queue, toggleQueue, comments, commentMode, toggleCommentMode, addComment } = usePlayer()
  const [collapsed, setCollapsed] = useState(false)
  const progress = current.durationSec > 0 ? time / current.durationSec : 0

  const transportButton = 'rounded-lg p-1.5 text-ink-2 transition-all duration-300 hover:bg-white/5 hover:text-accent-b active:scale-95'

  return (
    <>
    <footer className={cn(
      'fixed bottom-0 left-0 right-0 z-[100] border-t border-cyan-500/20 bg-black/85 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all duration-300',
      collapsed ? 'px-3 py-2' : 'px-4 py-2.5 md:px-6 md:py-3',
    )}>
      {collapsed ? (
        <div className="mx-auto flex max-w-[1520px] items-center gap-3">
          <Cover cover={current.cover} coverUrl={current.coverUrl} className="h-9 w-9" />
          <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><TrackTitle title={current.title} credits={current.credits} featuring={current.featuring} className="truncate text-sm font-bold" artistClassName="text-ink-2" titleClassName="font-bold" />{current.isAiGenerated && <AiBadge compact />}</div><div className="mt-1 h-px overflow-hidden bg-white/10"><div className="h-full bg-cyan-300 shadow-[0_0_9px_rgba(78,230,255,.7)]" style={{ width: `${progress * 100}%` }} /></div></div>
          <button type="button" aria-label={playing ? 'Пауза' : 'Играть'} onClick={togglePlay} className="grid h-9 w-9 place-items-center rounded-full border border-cyan-100/60 bg-[linear-gradient(110deg,#4ee6ff,#d5fbff,#a78bfa,#4ee6ff)] bg-[length:200%_100%] text-slate-950 shadow-[0_0_20px_rgba(78,230,255,.35)] transition-all hover:bg-right active:scale-95">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
          <button type="button" aria-label={muted ? 'Включить звук' : 'Выключить звук'} onClick={toggleMute} className={transportButton}>{muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
          <button type="button" aria-label="Развернуть плеер" onClick={() => setCollapsed(false)} className={transportButton}><ChevronUp className="h-4 w-4" /></button>
        </div>
      ) : (
        <div className="mx-auto grid max-w-[1520px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[minmax(0,1fr)_minmax(300px,2fr)_minmax(0,1fr)] md:gap-6">
          <div className="flex min-w-0 items-center gap-3">
            <Cover cover={current.cover} coverUrl={current.coverUrl} className="h-11 w-11" />
            <div className="min-w-0"><div className="flex items-center gap-2"><TrackTitle title={current.title} credits={current.credits} featuring={current.featuring} className="truncate text-[0.9375rem] font-bold [font-stretch:84%]" artistClassName="text-ink-2" titleClassName="font-bold" />{current.isAiGenerated && <AiBadge compact />}</div></div>
            <TrackActions trackId={current.id} title={current.title} className="ml-1 hidden sm:flex" />
          </div>

          <div className="order-3 col-span-2 grid gap-1.5 md:order-none md:col-span-1">
            <div className="flex items-center justify-center gap-3">
              <MyWaveToggle /><button type="button" aria-label="Перемешать" aria-pressed={shuffle} className={cn(transportButton, shuffle && 'text-accent-b')} onClick={toggleShuffle}><Shuffle width={16} height={16} /></button>
              <button type="button" aria-label="Назад" className={transportButton} onClick={prev}><SkipBack width={18} height={18} /></button>
              <button type="button" aria-label={playing ? 'Пауза' : 'Играть'} onClick={togglePlay} className="grid h-10 w-10 place-items-center rounded-full border border-cyan-100/60 bg-[linear-gradient(110deg,#4ee6ff,#d5fbff,#a78bfa,#4ee6ff)] bg-[length:200%_100%] text-slate-950 shadow-[0_0_26px_rgba(78,230,255,0.35)] transition-all duration-300 hover:bg-right hover:shadow-[0_0_34px_rgba(78,230,255,0.55)] active:scale-95">{playing ? <Pause width={17} height={17} /> : <Play width={17} height={17} />}</button>
              <button type="button" aria-label="Вперёд" className={transportButton} onClick={next}><SkipForward width={18} height={18} /></button>
              <button type="button" aria-label="Повтор" aria-pressed={loop} className={cn(transportButton, loop && 'text-accent-b')} onClick={toggleLoop}><Repeat width={16} height={16} /></button>
            </div>
            <div className="grid grid-cols-[38px_1fr_38px] items-center gap-3"><span className="tabnum font-mono text-[0.6875rem] text-ink-3">{mmss(time)}</span><div className="wave-glow"><Waveform seed={current.id} values={current.waveform} progress={progress} playing={playing} durationSec={current.durationSec} comments={comments} commentMode={commentMode} onSeek={seekFraction} onAddComment={addComment} /></div><span className="tabnum text-right font-mono text-[0.6875rem] text-ink-3">{mmss(current.durationSec)}</span></div>
          </div>

          <div className="flex items-center justify-end gap-1.5">
            <button type="button" onClick={toggleLyrics} className={cn('inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.07em] text-ink-2 transition-all duration-300 hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-cyan-100 active:scale-95', lyricsOpen && 'border-cyan-300/35 bg-cyan-300/10 text-cyan-100 shadow-[0_0_18px_rgba(78,230,255,0.12)] hover:text-cyan-100')}><TextQuote width={13} height={13} /> <span className="hidden sm:inline">Текст</span></button>
            <button type="button" aria-label="Оставить комментарий на волне" aria-pressed={commentMode} className={cn(transportButton, commentMode && 'bg-cyan-300/10 text-cyan-100')} onClick={toggleCommentMode}><MessageCircle width={14} height={14} /></button>
            <button type="button" aria-label="Очередь" aria-pressed={queue.length > 0} className={cn(transportButton, 'hidden sm:inline-flex', queue.length > 0 && 'text-cyan-100')} onClick={toggleQueue}><ListMusic width={14} height={14} /><span className="ml-0.5 text-[.6rem]">{queue.length || ''}</span></button>
            <button type="button" aria-label={muted ? 'Включить звук' : 'Выключить звук'} className={transportButton} onClick={toggleMute}>{muted || volume === 0 ? <VolumeX width={15} height={15} /> : <Volume2 width={15} height={15} />}</button>
            <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="Громкость" className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/15 accent-cyan-300 sm:w-20" />
            <button type="button" aria-label="Свернуть плеер" onClick={() => setCollapsed(true)} className={transportButton}><ChevronDown className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </footer>
    <QueueDrawer />
    </>
  )
}
