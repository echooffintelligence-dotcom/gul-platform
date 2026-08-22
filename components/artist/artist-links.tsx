'use client'

import { ExternalLink, HeartHandshake, Mail } from 'lucide-react'
import { useSocial } from '@/components/providers/social-provider'
import { linkHref, linkLabel, parseLinkAddress } from '@/lib/links'
import type { ArtistLink } from '@/lib/data'

/** Кликабельные бейджи ссылок артиста. Пустые и небезопасные адреса не показываем. */
export function ArtistLinks({ artistId, className }: { artistId: string; className?: string }) {
  const { linksFor } = useSocial()
  const links = linksFor(artistId).filter((link) => linkHref(link) !== null)
  if (links.length === 0) return null

  const regular = links.filter((link) => link.kind === 'link')
  const support = links.filter((link) => link.kind === 'support')

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {regular.map((link) => <Badge key={link.id} link={link} />)}
        {support.map((link) => <Badge key={link.id} link={link} support />)}
      </div>
    </div>
  )
}

function Badge({ link, support = false }: { link: ArtistLink; support?: boolean }) {
  const href = linkHref(link)
  if (!href) return null
  const isEmail = parseLinkAddress(link.url)?.kind === 'email'
  const Icon = support ? HeartHandshake : isEmail ? Mail : ExternalLink

  return (
    <a
      href={href}
      target={isEmail ? undefined : '_blank'}
      // noreferrer вместе с noopener: внешняя вкладка не получает доступ к window.opener.
      rel={isEmail ? undefined : 'noopener noreferrer'}
      className={
        support
          ? 'inline-flex max-w-full items-center gap-1.5 rounded-full border border-accent-hot/35 bg-accent-hot/10 px-3 py-1.5 font-mono text-xs text-accent-hot transition-colors hover:border-accent-hot/60 hover:bg-accent-hot/20'
          : 'inline-flex max-w-full items-center gap-1.5 rounded-full border border-accent-1/30 bg-accent-1/10 px-3 py-1.5 font-mono text-xs text-accent-1 transition-colors hover:border-accent-1/60 hover:bg-accent-1/20'
      }
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{linkLabel(link)}</span>
    </a>
  )
}
