import { supabase } from '@/lib/supabase'

export type UploadResult = {
  url: string
  source: 'remote' | 'local'
  error?: string
}

const AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/x-flac'])
const COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_AUDIO_BYTES = 100 * 1024 * 1024
const MAX_COVER_BYTES = 10 * 1024 * 1024

function extensionFrom(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : 'bin'
}

function localFallback(file: File, message?: string): UploadResult {
  return { url: URL.createObjectURL(file), source: 'local', error: message }
}

function validate(file: File, types: Set<string>, maxBytes: number, label: string): string | null {
  if (!types.has(file.type)) return `${label}: неподдерживаемый тип файла.`
  if (file.size === 0) return `${label}: файл пуст.`
  if (file.size > maxBytes) return `${label}: размер превышает ${Math.round(maxBytes / 1024 / 1024)} МБ.`
  return null
}

async function uploadFile(file: File, bucket: 'audio' | 'covers', folder: string): Promise<UploadResult> {
  const path = `${folder}/${crypto.randomUUID()}.${extensionFrom(file)}`
  const remoteUrl = await supabase.upload(bucket, path, file)
  return remoteUrl ? { url: remoteUrl, source: 'remote' } : localFallback(file, 'Сеть недоступна: используется локальная копия файла.')
}

export async function uploadAudioFile(file: File): Promise<UploadResult> {
  const error = validate(file, AUDIO_TYPES, MAX_AUDIO_BYTES, 'Аудио')
  if (error) throw new Error(error)
  return uploadFile(file, 'audio', 'tracks')
}

export async function uploadCoverFile(file: File): Promise<UploadResult> {
  const error = validate(file, COVER_TYPES, MAX_COVER_BYTES, 'Обложка')
  if (error) throw new Error(error)
  return uploadFile(file, 'covers', 'releases')
}

export const fileLimits = { maxAudioBytes: MAX_AUDIO_BYTES, maxCoverBytes: MAX_COVER_BYTES }
