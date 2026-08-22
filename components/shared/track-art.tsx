'use client'

import { Pause, Play } from 'lucide-react'
import { Cover } from '@/components/shared/art'
import type { CoverKey } from '@/lib/data'
import { cn } from '@/lib/utils'

type TrackArtProps = {
  cover: CoverKey
  coverUrl?: string
  title: string
  isCurrent?: boolean
  isPlaying?: boolean
  onToggle: () => void
  className?: string
}

/**
 * Обложка трека, которая при наведении превращается в кнопку воспроизведения.
 *
 * Раньше слева от названия стояла постоянная кнопка «play», а обложки не было
 * вовсе. Теперь по умолчанию видно обложку — она информативнее, — а управление
 * проявляется только когда курсор на строке (класс .track-row в globals.css).
 */
export function TrackArt({ cover, coverUrl, title, isCurrent = false, isPlaying = false, onToggle, className }: TrackArtProps) {
  return (
    <span className={cn('track-art', className)}>
      <Cover cover={cover} coverUrl={coverUrl} className={cn('h-full w-full', isCurrent && 'is-selected-cover')} />
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onToggle() }}
        aria-label={isPlaying ? `Пауза: ${title}` : `Слушать ${title}`}
        // Играющий трек показывает контрол постоянно: иначе непонятно,
        // где остановить воспроизведение, не наводя мышь.
        className={cn('track-art-play', isPlaying && '!opacity-100')}
      >
        {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
      </button>
    </span>
  )
}

/**
 * Порядковый номер, который прячется при наведении на строку.
 * Пара к TrackArt для списков, где номер и обложка стоят в разных колонках.
 */
export function TrackIndex({ index, className }: { index: number; className?: string }) {
  return <span className={cn('track-index tabnum', className)}>{index}</span>
}
