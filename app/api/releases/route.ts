import { NextRequest, NextResponse } from 'next/server'
import type { ApiRelease } from '@/lib/api-client'
import { identityFromRequest } from '@/lib/server-auth'
import { asText, bearerFrom, createId, isRecord, listReleases, saveRelease } from '@/lib/server-store'

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { 'Cache-Control': 'no-store', ...(init?.headers ?? {}) } })
}

export async function GET(request: NextRequest) {
  const chartOrder = request.nextUrl.searchParams.get('sort') === 'chart'
  const result = await listReleases(bearerFrom(request), chartOrder)
  return json({ releases: result.releases, fallback: result.fallback })
}

export async function POST(request: NextRequest) {
  const identity = await identityFromRequest(request)
  if (!identity) return json({ error: 'Требуется авторизация. Передайте заголовок Authorization: Bearer <token>.' }, { status: 401 })

  const payload: unknown = await request.json().catch(() => null)
  if (!isRecord(payload)) return json({ error: 'Некорректные данные релиза.' }, { status: 400 })
  const title = asText(payload.title)
  const trackIds = Array.isArray(payload.trackIds)
    ? payload.trackIds.filter((id): id is string => typeof id === 'string' && id.length > 0).slice(0, 100)
    : []
  if (!title || trackIds.length === 0) return json({ error: 'Название и хотя бы один trackId обязательны.' }, { status: 422 })

  const release: ApiRelease = {
    id: createId('release'),
    title,
    // Владелец — только проверенный пользователь, а не то, что прислал клиент.
    owner_id: identity.id,
    trackIds,
    kind: asText(payload.kind, 40) || undefined,
    genre: asText(payload.genre, 60) || undefined,
    score: 0,
    votes: 0,
  }
  const result = await saveRelease(bearerFrom(request), release)
  return json({ release: result.release, fallback: result.fallback }, { status: 201 })
}
