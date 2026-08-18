'use client'

import { useMemo, useState } from 'react'
import { Sparkles, UserRoundPlus } from 'lucide-react'
import { Avatar, Cover } from '@/components/shared/art'
import { useSocial } from '@/components/providers/social-provider'
import { artists, chart, getRelease, getTrack } from '@/lib/data'

const friendIds = ['yegeor', 'stilsi', 'plenka-909', 'ozero']

function friendTracks(friendId: string) {
  const artist = artists.find((item) => item.id === friendId)
  return artist?.releaseIds.flatMap((releaseId) => getRelease(releaseId)?.trackIds ?? []).slice(0, 8) ?? []
}

export function BlendCreator() {
  const { likedTrackIds, blends, createBlend } = useSocial()
  const [friendId, setFriendId] = useState(friendIds[0])
  const friend = artists.find((artist) => artist.id === friendId) ?? artists[0]
  const userTracks = likedTrackIds.length > 0 ? likedTrackIds : chart.slice(0, 5).map((entry) => entry.trackId)
  const friendTrackIds = friendTracks(friend.id)
  const proposal = useMemo(() => {
    const overlap = userTracks.filter((id) => friendTrackIds.includes(id)).length
    const union = new Set([...userTracks, ...friendTrackIds]).size || 1
    const matchScore = Math.min(98, Math.max(34, Math.round(overlap / union * 100 + 42)))
    const trackIds = Array.from(new Set([...userTracks.slice(0, 5), ...friendTrackIds.slice(0, 5)])).slice(0, 10)
    return { matchScore, trackIds }
  }, [friendTrackIds, userTracks])
  const existing = blends.find((blend) => blend.friendId === friend.id)
  const selectedTracks = (existing?.trackIds ?? proposal.trackIds).map((id) => getTrack(id)).filter((track): track is NonNullable<typeof track> => Boolean(track))
  return <section className="mt-8 rounded-2xl border border-violet-300/20 bg-[radial-gradient(circle_at_15%_0%,rgba(167,139,250,.16),transparent_42%),rgba(255,255,255,.02)] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl border border-violet-200/35 bg-violet-400/10 text-violet-100"><Sparkles className="h-5 w-5" /></div><div><div className="eyebrow">гул синтез</div><h2 className="font-semibold">Собрать плейлист с другом</h2><p className="mt-1 text-sm text-ink-3">Смешиваем ваши любимые и частые прослушивания в одну живую очередь.</p></div></div><div className="flex -space-x-2"><Avatar initials="ДА" color="b" className="h-10 w-10 ring-2 ring-[#121520]" /><Avatar initials={friend.initials} color={friend.color} className="h-10 w-10 ring-2 ring-[#121520]" /></div></div><div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]"><div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{friendIds.map((id) => { const option = artists.find((artist) => artist.id === id); if (!option) return null; const selected = option.id === friend.id; return <button key={option.id} type="button" onClick={() => setFriendId(option.id)} className={selected ? 'flex items-center gap-2 rounded-xl border border-violet-200/45 bg-violet-300/10 p-2 text-left' : 'flex items-center gap-2 rounded-xl border border-white/8 bg-black/15 p-2 text-left transition-colors hover:border-white/20'}><Avatar initials={option.initials} color={option.color} className="h-7 w-7 text-[.6rem]" /><span className="min-w-0 truncate text-xs">{option.name}</span></button> })}</div><div className="mt-4 rounded-xl border border-white/8 bg-black/20 p-3"><div className="flex items-center justify-between gap-3"><div><div className="font-mono text-xs text-violet-100">Синтез: Вы + {friend.name}</div><div className="mt-1 text-xs text-ink-3">{selectedTracks.length} треков · {likedTrackIds.length ? 'учтены ваши лайки' : 'использованы частые прослушивания'}</div></div><div className="text-right"><div className="tabnum font-mono text-2xl text-violet-100">{existing?.matchScore ?? proposal.matchScore}%</div><div className="font-mono text-[.56rem] uppercase tracking-[.08em] text-ink-3">match score</div></div></div><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{selectedTracks.slice(0, 6).map((track) => <div key={track.id} className="w-16 shrink-0"><Cover cover={track.cover} coverUrl={track.coverUrl} className="aspect-square w-16 rounded-lg" /><div className="mt-1 truncate text-[.58rem] text-ink-3">{track.title}</div></div>)}</div></div></div><div className="flex flex-col justify-center rounded-xl border border-violet-200/20 bg-violet-400/[.045] p-4"><span className="font-mono text-xs text-ink-3">Совместимость</span><strong className="mt-1 font-mono text-3xl text-violet-100">{existing?.matchScore ?? proposal.matchScore}%</strong><button type="button" onClick={() => { if (!existing) createBlend({ id: friend.id, name: friend.name, initials: friend.initials }, proposal.trackIds, proposal.matchScore) }} disabled={Boolean(existing)} className="solid mt-4 justify-center disabled:cursor-default disabled:opacity-60"><UserRoundPlus className="h-4 w-4" />{existing ? 'Синтез сохранён' : 'Создать синтез'}</button></div></div></section>
}
