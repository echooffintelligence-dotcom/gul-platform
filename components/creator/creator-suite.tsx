'use client'

import { useState, type ChangeEvent } from 'react'
import { Copy, Download, Link2, LockKeyhole, Music2, RefreshCw, Save, Share2 } from 'lucide-react'
import { useSocial } from '@/components/providers/social-provider'
import { useToast } from '@/components/providers/toast-provider'

export function CreatorSuite({ releaseId, releaseTitle }: { releaseId: string; releaseTitle: string }) {
  const { getSettings, patchSettings } = useSocial()
  const { toast } = useToast()
  const settings = getSettings(releaseId)
  const [links, setLinks] = useState(settings.externalLinks)
  const [uploading, setUploading] = useState(false)
  const privateLink = typeof window === 'undefined' ? `/release/${releaseId}?secret_token=${settings.secretToken}` : `${window.location.origin}/release/${releaseId}?secret_token=${settings.secretToken}`

  function replaceAudio(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('audio/') || file.size > 100 * 1024 * 1024) { toast('Выберите аудиофайл до 100 МБ'); return }
    setUploading(true)
    window.setTimeout(() => { patchSettings(releaseId, { replacementAudioName: file.name }); setUploading(false); toast('Аудиофайл заменён в локальном creator state. Production Storage adapter готов к подключению.') }, 350)
  }

  return <section className="mt-8 rounded-2xl border border-violet-300/20 bg-violet-300/[.035] p-4 shadow-inner shadow-violet-300/5"><div className="flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-300/15 text-violet-200"><Music2 className="h-4 w-4" /></div><div><div className="eyebrow">creator suite</div><h3 className="mt-1 font-semibold">Управление «{releaseTitle}»</h3></div></div><div className="mt-4 grid gap-4">
    <div className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 sm:grid-cols-[1fr_auto]"><div><p className="text-sm font-medium">Оригинал для слушателей</p><p className="mt-1 text-xs text-ink-3">Разрешите кнопку Download MP3/FLAC на релизе.</p></div><button type="button" aria-pressed={settings.allowDownload} onClick={() => patchSettings(releaseId, { allowDownload: !settings.allowDownload })} className={settings.allowDownload ? 'solid !px-3 !py-2 !text-xs' : 'ghost !px-3 !py-2 !text-xs'}><Download className="h-3.5 w-3.5" />{settings.allowDownload ? 'Скачивание включено' : 'Разрешить скачивание'}</button></div>
    <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-medium">Приватное предпрослушивание</p><p className="mt-1 break-all font-mono text-[.65rem] text-ink-3">{privateLink}</p></div><button type="button" onClick={() => { void navigator.clipboard?.writeText(privateLink); toast('Приватная ссылка скопирована') }} className="ghost !px-2 !py-1.5 !text-xs"><Copy className="h-3.5 w-3.5" />Копировать</button></div></div>
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-cyan-300/25 bg-cyan-300/[.03] p-3"><div><p className="text-sm font-medium">Обновить аудио</p><p className="mt-1 text-xs text-ink-3">Заменяет медиа без удаления релиза, оценок и прослушиваний.</p>{settings.replacementAudioName && <p className="mt-1 font-mono text-[.65rem] text-cyan-100">Новый файл: {settings.replacementAudioName}</p>}</div><span className="solid !px-3 !py-2 !text-xs"><RefreshCw className={'h-3.5 w-3.5 ' + (uploading ? 'animate-spin' : '')} />{uploading ? 'Обновляем…' : 'Выбрать'}</span><input type="file" accept="audio/mpeg,audio/wav,audio/flac,.mp3,.wav,.flac" className="sr-only" onChange={replaceAudio} /></label>
    <form onSubmit={(event) => { event.preventDefault(); patchSettings(releaseId, { externalLinks: links }); toast('Внешние ссылки сохранены') }} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="mb-2 flex items-center gap-2"><Share2 className="h-3.5 w-3.5 text-cyan-200" /><p className="text-sm font-medium">Внешние ссылки артиста</p></div><div className="grid gap-2 sm:grid-cols-2">{(['vk', 'telegram', 'bandcamp', 'boosty', 'spotify'] as const).map((key) => <label key={key} className="grid gap-1"><span className="font-mono text-[.6rem] uppercase text-ink-3">{key}</span><input value={links[key]} onChange={(event) => setLinks({ ...links, [key]: event.target.value })} placeholder={`https://${key}.com/...`} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs outline-none focus:border-cyan-300/45" /></label>)}</div><button type="submit" className="ghost mt-3 !px-3 !py-1.5 !text-xs"><Save className="h-3.5 w-3.5" />Сохранить ссылки</button></form>
  </div></section>
}
