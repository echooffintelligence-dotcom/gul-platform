import { NextRequest, NextResponse } from 'next/server'
import type { ApiRelease } from '@/lib/api-client'
import { asText, createId, isRecord, releasesStore } from '@/lib/server-api-store'

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { 'Cache-Control': 'no-store', ...(init?.headers ?? {}) } })
}

export async function GET(request: NextRequest) {
  const chart = request.nextUrl.searchParams.get('sort') === 'chart'
  const releases = Array.from(releasesStore.values()).sort((left, right) => chart ? (right.score ?? 0) - (left.score ?? 0) : (right.id.localeCompare(left.id)))
  return json({ releases, fallback: true })
}

export async function POST(request: NextRequest) {
  const payload: unknown = await request.json().catch(() => null)
  if (!isRecord(payload)) return json({ error: 'Некорректные данные релиза.' }, { status: 400 })
  const title = asText(payload.title)
  const ownerId = asText(payload.owner_id, 120)
  const trackIds = Array.isArray(payload.trackIds) ? payload.trackIds.filter((id): id is string => typeof id === 'string' && id.length > 0).slice(0, 100) : []
  if (!title || !ownerId || trackIds.length === 0) return json({ error: 'Название, owner_id и хотя бы один trackId обязательны.' }, { status: 422 })
  const release: ApiRelease = {
    id: createId('release'), title, owner_id: ownerId, trackIds,
    kind: asText(payload.kind, 40) || undefined, genre: asText(payload.genre, 60) || undefined,
    score: 0, votes: 0,
  }
  releasesStore.set(release.id, release)
  return json({ release, fallback: true }, { status: 201 })
}
