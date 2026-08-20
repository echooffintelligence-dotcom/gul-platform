import type { ArtistLink } from '@/lib/data'

/**
 * Разбор поля «Web or email address».
 *
 * Пользователь вводит как придётся: «vk.com/artist», «https://boosty.to/x»,
 * «me@example.com». Приводим к безопасному href и осмысленной подписи.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Схемы, которые нельзя пускать в href: javascript: и data: — это XSS. */
const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

export type ParsedLink = { href: string; label: string; kind: 'web' | 'email' } | null

export function parseLinkAddress(raw: string): ParsedLink {
  const value = raw.trim()
  if (!value) return null

  if (EMAIL_PATTERN.test(value)) {
    return { href: `mailto:${value}`, label: value, kind: 'email' }
  }
  if (value.toLowerCase().startsWith('mailto:')) {
    const address = value.slice(7).trim()
    return EMAIL_PATTERN.test(address) ? { href: `mailto:${address}`, label: address, kind: 'email' } : null
  }

  // Без схемы браузер трактует «vk.com/x» как относительный путь — добавляем https.
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(candidate)
    if (!SAFE_PROTOCOLS.has(url.protocol)) return null
    const label = `${url.hostname.replace(/^www\./, '')}${url.pathname === '/' ? '' : url.pathname}`
    return { href: url.toString(), label: label.replace(/\/$/, ''), kind: 'web' }
  } catch {
    return null
  }
}

/** Подпись бейджа: короткое название артиста, иначе — читаемый адрес. */
export function linkLabel(link: ArtistLink): string {
  const title = link.title.trim()
  if (title) return title
  return parseLinkAddress(link.url)?.label ?? link.url
}

export function linkHref(link: ArtistLink): string | null {
  return parseLinkAddress(link.url)?.href ?? null
}

export function isValidLinkAddress(raw: string): boolean {
  return parseLinkAddress(raw) !== null
}
