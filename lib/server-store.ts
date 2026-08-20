import type { ApiRelease, ApiTrack, WorkspaceSnapshotPayload } from '@/lib/api-client'
import { supabaseConfig } from '@/lib/supabase-config'

/**
 * Доступ к данным для route handlers.
 *
 * Основной путь — PostgREST от имени самого пользователя: запрос уходит с его
 * access-токеном, поэтому владение проверяет RLS в БД (supabase/schema.sql).
 * Даже если новый handler забудет сравнить owner_id, база не отдаст чужую строку.
 *
 * Резервный путь — процессная память. Он нужен, только когда Supabase недоступен,
 * живёт до перезапуска процесса и не разделяется между инстансами, поэтому каждый
 * собранный из него ответ помечается fallback: true.
 */

export const tracksStore = new Map<string, ApiTrack>()
export const releasesStore = new Map<string, ApiRelease>()
export const workspaceStore = new Map<string, WorkspaceSnapshotPayload>()
export const votesStore = new Map<string, Map<string, number>>()

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function asText(value: unknown, max = 160) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

const REST_TIMEOUT_MS = 8_000

async function rest(path: string, accessToken: string, init: RequestInit = {}): Promise<Response | null> {
  if (!supabaseConfig.enabled) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REST_TIMEOUT_MS)
  try {
    // Без пользовательского токена запрос уходит как анонимный: RLS сам решит,
    // какие строки видны публике. Так чтение остаётся открытым, а запись — нет.
    const response = await fetch(`${supabaseConfig.url}/rest/v1${path}`, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${accessToken || supabaseConfig.anonKey}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    })
    return response.ok ? response : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function rows<T>(response: Response | null): Promise<T[] | null> {
  if (!response) return null
  try {
    const parsed: unknown = await response.json()
    return Array.isArray(parsed) ? (parsed as T[]) : null
  } catch {
    return null
  }
}

export function bearerFrom(request: Request) {
  const header = request.headers.get('authorization') ?? ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  return token && token !== header.trim() ? token : ''
}

// ─── треки ──────────────────────────────────────────────────────────────────

export async function listTracks(token: string, ownerId?: string) {
  const query = ownerId ? `?owner_id=eq.${encodeURIComponent(ownerId)}&select=*` : '?select=*'
  const remote = await rows<ApiTrack>(await rest(`/tracks${query}`, token))
  if (remote) return { tracks: remote, fallback: false }
  const tracks = Array.from(tracksStore.values()).filter((track) => !ownerId || track.owner_id === ownerId)
  return { tracks, fallback: true }
}

export async function findTrack(token: string, id: string) {
  const remote = await rows<ApiTrack>(await rest(`/tracks?id=eq.${encodeURIComponent(id)}&select=*`, token))
  if (remote) return { track: remote[0] ?? null, fallback: false }
  return { track: tracksStore.get(id) ?? null, fallback: true }
}

export async function saveTrack(token: string, track: ApiTrack) {
  const response = await rest('/tracks?on_conflict=id', token, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(track),
  })
  const remote = await rows<ApiTrack>(response)
  if (remote && remote[0]) return { track: remote[0], fallback: false }
  tracksStore.set(track.id, track)
  return { track, fallback: true }
}

export async function removeTrack(token: string, id: string, ownerId: string) {
  const response = await rest(
    `/tracks?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(ownerId)}`,
    token,
    { method: 'DELETE', headers: { Prefer: 'return=representation' } },
  )
  const remote = await rows<ApiTrack>(response)
  if (remote) return { deleted: remote.length > 0, fallback: false }
  const existing = tracksStore.get(id)
  if (!existing || existing.owner_id !== ownerId) return { deleted: false, fallback: true }
  tracksStore.delete(id)
  return { deleted: true, fallback: true }
}

// ─── релизы ─────────────────────────────────────────────────────────────────

export async function listReleases(token: string, chartOrder: boolean) {
  const order = chartOrder ? 'score.desc' : 'created_at.desc'
  const remote = await rows<ApiRelease>(await rest(`/releases?select=*&order=${order}`, token))
  if (remote) return { releases: remote, fallback: false }
  const releases = Array.from(releasesStore.values()).sort((left, right) =>
    chartOrder ? (right.score ?? 0) - (left.score ?? 0) : right.id.localeCompare(left.id),
  )
  return { releases, fallback: true }
}

export async function findRelease(token: string, id: string) {
  const remote = await rows<ApiRelease>(await rest(`/releases?id=eq.${encodeURIComponent(id)}&select=*`, token))
  if (remote) return { release: remote[0] ?? null, fallback: false }
  return { release: releasesStore.get(id) ?? null, fallback: true }
}

export async function saveRelease(token: string, release: ApiRelease) {
  const response = await rest('/releases?on_conflict=id', token, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(release),
  })
  const remote = await rows<ApiRelease>(response)
  if (remote && remote[0]) return { release: remote[0], fallback: false }
  releasesStore.set(release.id, release)
  return { release, fallback: true }
}

// ─── голоса ГЗТ ─────────────────────────────────────────────────────────────

/**
 * Один пользователь — один голос за релиз. Повторный вызов заменяет прежнюю
 * оценку, а не добавляет новую: именно так закрывается накрутка.
 */
export async function castVote(token: string, releaseId: string, voterId: string, score: number) {
  const stored = await rows<{ score: number }>(
    await rest('/gzt_votes?on_conflict=release_id,voter_id', token, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ release_id: releaseId, voter_id: voterId, score }),
    }),
  )
  if (stored) {
    const all = await rows<{ score: number }>(
      await rest(`/gzt_votes?release_id=eq.${encodeURIComponent(releaseId)}&select=score`, token),
    )
    if (all) {
      const votes = all.length
      const average = votes ? Math.round((all.reduce((sum, row) => sum + row.score, 0) / votes) * 10) / 10 : 0
      await rest(`/releases?id=eq.${encodeURIComponent(releaseId)}`, token, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ score: average, votes }),
      })
      return { votes, average, fallback: false }
    }
  }
  const perRelease = votesStore.get(releaseId) ?? new Map<string, number>()
  perRelease.set(voterId, score)
  votesStore.set(releaseId, perRelease)
  const values = Array.from(perRelease.values())
  const average = Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
  const release = releasesStore.get(releaseId)
  if (release) {
    release.score = average
    release.votes = values.length
    releasesStore.set(releaseId, release)
  }
  return { votes: values.length, average, fallback: true }
}

// ─── workspace ──────────────────────────────────────────────────────────────

export async function loadSnapshot(token: string, ownerId: string) {
  const remote = await rows<{ payload: WorkspaceSnapshotPayload }>(
    await rest(`/workspace_snapshots?owner_id=eq.${encodeURIComponent(ownerId)}&select=payload`, token),
  )
  if (remote) return { snapshot: remote[0]?.payload ?? null, fallback: false }
  return { snapshot: workspaceStore.get(ownerId) ?? null, fallback: true }
}

export async function storeSnapshot(token: string, snapshot: WorkspaceSnapshotPayload) {
  const response = await rest('/workspace_snapshots?on_conflict=owner_id', token, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ owner_id: snapshot.owner_id, payload: snapshot, updated_at: snapshot.updatedAt }),
  })
  if (response) return { fallback: false }
  workspaceStore.set(snapshot.owner_id, snapshot)
  return { fallback: true }
}
