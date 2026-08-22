'use client'

import { ChevronDown, ChevronUp, ListMusic, Save, Trash2, X } from 'lucide-react'
import { usePlayer } from '@/components/providers/player-provider'
import { Cover } from '@/components/shared/art'
import { Credits } from '@/components/shared/credits'
import { useToast } from '@/components/providers/toast-provider'

export function QueueDrawer() {
  const { currentTrack, queue, queueOpen, toggleQueue, moveQueueItem, removeQueueItem, clearQueue, saveQueueAsPlaylist, playTrack } = usePlayer()
  const { toast } = useToast()
  if (!queueOpen) return null

  return (
    <aside className="fixed bottom-24 right-4 z-[110] w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-accent-1/20 bg-paper shadow-[0_18px_70px_rgba(0,0,0,.62),0_0_32px_rgba(78,230,255,.12)] backdrop-blur-2xl animate-in slide-in-from-bottom-4 duration-300" aria-label="Очередь воспроизведения">
      <div className="flex items-center justify-between border-b border-rule px-4 py-3"><div className="flex items-center gap-2"><ListMusic className="h-4 w-4 text-accent-1" /><div><h2 className="font-semibold">Очередь воспроизведения</h2><p className="font-mono text-[.62rem] text-ink-3">СТАНЦИЯ ВКЛЮЧИТСЯ ПОСЛЕ ОЧЕРЕДИ</p></div></div><button type="button" onClick={toggleQueue} aria-label="Закрыть очередь" className="rounded-lg p-1.5 text-ink-3 hover:bg-paper-2 hover:text-ink"><X className="h-4 w-4" /></button></div>
      <div className="border-b border-rule bg-accent-1/5 px-4 py-3"><p className="mb-2 font-mono text-[.62rem] uppercase tracking-[.08em] text-ink-3">Играет сейчас</p><button type="button" onClick={() => playTrack(currentTrack)} className="flex w-full items-center gap-3 text-left"><Cover cover={currentTrack.cover} coverUrl={currentTrack.coverUrl} className="h-10 w-10" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-accent-1">{currentTrack.title}</p><Credits credits={currentTrack.credits} /></div></button></div>
      <div className="max-h-[46vh] overflow-auto p-2"><p className="px-2 py-2 font-mono text-[.62rem] uppercase tracking-[.08em] text-ink-3">Далее · {queue.length}</p>{queue.length === 0 ? <p className="px-2 pb-3 text-sm text-ink-3">Очередь пуста — после трека включится бесконечный микс из каталога.</p> : queue.map((track, index) => <div key={`${track.id}-${index}`} className="group flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-paper-2"><Cover cover={track.cover} coverUrl={track.coverUrl} className="h-9 w-9" /><button type="button" onClick={() => playTrack(track)} className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-medium">{track.title}</p><Credits credits={track.credits} /></button><div className="flex items-center opacity-70 transition-opacity group-hover:opacity-100"><button type="button" aria-label="Выше" disabled={index === 0} onClick={() => moveQueueItem(index, -1)} className="rounded p-1 text-ink-3 disabled:opacity-30 hover:text-accent-1"><ChevronUp className="h-3.5 w-3.5" /></button><button type="button" aria-label="Ниже" disabled={index === queue.length - 1} onClick={() => moveQueueItem(index, 1)} className="rounded p-1 text-ink-3 disabled:opacity-30 hover:text-accent-1"><ChevronDown className="h-3.5 w-3.5" /></button><button type="button" aria-label="Удалить" onClick={() => removeQueueItem(index)} className="rounded p-1 text-ink-3 hover:text-accent-hot"><X className="h-3.5 w-3.5" /></button></div></div>)}</div>
      <div className="flex gap-2 border-t border-rule p-3"><button type="button" onClick={() => { clearQueue(); toast('Очередь очищена') }} disabled={!queue.length} className="ghost flex-1 !justify-center !text-xs"><Trash2 className="h-3.5 w-3.5" />Очистить</button><button type="button" onClick={() => { saveQueueAsPlaylist(); toast('Очередь сохранена как локальный плейлист') }} disabled={!queue.length} className="solid flex-1 !justify-center !py-2 !text-xs"><Save className="h-3.5 w-3.5" />Сохранить</button></div>
    </aside>
  )
}
