import type { WorkspaceCard } from '@/lib/data'
import { supabaseConfig } from '@/lib/supabase-config'

export type WorkspaceSnapshot = {
  cards: WorkspaceCard[]
  activeId: string
  updatedAt: string
}

type WorkspaceRow = {
  payload?: unknown
  updated_at?: unknown
}

const baseUrl = supabaseConfig.url
const anonKey = supabaseConfig.anonKey
const DEFAULT_TIMEOUT_MS = 8_000

function withTimeout(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  return { signal: controller.signal, clear: () => window.clearTimeout(timeout) }
}

function isWorkspaceSnapshot(value: unknown): value is WorkspaceSnapshot {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<WorkspaceSnapshot>
  return Array.isArray(candidate.cards) && typeof candidate.activeId === 'string' && typeof candidate.updatedAt === 'string'
}

/**
 * Запрос к Supabase от имени пользователя.
 *
 * accessToken обязателен для всего, что пишет данные: под анонимным ключом RLS
 * не пропустит вставку, и это правильно — иначе чужой снапшот можно перезаписать.
 */
async function request(path: string, init: RequestInit, accessToken?: string | null, timeoutMs?: number): Promise<Response | null> {
  if (!baseUrl || !anonKey) return null
  const { signal, clear } = withTimeout(timeoutMs)
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken || anonKey}`,
        ...(init.headers ?? {}),
      },
      cache: 'no-store',
    })
    return response.ok ? response : null
  } catch {
    return null
  } finally {
    clear()
  }
}

function encodePath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/')
}

export const supabase = {
  enabled: supabaseConfig.enabled,
  baseUrl,
  anonKey,
  publicUrl(bucket: 'audio' | 'covers', path: string) {
    return `${baseUrl}/storage/v1/object/public/${bucket}/${encodePath(path)}`
  },

  /** Снапшот рабочего пространства принадлежит конкретному пользователю. */
  async loadWorkspace(ownerId: string, accessToken?: string | null): Promise<WorkspaceSnapshot | null> {
    if (!ownerId || !accessToken) return null
    const response = await request(
      `/rest/v1/workspace_snapshots?owner_id=eq.${encodeURIComponent(ownerId)}&select=payload,updated_at`,
      { method: 'GET' },
      accessToken,
    )
    if (!response) return null
    const rows: unknown = await response.json().catch(() => null)
    if (!Array.isArray(rows) || rows.length === 0) return null
    const row = rows[0] as WorkspaceRow
    if (!isWorkspaceSnapshot(row.payload)) return null
    const snapshot = row.payload
    const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : snapshot.updatedAt
    return { ...snapshot, updatedAt }
  },

  async saveWorkspace(snapshot: WorkspaceSnapshot, ownerId: string, accessToken?: string | null): Promise<boolean> {
    if (!ownerId || !accessToken) return false
    const response = await request(
      '/rest/v1/workspace_snapshots?on_conflict=owner_id',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ owner_id: ownerId, payload: snapshot, updated_at: snapshot.updatedAt }),
      },
      accessToken,
    )
    return Boolean(response)
  },

  /**
   * Файл кладётся в личную папку пользователя: <uid>/<folder>/<uuid>.<ext>.
   * Политика Storage сверяет первый сегмент пути с auth.uid(), поэтому писать
   * в чужую папку нельзя даже при полном контроле над клиентом.
   */
  async upload(bucket: 'audio' | 'covers', path: string, file: File, accessToken?: string | null): Promise<string | null> {
    if (!accessToken) return null
    const response = await request(
      `/storage/v1/object/${bucket}/${encodePath(path)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' },
        body: file,
      },
      accessToken,
      20_000,
    )
    return response ? this.publicUrl(bucket, path) : null
  },
}
