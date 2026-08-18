import type { LyricLine } from '@/lib/data'

const timestampPattern = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g

export function lrcTimestampToSeconds(minutes: string, seconds: string, fraction?: string): number {
  const base = Number(minutes) * 60 + Number(seconds)
  const decimal = fraction ? Number(fraction) / 10 ** fraction.length : 0
  return Math.round((base + decimal) * 100) / 100
}

export function secondsToLrcTimestamp(value: number): string {
  const safe = Math.max(0, Number.isFinite(value) ? value : 0)
  const minutes = Math.floor(safe / 60)
  const seconds = Math.floor(safe % 60)
  const hundredths = Math.round((safe - Math.floor(safe)) * 100)
  return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}]`
}

export function parseLrc(raw: string): LyricLine[] {
  const result: LyricLine[] = []
  for (const sourceLine of raw.replace(/\r/g, '').split('\n')) {
    const text = sourceLine.replace(timestampPattern, '').trim()
    const matches = [...sourceLine.matchAll(timestampPattern)]
    if (!text || !matches.length) continue
    for (const match of matches) {
      result.push({ t: lrcTimestampToSeconds(match[1], match[2], match[3]), text, section: /^\[.+\]$/.test(text) })
    }
  }
  return result.sort((left, right) => left.t - right.t)
}

export function lyricsToPlainText(lines: LyricLine[]): string {
  return lines.map((line) => line.text).join('\n')
}

export function lyricsToLrc(lines: LyricLine[]): string {
  return lines.map((line) => `${secondsToLrcTimestamp(line.t)}${line.text}`).join('\n')
}
