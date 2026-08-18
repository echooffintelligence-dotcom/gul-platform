'use client'

import { Pin, PinOff } from 'lucide-react'
import type { Release } from '@/lib/data'
import { useSocial } from '@/components/providers/social-provider'
import { useToast } from '@/components/providers/toast-provider'

export function SpotlightManager({ artistId, releases }: { artistId: string; releases: Release[] }) {
  const { spotlightFor, toggleSpotlight } = useSocial()
  const { toast } = useToast()
  const spotlight = spotlightFor(artistId)
  return <section className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/[.035] p-4"><div className="flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-300/15 text-amber-100"><Pin className="h-4 w-4" /></div><div><div className="eyebrow">spotlight</div><h2 className="mt-1 font-semibold">Закреплённые релизы</h2><p className="mt-1 text-sm text-ink-3">Выберите до трёх работ, которые будут показаны крупными карточками в профиле.</p></div><span className="ml-auto font-mono text-xs text-amber-100">{spotlight.length}/3</span></div><div className="mt-4 grid gap-2">{releases.length === 0 ? <p className="text-sm text-ink-3">Для выбранной карточки пока нет релизов.</p> : releases.map((release) => { const pinned = spotlight.includes(release.id); return <div key={release.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2"><div><p className="text-sm font-medium">{release.title}</p><p className="font-mono text-[.62rem] text-ink-3">{release.kind} · {release.year}</p></div><button type="button" onClick={() => { const result = toggleSpotlight(artistId, release.id); if (result.error) toast(result.error); else toast(pinned ? 'Релиз снят с Spotlight' : 'Релиз закреплён в Spotlight') }} className={pinned ? 'solid !px-3 !py-1.5 !text-xs' : 'ghost !px-3 !py-1.5 !text-xs'}>{pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}{pinned ? 'Снять' : 'Закрепить'}</button></div> })}</div></section>
}
