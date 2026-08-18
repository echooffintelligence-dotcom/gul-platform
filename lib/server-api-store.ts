import type { ApiRelease, ApiTrack, WorkspaceSnapshotPayload } from '@/lib/api-client'

export const tracksStore = new Map<string, ApiTrack>()
export const releasesStore = new Map<string, ApiRelease>()
export const workspaceStore = new Map<string, WorkspaceSnapshotPayload>()

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function asText(value: unknown, max = 160) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}
