import { NextRequest, NextResponse } from 'next/server'
import type { ApiTrack } from '@/lib/api-client'
import { asText, createId, isRecord, tracksStore } from '@/lib/server-api-store'

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { 'Cache-Control': 'no-store', ...(init?.headers ?? {}) } })
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  const ownerId = request.nextUrl.searchParams.get('owner_id')
  if (id) return json({ track: tracksStore.get(id) ?? null, fallback: true })
  const tracks = Array.from(tracksStore.values()).filter((track) => !ownerId || track.owner_id === ownerId)
  return json({ tracks, fallback: true })
}

export async function POST(request: NextRequest) {
  const payload: unknown = await request.json().catch(() => null)
  if (!isRecord(payload)) return json({ error: 'Некорректные данные трека.' }, { status: 400 })
  const title = asText(payload.title)
  const ownerId = asText(payload.owner_id, 120)
  if (!title || !ownerId) return json({ error: 'Название и owner_id обязательны.' }, { status: 422 })
  const duration = typeof payload.durationSec === 'number' && Number.isFinite(payload.durationSec) ? Math.max(0, Math.round(payload.durationSec)) : undefined
  const track: ApiTrack = {
    id: asText(payload.id, 160) || createId('track'), title, owner_id: ownerId, releaseId: asText(payload.releaseId, 120) || undefined,
    audioUrl: asText(payload.audioUrl, 2_000) || undefined, coverUrl: asText(payload.coverUrl, 2_000) || undefined,
    durationSec: duration, createdAt: new Date().toISOString(),
  }
  tracksStore.set(track.id, track)
  return json({ track, fallback: true }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const payload: unknown = await request.json().catch(() => null)
  if (!isRecord(payload)) return json({ error: 'Некорректный запрос.' }, { status: 400 })
  const id = asText(payload.id, 120)
  const ownerId = asText(payload.owner_id, 120)
  const track = tracksStore.get(id)
  if (!track) return json({ deleted: false, fallback: true })
  if (track.owner_id !== ownerId) return json({ error: 'Недостаточно прав для удаления.' }, { status: 403 })
  tracksStore.delete(id)
  return json({ deleted: true, fallback: true })
}
