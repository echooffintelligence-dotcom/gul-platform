export type ApiResult<T> = { data: T | null; error?: string; fallback: boolean; status?: number }

import type { TrackFacts } from '@/lib/data'

export type ApiTrack = {
  id: string
  title: string
  releaseId?: string
  owner_id: string
  audioUrl?: string
  coverUrl?: string
  durationSec?: number
  facts?: TrackFacts
  createdAt?: string
}

export type ApiRelease = {
  id: string
  title: string
  owner_id: string
  trackIds: string[]
  kind?: string
  genre?: string
  score?: number
  votes?: number
}

export type WorkspaceCardPayload = { id: string; name: string; access: 'owner' | 'editor' | 'viewer'; owner_id?: string }
export type WorkspaceSnapshotPayload = { cards: WorkspaceCardPayload[]; activeId: string; updatedAt: string; owner_id: string }

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown }
const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')

async function fetcher<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  try {
    const hasJsonBody = options.body !== undefined && !(options.body instanceof FormData)
    const requestBody: BodyInit | undefined = options.body === undefined ? undefined : hasJsonBody ? JSON.stringify(options.body) : options.body as FormData
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers ?? {}),
      },
      body: requestBody,
      cache: 'no-store',
    })
    const payload: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`
      return { data: null, error: message, fallback: false, status: response.status }
    }
    return { data: payload as T, fallback: false, status: response.status }
  } catch {
    return { data: null, error: 'Сеть недоступна. Использован локальный режим.', fallback: true }
  }
}

export const apiClient = {
  fetcher,
  auth: {
    login: (email: string, password: string) => fetcher<{ accessToken?: string; user?: { id: string; email: string; username?: string } }>('/api/auth/login', { method: 'POST', body: { email, password } }),
    register: (email: string, password: string, username: string) => fetcher<{ accessToken?: string; user?: { id: string; email: string; username?: string } }>('/api/auth/register', { method: 'POST', body: { email, password, username } }),
    getMe: () => fetcher<{ user: { id: string; email: string; username?: string } | null }>('/api/auth/me'),
    logout: () => fetcher<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  },
  tracks: {
    upload: (track: Omit<ApiTrack, 'createdAt'>) => fetcher<{ track: ApiTrack }>('/api/tracks', { method: 'POST', body: track }),
    getList: (ownerId?: string) => fetcher<{ tracks: ApiTrack[] }>(`/api/tracks${ownerId ? `?owner_id=${encodeURIComponent(ownerId)}` : ''}`),
    getById: (id: string) => fetcher<{ track: ApiTrack | null }>(`/api/tracks?id=${encodeURIComponent(id)}`),
    delete: (id: string, ownerId: string) => fetcher<{ deleted: boolean }>('/api/tracks', { method: 'DELETE', body: { id, owner_id: ownerId } }),
  },
  releases: {
    create: (release: Omit<ApiRelease, 'id'>) => fetcher<{ release: ApiRelease }>('/api/releases', { method: 'POST', body: release }),
    getFeed: () => fetcher<{ releases: ApiRelease[] }>('/api/releases'),
    getChart: () => fetcher<{ releases: ApiRelease[] }>('/api/releases?sort=chart'),
    rateRelease: (releaseId: string, ownerId: string, criteria: number[]) => fetcher<{ releaseId: string; score: number; total: number }>('/api/gzt', { method: 'POST', body: { releaseId, owner_id: ownerId, criteria } }),
  },
  workspace: {
    syncCards: (snapshot: WorkspaceSnapshotPayload) => fetcher<{ snapshot: WorkspaceSnapshotPayload }>('/api/workspace/sync', { method: 'POST', body: snapshot }),
    updatePermissions: (cardId: string, ownerId: string, email: string, role: 'owner' | 'editor' | 'viewer') => fetcher<{ cardId: string; email: string; role: string }>('/api/workspace/sync', { method: 'PATCH', body: { cardId, owner_id: ownerId, email, role } }),
  },
}

export type ApiClient = typeof apiClient
