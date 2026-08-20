import { NextRequest, NextResponse } from 'next/server'
import type { ApiTrack } from '@/lib/api-client'
import type { TrackFacts } from '@/lib/data'
import { identityFromRequest } from '@/lib/server-auth'
import { asText, bearerFrom, createId, findTrack, isRecord, listTracks, removeTrack, saveTrack } from '@/lib/server-store'

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { 'Cache-Control': 'no-store', ...(init?.headers ?? {}) } })
}

const unauthorized = () => json({ error: 'Требуется авторизация. Передайте заголовок Authorization: Bearer <token>.' }, { status: 401 })

export async function GET(request: NextRequest) {
  const token = bearerFrom(request)
  const id = request.nextUrl.searchParams.get('id')
  if (id) {
    const result = await findTrack(token, id)
    return json({ track: result.track, fallback: result.fallback })
  }
  const ownerId = request.nextUrl.searchParams.get('owner_id') ?? undefined
  const result = await listTracks(token, ownerId)
  return json({ tracks: result.tracks, fallback: result.fallback })
}

export async function POST(request: NextRequest) {
  const identity = await identityFromRequest(request)
  if (!identity) return unauthorized()

  const payload: unknown = await request.json().catch(() => null)
  if (!isRecord(payload)) return json({ error: 'Некорректные данные трека.' }, { status: 400 })
  const title = asText(payload.title)
  if (!title) return json({ error: 'Название обязательно.' }, { status: 422 })

  // Если трек с таким id уже существует, менять его вправе только владелец.
  const requestedId = asText(payload.id, 160)
  if (requestedId) {
    const existing = await findTrack(bearerFrom(request), requestedId)
    if (existing.track && existing.track.owner_id !== identity.id) {
      return json({ error: 'Недостаточно прав для изменения этого трека.' }, { status: 403 })
    }
  }

  const duration = typeof payload.durationSec === 'number' && Number.isFinite(payload.durationSec)
    ? Math.max(0, Math.round(payload.durationSec))
    : undefined
  const track: ApiTrack = {
    id: requestedId || createId('track'),
    title,
    // owner_id берётся только из проверенного токена — тело запроса на него не влияет.
    owner_id: identity.id,
    releaseId: asText(payload.releaseId, 120) || undefined,
    audioUrl: asText(payload.audioUrl, 2_000) || undefined,
    coverUrl: asText(payload.coverUrl, 2_000) || undefined,
    durationSec: duration,
    facts: isRecord(payload.facts) ? (payload.facts as TrackFacts) : undefined,
    featuring: Array.isArray(payload.featuring)
      ? Array.from(new Set(payload.featuring.map((value) => asText(value, 80)).filter(Boolean))).slice(0, 12)
      : undefined,
    isAiGenerated: payload.isAiGenerated === true,
    createdAt: new Date().toISOString(),
  }
  const result = await saveTrack(bearerFrom(request), track)
  return json({ track: result.track, fallback: result.fallback }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const identity = await identityFromRequest(request)
  if (!identity) return unauthorized()

  const payload: unknown = await request.json().catch(() => null)
  if (!isRecord(payload)) return json({ error: 'Некорректный запрос.' }, { status: 400 })
  const id = asText(payload.id, 160)
  if (!id) return json({ error: 'Не указан id трека.' }, { status: 422 })

  const result = await removeTrack(bearerFrom(request), id, identity.id)
  if (!result.deleted) return json({ error: 'Трек не найден или принадлежит другому пользователю.', fallback: result.fallback }, { status: 403 })
  return json({ deleted: true, fallback: result.fallback })
}
