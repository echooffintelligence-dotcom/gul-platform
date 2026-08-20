import { NextRequest, NextResponse } from 'next/server'
import type { WorkspaceSnapshotPayload } from '@/lib/api-client'
import { identityFromRequest } from '@/lib/server-auth'
import { asText, bearerFrom, isRecord, loadSnapshot, storeSnapshot } from '@/lib/server-store'

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { 'Cache-Control': 'no-store', ...(init?.headers ?? {}) } })
}

const unauthorized = () => json({ error: 'Требуется авторизация. Передайте заголовок Authorization: Bearer <token>.' }, { status: 401 })

function isSnapshotShape(value: unknown): value is Omit<WorkspaceSnapshotPayload, 'owner_id'> {
  if (!isRecord(value) || !Array.isArray(value.cards)) return false
  return typeof value.activeId === 'string'
    && typeof value.updatedAt === 'string'
    && value.cards.every((card) => isRecord(card) && typeof card.id === 'string' && typeof card.name === 'string' && ['owner', 'editor', 'viewer'].includes(String(card.access)))
}

export async function POST(request: NextRequest) {
  const identity = await identityFromRequest(request)
  if (!identity) return unauthorized()

  const payload: unknown = await request.json().catch(() => null)
  if (!isSnapshotShape(payload)) return json({ error: 'Некорректный workspace snapshot.' }, { status: 422 })

  // Snapshot всегда сохраняется под идентификатором из токена. Прежде owner_id
  // приходил из тела, и любой клиент мог перезаписать чужое рабочее пространство.
  const normalized: WorkspaceSnapshotPayload = {
    ...payload,
    owner_id: identity.id,
    cards: payload.cards.map((card) => ({ ...card, owner_id: identity.id })),
  }
  const result = await storeSnapshot(bearerFrom(request), normalized)
  return json({ snapshot: normalized, fallback: result.fallback })
}

export async function PATCH(request: NextRequest) {
  const identity = await identityFromRequest(request)
  if (!identity) return unauthorized()

  const payload: unknown = await request.json().catch(() => null)
  if (!isRecord(payload)) return json({ error: 'Некорректные данные прав.' }, { status: 400 })
  const cardId = asText(payload.cardId, 120)
  const email = asText(payload.email, 254)
  const role = asText(payload.role, 16)
  if (!cardId || !email || !['owner', 'editor', 'viewer'].includes(role)) {
    return json({ error: 'Нужны cardId, email и допустимая роль.' }, { status: 422 })
  }

  // Права можно раздавать только в собственном снапшоте.
  const token = bearerFrom(request)
  const current = await loadSnapshot(token, identity.id)
  const owns = current.snapshot?.cards.some((card) => card.id === cardId)
  if (!owns) return json({ error: 'Карточка не найдена в вашем рабочем пространстве.' }, { status: 403 })

  return json({ cardId, owner_id: identity.id, email, role, fallback: current.fallback })
}

export async function GET(request: NextRequest) {
  const identity = await identityFromRequest(request)
  if (!identity) return unauthorized()

  // Чужой snapshot запросить нельзя: owner_id больше не берётся из query-строки.
  const result = await loadSnapshot(bearerFrom(request), identity.id)
  return json({ snapshot: result.snapshot, fallback: result.fallback })
}
