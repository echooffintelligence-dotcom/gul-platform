import { NextRequest, NextResponse } from 'next/server'
import { asText, isRecord, releasesStore } from '@/lib/server-api-store'

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { 'Cache-Control': 'no-store', ...(init?.headers ?? {}) } })
}

export async function POST(request: NextRequest) {
  const payload: unknown = await request.json().catch(() => null)
  if (!isRecord(payload)) return json({ error: 'Некорректные данные РЗТ.' }, { status: 400 })
  const releaseId = asText(payload.releaseId, 120)
  const ownerId = asText(payload.owner_id, 120)
  const criteria = Array.isArray(payload.criteria) ? payload.criteria : []
  if (!releaseId || !ownerId || criteria.length !== 6 || !criteria.every((value) => typeof value === 'number' && Number.isFinite(value))) return json({ error: 'Нужны releaseId, owner_id и шесть числовых критериев.' }, { status: 422 })
  const limits = [10, 10, 10, 10, 5, 5]
  if (!criteria.every((value, index) => value >= 0 && value <= limits[index])) return json({ error: 'Оценки выходят за допустимый диапазон.' }, { status: 422 })
  const total = criteria.reduce((sum, value) => sum + value, 0)
  const score = Math.round((total / 5) * 100) / 100
  const release = releasesStore.get(releaseId)
  if (release) {
    const votes = (release.votes ?? 0) + 1
    release.score = Math.round((((release.score ?? 0) * (votes - 1) + score) / votes) * 100) / 100
    release.votes = votes
    releasesStore.set(release.id, release)
  }
  return json({ releaseId, owner_id: ownerId, total, score, fallback: true })
}
