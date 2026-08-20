import { supabase } from '@/lib/supabase'

export type UploadResult = {
  url: string
  source: 'remote' | 'local'
  /**
   * true — файл лежит в Storage и доступен всем по постоянному URL.
   * false — это blob: внутри текущей вкладки: он умрёт при перезагрузке
   * страницы и не виден никому другому. UI обязан предупредить об этом.
   */
  persistent: boolean
  error?: string
}

const AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/x-flac'])
const COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_AUDIO_BYTES = 100 * 1024 * 1024
const MAX_COVER_BYTES = 10 * 1024 * 1024
const UPLOAD_ATTEMPTS = 3

export type UploadContext = { userId?: string | null; accessToken?: string | null }

function extensionFrom(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : 'bin'
}

function localFallback(file: File, message: string): UploadResult {
  return { url: URL.createObjectURL(file), source: 'local', persistent: false, error: message }
}

function validate(file: File, types: Set<string>, maxBytes: number, label: string): string | null {
  if (!types.has(file.type)) return `${label}: неподдерживаемый тип файла.`
  if (file.size === 0) return `${label}: файл пуст.`
  if (file.size > maxBytes) return `${label}: размер превышает ${Math.round(maxBytes / 1024 / 1024)} МБ.`
  return null
}

const delay = (ms: number) => new Promise((resolve) => { window.setTimeout(resolve, ms) })

async function uploadFile(file: File, bucket: 'audio' | 'covers', folder: string, context: UploadContext): Promise<UploadResult> {
  if (!context.userId || !context.accessToken) {
    return localFallback(file, 'Вы не авторизованы: файл доступен только в этой вкладке и исчезнет после перезагрузки.')
  }

  // Путь начинается с uid — этого требует политика Storage из supabase/schema.sql.
  const path = `${context.userId}/${folder}/${crypto.randomUUID()}.${extensionFrom(file)}`

  // Сетевые сбои при заливке многомегабайтного аудио — обычное дело,
  // поэтому одна неудачная попытка ещё не повод терять файл.
  for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt += 1) {
    const remoteUrl = await supabase.upload(bucket, path, file, context.accessToken)
    if (remoteUrl) return { url: remoteUrl, source: 'remote', persistent: true }
    if (attempt < UPLOAD_ATTEMPTS) await delay(attempt * 700)
  }

  return localFallback(file, 'Storage недоступен: файл проигрывается локально и исчезнет после перезагрузки. Опубликуйте его повторно, когда связь восстановится.')
}

export async function uploadAudioFile(file: File, context: UploadContext): Promise<UploadResult> {
  const error = validate(file, AUDIO_TYPES, MAX_AUDIO_BYTES, 'Аудио')
  if (error) throw new Error(error)
  return uploadFile(file, 'audio', 'tracks', context)
}

export async function uploadCoverFile(file: File, context: UploadContext): Promise<UploadResult> {
  const error = validate(file, COVER_TYPES, MAX_COVER_BYTES, 'Обложка')
  if (error) throw new Error(error)
  return uploadFile(file, 'covers', 'releases', context)
}

export const fileLimits = { maxAudioBytes: MAX_AUDIO_BYTES, maxCoverBytes: MAX_COVER_BYTES }
