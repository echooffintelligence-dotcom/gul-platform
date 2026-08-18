'use client'

import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { Image as ImageIcon, Loader2, Music, Upload } from 'lucide-react'
import { uploadAudioFile, uploadCoverFile } from '@/lib/storage'
import { usePlayer } from '@/components/providers/player-provider'
import { useReleases } from '@/components/providers/release-provider'
import { useToast } from '@/components/providers/toast-provider'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { apiClient } from '@/lib/api-client'

const RELEASE_KINDS = ['сингл', 'EP', 'альбом'] as const
const GENRES = ['хип-хоп', 'электроника', 'поп', 'рок', 'эмбиент', 'другое']
const toCredits = (value: string) => value.split(',').map((name) => name.trim()).filter(Boolean).map((name) => ({ artistId: null, name }))
const toList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean)

function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio')
    const source = URL.createObjectURL(file)
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(source)
      resolve(Number.isFinite(audio.duration) ? Math.max(1, Math.round(audio.duration)) : 1)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(source)
      reject(new Error('Не удалось прочитать длительность аудиофайла.'))
    }
    audio.src = source
  })
}

async function readWaveform(file: File): Promise<number[]> {
  const AudioContextConstructor = window.AudioContext
  if (!AudioContextConstructor) return []
  const context = new AudioContextConstructor()
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer())
    const samples = decoded.getChannelData(0)
    const bars = 96
    const blockSize = Math.max(1, Math.floor(samples.length / bars))
    const values = Array.from({ length: bars }, (_, index) => {
      const start = index * blockSize
      const end = Math.min(samples.length, start + blockSize)
      let peak = 0
      for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) peak = Math.max(peak, Math.abs(samples[sampleIndex]))
      return peak
    })
    const maximum = Math.max(...values, 0.01)
    return values.map((value) => Math.max(0.08, value / maximum))
  } catch {
    return []
  } finally {
    await context.close()
  }
}

