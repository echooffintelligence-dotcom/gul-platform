import { NextRequest, NextResponse } from 'next/server'
import { identityFromRequest } from '@/lib/server-auth'
import { asText, bearerFrom, castVote, findRelease, isRecord } from '@/lib/server-store'

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { 'Cache-Control': 'no-store', ...(init?.headers ?? {}) } })
}

/** Пределы по осям ГЗТ: четыре базовых критерия до 10 и вайб до 5. */
const LIMITS = [10, 10, 10, 10, 5]

export async function POST(request: NextRequest) {
  const identity = await identityFromRequest(request)
  if (!identity) return json({ error: 'Оценивать релизы могут только авторизованные пользователи.' }, { status: 401 })

  const payload: unknown = await request.json().catch(() => null)
  if (!isRecord(payload)) return json({ error: 'Некорректные данные ГЗТ.' }, { status: 400 })

  const releaseId = asText(payload.releaseId, 120)
  const criteria = Array.isArray(payload.criteria) ? payload.criteria : []
  if (!releaseId || criteria.length !== 5 || !criteria.every((value) => typeof value === 'number' && Number.isFinite(value))) {
    return json({ error: 'Нужны releaseId и пять числовых критериев.' }, { status: 422 })
  }
  if (!criteria.every((value, index) => value >= 0 && value <= LIMITS[index])) {
    return json({ error: 'Оценки выходят за допустимый диапазон.' }, { status: 422 })
  }

  // Голос за несуществующий релиз больше не принимается: раньше сервер считал
  // балл и возвращал 200 даже для выдуманного releaseId.
  const token = bearerFrom(request)
  const found = await findRelease(token, releaseId)
  if (!found.release) return json({ error: 'Релиз не найден.' }, { status: 404 })

  const [text, structure, style, individuality, atmosphere] = criteria as number[]
  const total = text + structure + style + individuality
  const score = Math.round(total * (atmosphere / 5) * 2.25 * 10) / 10

  // Один пользователь — один голос: повторная отправка заменяет прежнюю оценку.
  const result = await castVote(token, releaseId, identity.id, score)
  return json({
    releaseId,
    voter_id: identity.id,
    total,
    score,
    releaseScore: result.average,
    votes: result.votes,
    fallback: result.fallback,
  })
}
