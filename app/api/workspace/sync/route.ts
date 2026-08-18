import { NextRequest, NextResponse } from 'next/server'
import type { WorkspaceSnapshotPayload } from '@/lib/api-client'
import { asText, isRecord, workspaceStore } from '@/lib/server-api-store'

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { 'Cache-Control': 'no-store', ...(init?.headers ?? {}) } })
}

function isSnapshot(value: unknown): value is WorkspaceSnapshotPayload {
  if (!isRecord(value) || !Array.isArray(value.cards)) return false
  return typeof value.activeId === 'string' && typeof value.updatedAt === 'string' && typeof value.owner_id === 'string' && value.cards.every((card) => isRecord(card) && typeof card.id === 'string' && typeof card.name === 'string' && ['owner', 'editor', 'viewer'].includes(String(card.access)))
}

export async function POST(request: NextRequest) {
  const payload: unknown = await request.json().catch(() => null)
  if (!isSnapshot(payload)) return json({ error: 'Некорректный workspace snapshot.' }, { status: 422 })
  const normalized: WorkspaceSnapshotPayload = { ...payload, cards: payload.cards.map((card) => ({ ...card, owner_id: card.owner_id || payload.owner_id })) }
  workspaceStore.set(normalized.owner_id, normalized)
  return json({ snapshot: normalized, fallback: true })
}

export async function PATCH(request: NextRequest) {
  const payload: unknown = await request.json().catch(() => null)
  if (!isRecord(payload)) return json({ error: 'Некорректные данные прав.' }, { status: 400 })
  const cardId = asText(payload.cardId, 120)
  const ownerId = asText(payload.owner_id, 120)
  const email = asText(payload.email, 254)
  const role = asText(payload.role, 16)
  if (!cardId || !ownerId || !email || !['owner', 'editor', 'viewer'].includes(role)) return json({ error: 'Нужны cardId, owner_id, email и допустимая роль.' }, { status: 422 })
  return json({ cardId, owner_id: ownerId, email, role, fallback: true })
}

export async function GET(request: NextRequest) {
  const ownerId = request.nextUrl.searchParams.get('owner_id') ?? ''
  return json({ snapshot: workspaceStore.get(ownerId) ?? null, fallback: true })
}
