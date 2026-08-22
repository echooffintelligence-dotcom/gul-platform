import type { Artist, Release, Track } from '@/lib/data'
import { artists, lyricsByTrack } from '@/lib/data'

/**
 * Поиск по каталогу.
 *
 * Плейсхолдер в шапке обещает «трек, артист, релиз, строчка из текста»,
 * поэтому ищем по всем четырём, а не только по названиям. Раньше поле поиска
 * вообще ни к чему не было подключено.
 */

export type SearchHit =
  | { kind: 'track'; track: Track; score: number; matchedLine?: string }
  | { kind: 'artist'; artist: Artist; score: number }
  | { kind: 'release'; release: Release; score: number }

export type SearchResults = {
  tracks: Extract<SearchHit, { kind: 'track' }>[]
  artists: Extract<SearchHit, { kind: 'artist' }>[]
  releases: Extract<SearchHit, { kind: 'release' }>[]
  total: number
}

const norm = (value: string) => value.trim().toLocaleLowerCase('ru-RU')

/** Ранг совпадения: точное > с начала строки > где-то внутри. */
function matchScore(haystack: string, needle: string): number {
  const text = norm(haystack)
  if (!text) return 0
  if (text === needle) return 100
  if (text.startsWith(needle)) return 60
  if (text.includes(needle)) return 30
  return 0
}

const lyricsKey = (trackId: string) => `gul.lyrics.${trackId}.v1`

/** Строки текста трека: сначала пользовательские из localStorage, иначе демо-данные. */
function linesFor(trackId: string): string[] {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(lyricsKey(trackId))
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          return parsed
            .map((line) => (line && typeof line === 'object' && typeof (line as { text?: unknown }).text === 'string' ? (line as { text: string }).text : ''))
            .filter(Boolean)
        }
      }
    } catch {
      // Битый локальный текст не должен ронять поиск — просто игнорируем его.
    }
  }
  return (lyricsByTrack[trackId] ?? []).map((line) => line.text)
}

export type SearchInput = {
  query: string
  tracks: Track[]
  releases: Release[]
  /** Искать ли по строкам текста — операция дороже остальных. */
  includeLyrics?: boolean
  limitPerGroup?: number
}

export function searchCatalog({ query, tracks, releases, includeLyrics = true, limitPerGroup = 12 }: SearchInput): SearchResults {
  const needle = norm(query)
  if (needle.length < 2) return { tracks: [], artists: [], releases: [], total: 0 }

  const trackHits: Extract<SearchHit, { kind: 'track' }>[] = []
  for (const track of tracks) {
    let score = matchScore(track.title, needle) * 2
    for (const credit of track.credits ?? []) score = Math.max(score, matchScore(credit.name, needle))
    for (const name of track.featuring ?? []) score = Math.max(score, matchScore(name, needle))
    for (const tag of track.facts?.tags ?? []) score = Math.max(score, matchScore(tag, needle) * 0.6)

    let matchedLine: string | undefined
    if (includeLyrics) {
      for (const line of linesFor(track.id)) {
        if (norm(line).includes(needle)) {
          matchedLine = line
          score = Math.max(score, 45)
          break
        }
      }
    }

    if (score > 0) trackHits.push({ kind: 'track', track, score, matchedLine })
  }

  const artistHits: Extract<SearchHit, { kind: 'artist' }>[] = []
  for (const artist of artists) {
    const score = Math.max(matchScore(artist.name, needle) * 2, matchScore(artist.id, needle), matchScore(artist.bio ?? '', needle) * 0.4)
    if (score > 0) artistHits.push({ kind: 'artist', artist, score })
  }

  const releaseHits: Extract<SearchHit, { kind: 'release' }>[] = []
  for (const release of releases) {
    const score = Math.max(matchScore(release.title, needle) * 2, matchScore(release.genre ?? '', needle) * 0.6, matchScore(release.kind, needle) * 0.4)
    if (score > 0) releaseHits.push({ kind: 'release', release, score })
  }

  const byScore = <T extends { score: number }>(list: T[]) => list.sort((left, right) => right.score - left.score).slice(0, limitPerGroup)

  const result = {
    tracks: byScore(trackHits),
    artists: byScore(artistHits),
    releases: byScore(releaseHits),
    total: 0,
  }
  result.total = result.tracks.length + result.artists.length + result.releases.length
  return result
}
