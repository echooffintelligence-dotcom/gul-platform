'use client'

import { HeartHandshake, Link2, Plus, Trash2, UserRound } from 'lucide-react'
import { useSocial } from '@/components/providers/social-provider'
import { isValidLinkAddress, parseLinkAddress } from '@/lib/links'
import type { ArtistLink } from '@/lib/data'
import { cn } from '@/lib/utils'

/**
 * Модульный блок ссылок в профиле артиста.
 *
 * Заменяет прежний фиксированный список площадок: строк может быть сколько
 * угодно, адрес — сайт или email, подпись задаёт сам артист.
 */
export function ArtistLinksEditor({ artistId }: { artistId: string }) {
  const { linksFor, addArtistLink, updateArtistLink, removeArtistLink, profileFor, setArtistProfile } = useSocial()
  const profile = profileFor(artistId)
  const links = linksFor(artistId)
  const regular = links.filter((link) => link.kind === 'link')
  const support = links.filter((link) => link.kind === 'support')

  const field = 'rounded-lg border border-rule bg-paper-2 px-3 py-2 text-sm outline-none focus:border-accent-1/45'

  return (
    <>
    {/* Профиль: описание, аватар и шапка. Пусто — берётся оформление по умолчанию. */}
    <section className="mt-8 rounded-2xl border border-rule bg-paper-2 p-4" aria-labelledby="artist-profile-title">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-paper-3 text-ink-2"><UserRound className="h-4 w-4" /></div>
        <div>
          <div className="eyebrow">профиль артиста</div>
          <h3 id="artist-profile-title" className="mt-1 font-semibold">Описание и оформление</h3>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1">
          <span className="font-mono text-xs text-ink-3">Описание (до 400 символов)</span>
          <textarea
            value={profile.bio ?? ''}
            maxLength={400}
            rows={3}
            onChange={(event) => setArtistProfile(artistId, { bio: event.target.value })}
            placeholder="Пара строк о себе — покажется в шапке профиля"
            className={field + ' resize-y'}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="font-mono text-xs text-ink-3">Ссылка на аватар</span>
            <input value={profile.avatarUrl ?? ''} onChange={(event) => setArtistProfile(artistId, { avatarUrl: event.target.value })} placeholder="https://.../avatar.jpg" className={field} />
          </label>
          <label className="grid gap-1">
            <span className="font-mono text-xs text-ink-3">Ссылка на шапку</span>
            <input value={profile.bannerUrl ?? ''} onChange={(event) => setArtistProfile(artistId, { bannerUrl: event.target.value })} placeholder="https://.../banner.jpg" className={field} />
          </label>
        </div>
      </div>
    </section>

    <section className="mt-5 rounded-2xl border border-accent-1/15 bg-accent-1/[.025] p-4" aria-labelledby="artist-links-title">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent-1/15 text-accent-1"><Link2 className="h-4 w-4" /></div>
        <div>
          <div className="eyebrow">профиль артиста</div>
          <h3 id="artist-links-title" className="mt-1 font-semibold">Ссылки</h3>
        </div>
      </div>

      <p className="mt-3 max-w-prose font-mono text-xs text-ink-3">
        Добавьте столько ссылок, сколько нужно: сайт, соцсеть, почта. Ссылки поддержки показываются отдельной группой.
      </p>

      <LinkGroup
        title="Ссылки"
        emptyHint="Пока ни одной ссылки."
        links={regular}
        artistId={artistId}
        onUpdate={updateArtistLink}
        onRemove={removeArtistLink}
      />

      <LinkGroup
        title="Поддержка"
        emptyHint="Ссылки на донаты и поддержку пока не добавлены."
        links={support}
        artistId={artistId}
        onUpdate={updateArtistLink}
        onRemove={removeArtistLink}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => addArtistLink(artistId, 'link')} className="ghost !text-xs">
          <Plus className="h-3.5 w-3.5" /> Add link
        </button>
        <button type="button" onClick={() => addArtistLink(artistId, 'support')} className="ghost !text-xs">
          <HeartHandshake className="h-3.5 w-3.5" /> Add support link
        </button>
      </div>
    </section>
    </>
  )
}

function LinkGroup({
  title,
  emptyHint,
  links,
  artistId,
  onUpdate,
  onRemove,
}: {
  title: string
  emptyHint: string
  links: ArtistLink[]
  artistId: string
  onUpdate: (artistId: string, linkId: string, patch: Partial<Pick<ArtistLink, 'url' | 'title'>>) => void
  onRemove: (artistId: string, linkId: string) => void
}) {
  return (
    <div className="mt-4">
      <div className="eyebrow mb-2">{title.toLowerCase()}</div>
      {links.length === 0 ? (
        <p className="font-mono text-xs text-ink-3">{emptyHint}</p>
      ) : (
        <ul className="grid gap-2">
          {links.map((link) => {
            // Пустая строка — это ещё не ошибка: её только что добавили кнопкой.
            const touched = link.url.trim().length > 0
            const invalid = touched && !isValidLinkAddress(link.url)
            const parsed = touched ? parseLinkAddress(link.url) : null
            return (
              <li key={link.id} className="grid gap-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto]">
                <label className="grid gap-1">
                  <span className="sr-only">Web or email address</span>
                  <input
                    value={link.url}
                    onChange={(event) => onUpdate(artistId, link.id, { url: event.target.value })}
                    placeholder="Web or email address"
                    aria-invalid={invalid}
                    className={cn(
                      'rounded-lg border bg-paper-2 px-3 py-2 text-sm outline-none transition-colors',
                      invalid ? 'border-accent-hot/60 focus:border-accent-hot' : 'border-rule focus:border-accent-1/45',
                    )}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="sr-only">Short title</span>
                  <input
                    value={link.title}
                    onChange={(event) => onUpdate(artistId, link.id, { title: event.target.value })}
                    placeholder="Short title"
                    className="rounded-lg border border-rule bg-paper-2 px-3 py-2 text-sm outline-none focus:border-accent-1/45"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onRemove(artistId, link.id)}
                  aria-label={`Удалить ссылку ${link.title || link.url || 'без названия'}`}
                  className="grid h-[38px] w-[38px] shrink-0 place-items-center self-start rounded-lg border border-rule text-ink-3 transition-colors hover:border-accent-hot/45 hover:bg-accent-hot/10 hover:text-accent-hot"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {invalid && <p role="alert" className="font-mono text-[.62rem] text-accent-hot sm:col-span-3">Не похоже на адрес сайта или email. Пример: example.com или me@example.com</p>}
                {!invalid && parsed && <p className="font-mono text-[.62rem] text-ink-3 sm:col-span-3">Ведёт на {parsed.label}</p>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
