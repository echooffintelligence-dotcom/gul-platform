'use client'

import { useState } from 'react'
import { Disc3, Plus, Trash2 } from 'lucide-react'
import { useReleases } from '@/components/providers/release-provider'
import { useToast } from '@/components/providers/toast-provider'
import type { Release, ReleaseDisc } from '@/lib/data'
import { cn } from '@/lib/utils'

/**
 * Разбиение альбома на диски.
 *
 * Название задаёт автор целиком — «Диск 1: Круто Классно», а не только номер.
 * Треки, не попавшие ни в один диск, показываются в релизе как обычно,
 * поэтому частичное разбиение не ломает страницу.
 */
export function DiscManager({ release }: { release: Release }) {
  const { getTrack, setReleaseDiscs } = useReleases()
  const { toast } = useToast()
  const [discs, setDiscs] = useState<ReleaseDisc[]>(release.discs ?? [])

  const assigned = new Set(discs.flatMap((disc) => disc.trackIds))
  const tracks = release.trackIds.map((id) => getTrack(id)).filter((track): track is NonNullable<typeof track> => Boolean(track))

  function commit(next: ReleaseDisc[]) {
    setDiscs(next)
    setReleaseDiscs(release.id, next)
  }

  function addDisc() {
    const next: ReleaseDisc = { id: crypto.randomUUID(), title: `Диск ${discs.length + 1}`, trackIds: [] }
    commit([...discs, next])
  }

  function rename(discId: string, title: string) {
    commit(discs.map((disc) => (disc.id === discId ? { ...disc, title } : disc)))
  }

  function removeDisc(discId: string) {
    commit(discs.filter((disc) => disc.id !== discId))
  }

  function toggleTrack(discId: string, trackId: string) {
    commit(discs.map((disc) => {
      if (disc.id !== discId) {
        // Трек живёт ровно в одном диске: из остальных убираем.
        return { ...disc, trackIds: disc.trackIds.filter((id) => id !== trackId) }
      }
      return disc.trackIds.includes(trackId)
        ? { ...disc, trackIds: disc.trackIds.filter((id) => id !== trackId) }
        : { ...disc, trackIds: [...disc.trackIds, trackId] }
    }))
  }

  return (
    <section className="mt-6 rounded-2xl border border-accent-2/25 bg-accent-2/[.05] p-4" aria-labelledby="discs-title">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-2/20 text-accent-2"><Disc3 className="h-4 w-4" /></span>
        <div>
          <div className="eyebrow">структура альбома</div>
          <h3 id="discs-title" className="mt-1 font-semibold">Диски</h3>
        </div>
        <button type="button" onClick={addDisc} className="ghost ml-auto !px-3 !py-1.5 !text-xs"><Plus className="h-3.5 w-3.5" /> Добавить диск</button>
      </div>

      {discs.length === 0 ? (
        <p className="mt-3 max-w-prose text-sm text-ink-2">
          Альбом показывается одним списком. Добавьте диск, чтобы разбить его на части и назвать их по-своему —
          например «Диск 1: Ночная смена».
        </p>
      ) : (
        <div className="mt-4 grid gap-4">
          {discs.map((disc) => (
            <div key={disc.id} className="rounded-xl border border-rule bg-paper-2 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={disc.title}
                  onChange={(event) => rename(disc.id, event.target.value)}
                  placeholder="Диск 1: назовите как хотите"
                  aria-label="Название диска"
                  className="min-w-0 flex-1 rounded-lg border border-rule bg-paper-2 px-2.5 py-1.5 text-sm outline-none focus:border-accent-2/60"
                />
                <span className="shrink-0 font-mono text-[0.62rem] text-ink-3">{disc.trackIds.length}</span>
                <button
                  type="button"
                  onClick={() => { removeDisc(disc.id); toast('Диск удалён') }}
                  aria-label={`Удалить ${disc.title}`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-accent-hot/10 hover:text-accent-hot"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <ul className="mt-2 grid gap-1">
                {tracks.map((track) => {
                  const inThis = disc.trackIds.includes(track.id)
                  const inOther = !inThis && assigned.has(track.id)
                  return (
                    <li key={track.id}>
                      <button
                        type="button"
                        onClick={() => toggleTrack(disc.id, track.id)}
                        aria-pressed={inThis}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors',
                          inThis ? 'bg-accent-2/15 text-ink' : inOther ? 'text-ink-3 opacity-50 hover:opacity-80' : 'text-ink-2 hover:bg-paper-3',
                        )}
                      >
                        <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded border text-[0.55rem]', inThis ? 'border-accent-2 bg-accent-2 text-on-accent' : 'border-rule')}>
                          {inThis ? '✓' : ''}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{track.title}</span>
                        {inOther && <span className="shrink-0 font-mono text-[0.55rem]">в другом диске</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
