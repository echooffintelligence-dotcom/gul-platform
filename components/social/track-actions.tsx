'use client'

import { useState } from 'react'
import { Check, Heart, ListPlus } from 'lucide-react'
import { useSocial } from '@/components/providers/social-provider'
import { cn } from '@/lib/utils'

export function TrackActions({ trackId, title, className }: { trackId: string; title: string; className?: string }) {
  const { isLiked, toggleLike, playlists, likedPlaylist, toggleTrackInPlaylist } = useSocial()
  const [open, setOpen] = useState(false)
  const liked = isLiked(trackId)
  const options = [likedPlaylist, ...playlists]
  return <div className={cn('relative flex items-center gap-1', className)} onClick={(event) => event.stopPropagation()}><button type="button" aria-label={liked ? `Убрать ${title} из любимых` : `Добавить ${title} в любимые`} onClick={() => toggleLike(trackId)} className={cn('grid h-8 w-8 place-items-center rounded-lg transition-colors hover:bg-cyan-300/10', liked ? 'text-rose-300' : 'text-ink-3 hover:text-ink')}><Heart className="h-4 w-4" fill={liked ? 'currentColor' : 'none'} /></button><button type="button" aria-label={`Добавить ${title} в плейлист`} onClick={() => setOpen((value) => !value)} className={cn('grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-cyan-300/10 hover:text-ink', open && 'bg-cyan-300/10 text-cyan-100')}><ListPlus className="h-4 w-4" /></button>{open && <div className="absolute right-0 top-9 z-40 min-w-52 rounded-xl border border-white/15 bg-[#10131c]/95 p-1.5 shadow-2xl backdrop-blur-xl"><div className="px-2 py-1.5 font-mono text-[.58rem] uppercase tracking-[.1em] text-ink-3">добавить в плейлист</div>{options.map((playlist) => { const included = playlist.trackIds.includes(trackId); return <button key={playlist.id} type="button" onClick={() => { toggleTrackInPlaylist(playlist.id, trackId); setOpen(false) }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-ink-2 transition-colors hover:bg-white/8 hover:text-ink"><span className={cn('grid h-4 w-4 place-items-center rounded border', included ? 'border-cyan-200/60 bg-cyan-300/15 text-cyan-50' : 'border-white/15 text-transparent')}><Check className="h-3 w-3" /></span><span className="min-w-0 flex-1 truncate">{playlist.title}</span>{playlist.privacy === 'private' && <span className="font-mono text-[.55rem] text-ink-3">private</span>}</button> })}{playlists.length === 0 && <p className="px-2 py-2 text-xs text-ink-3">Создайте свой плейлист в кабинете.</p>}</div>}</div>
}
