'use client'

import { Radio, Square } from 'lucide-react'
import { usePlayer } from '@/components/providers/player-provider'
import { useSocial } from '@/components/providers/social-provider'
import { useToast } from '@/components/providers/toast-provider'
import { cn } from '@/lib/utils'

/**
 * «Моя волна» — бесконечный персональный поток.
 *
 * Кнопка только переключает режим: подбором занимается PlayerProvider,
 * который держит очередь наполненной, пока волна активна.
 */
export function MyWaveCard() {
  const { waveActive, toggleWave } = usePlayer()
  const { likedTrackIds, history, followingArtistIds } = useSocial()
  const { toast } = useToast()

  const signals = likedTrackIds.length + history.length + followingArtistIds.length

  function start() {
    const wasActive = waveActive
    toggleWave()
    toast(wasActive ? 'Волна остановлена' : 'Волна запущена — очередь пополняется автоматически')
  }

  return (
    <section
      className={cn(
        'cyber-card mb-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-center',
        waveActive && 'is-selected',
      )}
      aria-labelledby="my-wave-title"
    >
      <div className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl', waveActive ? 'bg-accent-2/20 text-accent-2' : 'bg-accent-1/15 text-accent-1')}>
        <Radio className={cn('h-5 w-5', waveActive && 'animate-pulse')} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="eyebrow">персональный поток</div>
        <h2 id="my-wave-title" className="mt-1 font-semibold">Моя волна</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-3">
          {signals === 0
            ? 'Поставьте лайки и послушайте несколько треков — волна подстроится под вкус. Пока играет подборка по популярности.'
            : `Подбор по ${likedTrackIds.length} лайкам, ${history.length} прослушиваниям и ${followingArtistIds.length} подпискам: жанры, теги и общие продюсеры.`}
        </p>
      </div>

      <button
        type="button"
        onClick={start}
        aria-pressed={waveActive}
        className={cn('shrink-0 justify-center', waveActive ? 'ghost' : 'solid')}
      >
        {waveActive ? <Square className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
        {waveActive ? 'Остановить волну' : 'Запустить волну'}
      </button>
    </section>
  )
}

/** Компактный переключатель волны для нижнего плеера. */
export function MyWaveToggle({ className }: { className?: string }) {
  const { waveActive, toggleWave } = usePlayer()
  return (
    <button
      type="button"
      onClick={toggleWave}
      aria-label={waveActive ? 'Остановить «Мою волну»' : 'Запустить «Мою волну»'}
      aria-pressed={waveActive}
      className={cn(
        'rounded-lg p-1.5 transition-all duration-300 hover:bg-paper-2 active:scale-95',
        waveActive ? 'bg-accent-2/15 text-accent-2' : 'text-ink-2 hover:text-accent-b',
        className,
      )}
    >
      <Radio className={cn('h-3.5 w-3.5', waveActive && 'animate-pulse')} />
    </button>
  )
}
