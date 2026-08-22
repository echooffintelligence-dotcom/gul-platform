'use client'

import { usePlayer } from '@/components/providers/player-provider'
import { useTheme } from '@/components/providers/theme-provider'
import { cn } from '@/lib/utils'

/**
 * Живой фон: размытая обложка текущего трека под всем интерфейсом.
 *
 * Это то, что отличает референс от обычного тёмного градиента — цвет страницы
 * меняется вместе с музыкой. Слой лежит под контентом (z-index отрицательный),
 * не ловит события и не мешает прокрутке.
 *
 * У обложек-заглушек (c1…c6) картинки нет — они нарисованы CSS-градиентом,
 * поэтому вместо background-image рендерим сам элемент обложки и размываем его.
 */
export function AmbientBackdrop() {
  const { current } = usePlayer()
  const { ambientEnabled } = useTheme()

  if (!ambientEnabled) return <div className="ambient-scrim" aria-hidden />

  return (
    <>
      {current.coverUrl ? (
        <div className="ambient-layer" aria-hidden style={{ ['--ambient-image' as string]: `url(${JSON.stringify(current.coverUrl)})` }} />
      ) : (
        <div className="ambient-layer" aria-hidden>
          <span className={cn('cover block h-full w-full rounded-none border-0', current.cover)} />
        </div>
      )}
      <div className="ambient-scrim" aria-hidden />
    </>
  )
}