export function UploadTrackModal() {
  const { active, canEditActive, incrementActiveTracks } = useWorkspace()
  const { publishRelease } = useReleases()
  const { play } = usePlayer()
  const { toast } = useToast()
  const { user } = useAuth()
  const audioInput = useRef<HTMLInputElement>(null)
  const coverInput = useRef<HTMLInputElement>(null)
  const [releaseTitle, setReleaseTitle] = useState('')
  const [trackTitle, setTrackTitle] = useState('')
  const [kind, setKind] = useState<(typeof RELEASE_KINDS)[number]>('сингл')
  const [genre, setGenre] = useState(GENRES[0])
  const [producedBy, setProducedBy] = useState('')
  const [writtenBy, setWrittenBy] = useState('')
  const [mixedMasteredBy, setMixedMasteredBy] = useState('')
  const [samples, setSamples] = useState('')
  const [tags, setTags] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')

  function setAudio(file: File | null) {
    if (!file) return
    setAudioFile(file)
    setMessage('Аудиофайл выбран. Длительность будет извлечена перед публикацией.')
  }

  function setCover(file: File | null) {
    if (!file) return
    setCoverFile(file)
    setMessage('Обложка выбрана.')
  }

  function onDrop(event: DragEvent<HTMLDivElement>, target: 'audio' | 'cover') {
    event.preventDefault()
    const [file] = Array.from(event.dataTransfer.files)
    if (target === 'audio') setAudio(file)
    else setCover(file)
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>, target: 'audio' | 'cover') {
    const [file] = Array.from(event.target.files ?? [])
    if (target === 'audio') setAudio(file)
    else setCover(file)
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canEditActive) {
      setMessage('Роль viewer позволяет только просматривать аналитику.')
      return
    }
    if (!releaseTitle.trim() || !trackTitle.trim() || !audioFile) {
      setMessage('Заполните названия релиза и трека, затем выберите аудиофайл.')
      return
    }

    setUploading(true)
    setProgress(8)
    try {
      const [durationSec, waveform] = await Promise.all([readDuration(audioFile), readWaveform(audioFile)])
      setProgress(28)
      setMessage('Загружаем аудио в Storage…')
      const audio = await uploadAudioFile(audioFile)
      setProgress(62)
      let coverUrl: string | undefined
      let fallbackNotice = audio.error
      if (coverFile) {
        setMessage('Загружаем обложку…')
        const cover = await uploadCoverFile(coverFile)
        coverUrl = cover.url
        fallbackNotice = fallbackNotice ?? cover.error
      }
      setProgress(85)
      const { track } = publishRelease({
        releaseTitle,
        kind,
        genre,
        artistId: active.id,
        artistName: active.name,
        ownerId: user?.id ?? 'local-anonymous',
        trackTitle,
        durationSec,
        audioUrl: audio.url,
        coverUrl,
        facts: { producedBy: toCredits(producedBy), writtenBy: toCredits(writtenBy), mixedMasteredBy: toCredits(mixedMasteredBy), samples: toList(samples), tags: toList(tags) },
      })
      incrementActiveTracks()
      void apiClient.tracks.upload({ id: track.id, title: track.title, owner_id: track.owner_id ?? 'local-anonymous', releaseId: track.releaseId, audioUrl: track.audioUrl, coverUrl: track.coverUrl, durationSec: track.durationSec, facts: track.facts })
      void apiClient.releases.create({ title: releaseTitle.trim(), owner_id: user?.id ?? 'local-anonymous', trackIds: [track.id], kind, genre })
      play({ ...track, audioUrl: track.audioUrl ?? audio.url, waveform })
      setProgress(100)
      setMessage(fallbackNotice ?? 'Релиз опубликован и добавлен в каталог.')
      toast(fallbackNotice ? 'Файл опубликован локально: сеть недоступна' : 'Релиз опубликован')
      setReleaseTitle('')
      setTrackTitle('')
      setProducedBy('')
      setWrittenBy('')
      setMixedMasteredBy('')
      setSamples('')
      setTags('')
      setAudioFile(null)
      setCoverFile(null)
    } catch (error) {
      setProgress(0)
      setMessage(error instanceof Error ? error.message : 'Не удалось опубликовать релиз.')
    } finally {
      setUploading(false)
    }
  }

  if (!canEditActive) {
    return <section className="mt-8 border border-dashed border-ink-2 p-5"><div className="eyebrow">публикация</div><p className="mt-2 font-mono text-sm text-ink-3">Для роли viewer публикация и редактирование отключены. Доступен только просмотр аналитики.</p></section>
  }

  return (
    <section className="mt-8 border border-ink p-5" aria-labelledby="publish-title">
      <div className="flex items-center gap-2"><Upload className="h-5 w-5 text-accent-b" /><div><div className="eyebrow">публикация</div><h2 id="publish-title" className="font-mono text-lg font-semibold">Добавить релиз и трек</h2></div></div>
      <form onSubmit={publish} className="mt-5 grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Название релиза</span><input required value={releaseTitle} onChange={(event) => setReleaseTitle(event.target.value)} placeholder="Новый сингл" className="border border-ink-1 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-ink" /></label>
          <label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Название трека</span><input required value={trackTitle} onChange={(event) => setTrackTitle(event.target.value)} placeholder="Первый трек" className="border border-ink-1 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-ink" /></label>
          <label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Тип релиза</span><select value={kind} onChange={(event) => setKind(event.target.value as (typeof RELEASE_KINDS)[number])} className="border border-ink-1 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-ink">{RELEASE_KINDS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Жанр</span><select value={genre} onChange={(event) => setGenre(event.target.value)} className="border border-ink-1 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-ink">{GENRES.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>

        <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.025] p-3"><div className="eyebrow mb-3">создатели и факты · genius-style</div><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Продюсер / битмейкер</span><input value={producedBy} onChange={(event) => setProducedBy(event.target.value)} placeholder="имя, ещё имя" className="border border-ink-1 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-ink" /></label><label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Авторы текста</span><input value={writtenBy} onChange={(event) => setWrittenBy(event.target.value)} placeholder="имя, ещё имя" className="border border-ink-1 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-ink" /></label><label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Сведение / мастеринг</span><input value={mixedMasteredBy} onChange={(event) => setMixedMasteredBy(event.target.value)} placeholder="студия или специалист" className="border border-ink-1 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-ink" /></label><label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Сэмплы</span><input value={samples} onChange={(event) => setSamples(event.target.value)} placeholder="источник, источник" className="border border-ink-1 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-ink" /></label><label className="grid gap-1 sm:col-span-2"><span className="font-mono text-xs text-ink-3">Теги / жанры трека</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="лоу-фай, гаражный рэп, ночной город" className="border border-ink-1 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-ink" /></label></div></div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, 'audio')} onClick={() => audioInput.current?.click()} className="cursor-pointer border border-dashed border-ink-2 p-5 text-center transition-colors hover:border-ink">
            <Music className="mx-auto h-6 w-6 text-accent-b" /><p className="mt-2 font-mono text-sm">{audioFile ? audioFile.name : 'Перетащите аудио или выберите файл'}</p><p className="mt-1 font-mono text-xs text-ink-3">MP3, WAV, FLAC · до 100 МБ</p>
            <input ref={audioInput} type="file" accept=".mp3,.wav,.flac,audio/mpeg,audio/wav,audio/flac" className="sr-only" onChange={(event) => onFileChange(event, 'audio')} />
          </div>
          <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, 'cover')} onClick={() => coverInput.current?.click()} className="cursor-pointer border border-dashed border-ink-2 p-5 text-center transition-colors hover:border-ink">
            <ImageIcon className="mx-auto h-6 w-6 text-accent-o" /><p className="mt-2 font-mono text-sm">{coverFile ? coverFile.name : 'Перетащите обложку или выберите файл'}</p><p className="mt-1 font-mono text-xs text-ink-3">JPG, PNG, WEBP · до 10 МБ</p>
            <input ref={coverInput} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => onFileChange(event, 'cover')} />
          </div>
        </div>

        {(uploading || progress > 0) && <div><div className="h-1 overflow-hidden bg-paper-3"><div className="h-full bg-ink transition-[width]" style={{ width: `${progress}%` }} /></div><p className="mt-1 font-mono text-xs text-ink-3">{progress}%</p></div>}
        {message && <p role="status" className="font-mono text-xs text-ink-2">{message}</p>}
        <button type="submit" disabled={uploading} className="solid w-full sm:w-auto">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{uploading ? 'Публикуем…' : 'Опубликовать и воспроизвести'}</button>
      </form>
    </section>
  )
}
