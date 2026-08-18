import type { WorkspaceCard } from '@/lib/data'

export type WorkspaceSnapshot = {
  cards: WorkspaceCard[]
  activeId: string
  updatedAt: string
}

type WorkspaceRow = {
  payload?: unknown
  updated_at?: unknown
}

const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://tpuoxbvlzgofqzfyoene.supabase.co'
const configuredAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_h23HgO70CV2Q4a7XdXraEg_O9AVZlXx'
const baseUrl = configuredUrl.replace(/\/$/, '')
const snapshotId = 'gul-local-demo'
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

async function request(path: string, init: RequestInit, timeoutMs?: number): Promise<Response | null> {
  if (!baseUrl || !configuredAnonKey) return null
  const { signal, clear } = withTimeout(timeoutMs)
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal,
      headers: {
        apikey: configuredAnonKey,
        Authorization: `Bearer ${configuredAnonKey}`,
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
  enabled: Boolean(baseUrl && configuredAnonKey),
  baseUrl,
  anonKey: configuredAnonKey,
  publicUrl(bucket: 'audio' | 'covers', path: string) {
    return `${baseUrl}/storage/v1/object/public/${bucket}/${encodePath(path)}`
  },
  async loadWorkspace(): Promise<WorkspaceSnapshot | null> {
    const response = await request(`/rest/v1/workspace_snapshots?id=eq.${encodeURIComponent(snapshotId)}&select=payload,updated_at`, { method: 'GET' })
    if (!response) return null
    const rows: unknown = await response.json()
    if (!Array.isArray(rows) || rows.length === 0) return null
    const row = rows[0] as WorkspaceRow
    if (!isWorkspaceSnapshot(row.payload)) return null
    const snapshot = row.payload
    const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : snapshot.updatedAt
    return { ...snapshot, updatedAt }
  },
  async saveWorkspace(snapshot: WorkspaceSnapshot): Promise<boolean> {
    const response = await request('/rest/v1/workspace_snapshots?on_conflict=id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({ id: snapshotId, payload: snapshot, updated_at: snapshot.updatedAt }),
    })
    return Boolean(response)
  },
  async upload(bucket: 'audio' | 'covers', path: string, file: File): Promise<string | null> {
    const response = await request(`/storage/v1/object/${bucket}/${encodePath(path)}`, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'false',
      },
      body: file,
    }, 20_000)
    return response ? this.publicUrl(bucket, path) : null
  },
}
