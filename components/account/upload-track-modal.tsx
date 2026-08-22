'use client'

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { AlertTriangle, Image as ImageIcon, Loader2, Music, Upload } from 'lucide-react'
import { uploadAudioFile, uploadCoverFile } from '@/lib/storage'
import { usePlayer } from '@/components/providers/player-provider'
import { useReleases } from '@/components/providers/release-provider'
import { useToast } from '@/components/providers/toast-provider'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'

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
  const { user, accessToken } = useAuth()
  const audioInput = useRef<HTMLInputElement>(null)
  const coverInput = useRef<HTMLInputElement>(null)
  const [releaseTitle, setReleaseTitle] = useState('')
  const [trackTitle, setTrackTitle] = useState('')
  const [featuring, setFeaturing] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [kind, setKind] = useState<(typeof RELEASE_KINDS)[number]>('сингл')
  const [genre, setGenre] = useState(GENRES[0])
  const [producedBy, setProducedBy] = useState('')
  const [writtenBy, setWrittenBy] = useState('')
  const [mixedMasteredBy, setMixedMasteredBy] = useState('')
  const [samples, setSamples] = useState('')
  const [tags, setTags] = useState('')
  const [isAiGenerated, setIsAiGenerated] = useState(false)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [warning, setWarning] = useState('')

  // Превью обложки живёт в blob: — освобождаем URL, иначе он течёт при каждой замене файла.
  useEffect(() => {
    if (!coverFile) { setCoverPreview(null); return }
    const url = URL.createObjectURL(coverFile)
    setCoverPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [coverFile])

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
    setWarning('')
    try {
      const storageContext = { userId: user?.id, accessToken }
      const [durationSec, waveform] = await Promise.all([readDuration(audioFile), readWaveform(audioFile)])
      setProgress(28)
      setMessage('Загружаем аудио в Storage…')
      const audio = await uploadAudioFile(audioFile, storageContext)
      setProgress(62)

      let coverUrl: string | undefined
      if (coverFile) {
        setMessage('Загружаем обложку…')
        const cover = await uploadCoverFile(coverFile, storageContext)
        coverUrl = cover.url
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
        featuring: toList(featuring),
        videoUrl: videoUrl.trim() || undefined,
        durationSec,
        audioUrl: audio.url,
        coverUrl,
        isAiGenerated,
        facts: {
          producedBy: toCredits(producedBy),
          writtenBy: toCredits(writtenBy),
          mixedMasteredBy: toCredits(mixedMasteredBy),
          samples: toList(samples),
          tags: toList(tags),
        },
      })
      incrementActiveTracks()

      // Каталог на сервере обновляем только для настоящей сессии: без JWT запрос
      // всё равно вернёт 401, и молчаливая попытка только запутала бы.
      if (accessToken) {
        void apiClient.tracks.upload({
          id: track.id,
          title: track.title,
          releaseId: track.releaseId,
          audioUrl: track.audioUrl,
          coverUrl: track.coverUrl,
          durationSec: track.durationSec,
          facts: track.facts,
          featuring: track.featuring,
          isAiGenerated,
        })
        void apiClient.releases.create({ title: releaseTitle.trim(), trackIds: [track.id], kind, genre })
      }

      play({ ...track, audioUrl: track.audioUrl ?? audio.url, waveform, isAiGenerated })
      setProgress(100)

      if (audio.persistent) {
        setMessage('Релиз опубликован: аудио доступно всем по постоянному URL.')
        toast('Релиз опубликован')
      } else {
        // Прямо говорим, что файл никуда не уехал. Прежняя версия показывала
        // нейтральное «опубликовано локально», и трек молча пропадал.
        setWarning(audio.error ?? 'Файл сохранён только в этой вкладке.')
        setMessage('Релиз добавлен в каталог, но аудио не попало в Storage.')
        toast('Аудио сохранено только локально')
      }

      setReleaseTitle('')
      setTrackTitle('')
      setFeaturing('')
      setVideoUrl('')
      setProducedBy('')
      setWrittenBy('')
      setMixedMasteredBy('')
      setSamples('')
      setTags('')
      setIsAiGenerated(false)
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
    return (
      <section className="mt-8 border border-dashed border-ink-2 p-5">
        <div className="eyebrow">публикация</div>
        <p className="mt-2 font-mono text-sm text-ink-3">Для роли viewer публикация и редактирование отключены. Доступен только просмотр аналитики.</p>
      </section>
    )
  }

  const fieldClass = 'border border-ink-1 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-ink'
  const dropZone = 'cursor-pointer border border-dashed border-ink-2 p-5 text-center transition-colors hover:border-ink'

  return (
    <section className="mt-8 border border-ink p-5" aria-labelledby="publish-title">
      <div className="flex items-center gap-2">
        <Upload className="h-5 w-5 text-accent-b" />
        <div>
          <div className="eyebrow">публикация</div>
          <h2 id="publish-title" className="font-mono text-lg font-semibold">Добавить релиз и трек</h2>
        </div>
      </div>

      {!accessToken && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-accent-hot/30 bg-accent-hot/[.06] p-3 font-mono text-xs text-accent-hot">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Вы работаете в локальном режиме без подтверждённой сессии. Публикация останется только в этом браузере: аудио не попадёт в Storage и не будет доступно другим слушателям.
        </p>
      )}

      <form onSubmit={publish} className="mt-5 grid gap-4">
        <div className="grid gap-3">
          <label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Название релиза</span><input required value={releaseTitle} onChange={(event) => setReleaseTitle(event.target.value)} placeholder="Новый сингл" className={fieldClass} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Название трека</span><input required value={trackTitle} onChange={(event) => setTrackTitle(event.target.value)} placeholder="Первый трек" className={fieldClass} /></label>
            <label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Фиты / Совместно с (feat.)</span><input value={featuring} onChange={(event) => setFeaturing(event.target.value)} placeholder="например: OG Buda, MAYOT" className={fieldClass} /><span className="font-mono text-[.6rem] text-ink-3">Через запятую. Артисты с карточкой на ГУЛе станут ссылками.</span></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Тип релиза</span><select value={kind} onChange={(event) => setKind(event.target.value as (typeof RELEASE_KINDS)[number])} className={fieldClass}>{RELEASE_KINDS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Жанр</span><select value={genre} onChange={(event) => setGenre(event.target.value)} className={fieldClass}>{GENRES.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
        </div>

        <div className="rounded-xl border border-accent-1/15 bg-accent-1/[.025] p-3">
          <div className="eyebrow mb-3">создатели и факты · genius-style</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Продюсер / битмейкер</span><input value={producedBy} onChange={(event) => setProducedBy(event.target.value)} placeholder="имя, ещё имя" className={fieldClass} /></label>
            <label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Авторы текста</span><input value={writtenBy} onChange={(event) => setWrittenBy(event.target.value)} placeholder="имя, ещё имя" className={fieldClass} /></label>
            <label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Сведение / мастеринг</span><input value={mixedMasteredBy} onChange={(event) => setMixedMasteredBy(event.target.value)} placeholder="студия или специалист" className={fieldClass} /></label>
            <label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Сэмплы</span><input value={samples} onChange={(event) => setSamples(event.target.value)} placeholder="источник, источник" className={fieldClass} /></label>
            <label className="grid gap-1 sm:col-span-2"><span className="font-mono text-xs text-ink-3">Теги / жанры трека</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="лоу-фай, гаражный рэп, ночной город" className={fieldClass} /><span className="font-mono text-[.6rem] text-ink-3">Теги питают «Мою волну» и блок похожих артистов — чем точнее, тем лучше рекомендации.</span></label>
          </div>
        </div>

        <label className="grid gap-1">
          <span className="font-mono text-xs text-ink-3">Ссылка на клип — необязательно</span>
          <input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://.../clip.mp4" className={fieldClass} />
          <span className="font-mono text-[.6rem] text-ink-3">Если клип есть, в плеере появится кнопка «Клип» и видео откроется во весь экран.</span>
        </label>

        {/* Маркировка ИИ-треков */}
        <label className={cn('flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors', isAiGenerated ? 'is-selected border-accent-2/40 bg-accent-2/[.06]' : 'border-ink-1 hover:border-ink')}>
          <input type="checkbox" checked={isAiGenerated} onChange={(event) => setIsAiGenerated(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent-2)]" />
          <span>
            <span className="block font-mono text-sm">🤖 Трек создан с помощью ИИ (Suno, Udio и др.)</span>
            <span className="mt-1 block font-mono text-[.65rem] text-ink-3">На карточке трека, в чарте и в плеере появится бейдж AI. Честная маркировка — требование площадки.</span>
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onDrop(event, 'audio')}
            onClick={() => audioInput.current?.click()}
            className={cn(dropZone, audioFile && 'is-selected')}
          >
            <Music className="mx-auto h-6 w-6 text-accent-b" />
            <p className="mt-2 font-mono text-sm">{audioFile ? audioFile.name : 'Перетащите аудио или выберите файл'}</p>
            <p className="mt-1 font-mono text-xs text-ink-3">{audioFile ? `${(audioFile.size / 1024 / 1024).toFixed(1)} МБ · выбран` : 'MP3, WAV, FLAC · до 100 МБ'}</p>
            <input ref={audioInput} type="file" accept=".mp3,.wav,.flac,audio/mpeg,audio/wav,audio/flac" className="sr-only" onChange={(event) => onFileChange(event, 'audio')} />
          </div>

          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onDrop(event, 'cover')}
            onClick={() => coverInput.current?.click()}
            className={cn(dropZone, coverFile && 'is-selected')}
          >
            {coverPreview ? (
              <span className="cover is-selected-cover mx-auto block h-16 w-16" style={{ backgroundImage: `url(${coverPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' }} aria-hidden />
            ) : (
              <ImageIcon className="mx-auto h-6 w-6 text-accent-o" />
            )}
            <p className="mt-2 font-mono text-sm">{coverFile ? coverFile.name : 'Перетащите обложку или выберите файл'}</p>
            <p className="mt-1 font-mono text-xs text-ink-3">{coverFile ? 'выбрана' : 'JPG, PNG, WEBP · до 10 МБ'}</p>
            <input ref={coverInput} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => onFileChange(event, 'cover')} />
          </div>
        </div>

        {(uploading || progress > 0) && (
          <div>
            <div className="h-1 overflow-hidden bg-paper-3"><div className="h-full bg-ink transition-[width]" style={{ width: `${progress}%` }} /></div>
            <p className="mt-1 font-mono text-xs text-ink-3">{progress}%</p>
          </div>
        )}
        {message && <p role="status" className="font-mono text-xs text-ink-2">{message}</p>}
        {warning && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-accent-hot/35 bg-accent-hot/[.07] p-3 font-mono text-xs text-accent-hot">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {warning}
          </p>
        )}
        <button type="submit" disabled={uploading} className="solid w-full sm:w-auto">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Публикуем…' : 'Опубликовать и воспроизвести'}
        </button>
      </form>
    </section>
  )
}
