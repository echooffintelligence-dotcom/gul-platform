'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Check, Clock, Plus, Users, X } from 'lucide-react'
import { Avatar } from '@/components/shared/art'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { useToast } from '@/components/providers/toast-provider'
import { ACCOUNT, getArtist, getRelease, type AvColor, type CardShare } from '@/lib/data'
import { cn } from '@/lib/utils'
import { UploadTrackModal } from './upload-track-modal'
import { SpotlightManager } from '@/components/creator/spotlight-manager'
import { ArtistLinksEditor } from '@/components/artist/artist-links-editor'
import { ActivityFeed } from '@/components/social/activity-feed'
import { SocialLibrary } from '@/components/social/social-library'
import { ListeningStats } from '@/components/social/listening-stats'
import { BlendCreator } from '@/components/social/blend-creator'

const ROLES = ['основная', 'сайд-проект', 'коллектив', 'псевдоним']
const COLORS: { value: AvColor; label: string }[] = [
  { value: 'r', label: 'красный' },
  { value: 'b', label: 'синий' },
  { value: 'o', label: 'охра' },
  { value: 'g', label: 'зелёный' },
  { value: 'v', label: 'фиолетовый' },
]
const SHARE_ROLES: CardShare['role'][] = ['owner', 'editor', 'viewer']

export function AccountView() {
  const { cards, activeId, canEditActive, setActive, addCard, shareCard, revokeShare } = useWorkspace()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [role, setRole] = useState(ROLES[0])
  const [color, setColor] = useState<AvColor>('b')
  const [bio, setBio] = useState('')
  const [error, setError] = useState('')
  const [sharingId, setSharingId] = useState<string | null>(null)
  const [shareEmail, setShareEmail] = useState('')
  const [shareRole, setShareRole] = useState<CardShare['role']>('editor')
  const [shareError, setShareError] = useState('')

  const sharingCard = cards.find((card) => card.id === sharingId)
  const activeArtist = getArtist(activeId)
  const activeReleases = activeArtist?.releaseIds.map((id) => getRelease(id)).filter((release): release is NonNullable<typeof release> => Boolean(release)) ?? []

  function resetForm() {
    setName('')
    setSlug('')
    setRole(ROLES[0])
    setColor('b')
    setBio('')
    setError('')
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canEditActive) {
      setError('Роль viewer не позволяет создавать или редактировать карточки.')
      return
    }
    const result = addCard({ name, slug, role, color, bio })
    if ('error' in result) {
      setError(result.error)
      return
    }
    toast(`Карточка «${result.value.name}» создана и выбрана активной`)
    resetForm()
    setOpen(false)
  }

  function submitShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!sharingCard) return
    const result = shareCard(sharingCard.id, shareEmail, shareRole)
    if ('error' in result) {
      setShareError(result.error)
      return
    }
    toast(`Доступ к «${sharingCard.name}» сохранён`)
    setShareEmail('')
    setShareRole('editor')
    setShareError('')
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-12 sm:pb-24">
      <header className="flex flex-col gap-4 border-b border-ink pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow">личный кабинет</div>
          <h1 className="font-mono text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">@{ACCOUNT.handle}</h1>
          <p className="mt-1 font-mono text-sm text-ink-3">{ACCOUNT.email}</p>
        </div>
        <div className="flex gap-6 font-mono text-sm">
          <div><div className="tabnum text-2xl font-semibold">{cards.length}</div><div className="text-ink-3">карточек</div></div>
          <div><div className="tabnum text-2xl font-semibold">{ACCOUNT.totalCards}</div><div className="text-ink-3">в системе</div></div>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="eyebrow mb-3">рабочее пространство</h2>
        <p className="mb-4 max-w-prose font-mono text-sm text-ink-3">Один аккаунт управляет несколькими карточками артистов. Активная карточка определяет, от чьего имени вы публикуете и оцениваете.</p>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cards.map((card) => {
            const isActive = card.id === activeId
            const hasPage = Boolean(getArtist(card.id))
            return (
              <li key={card.id} className={cn('flex items-center gap-4 rounded-xl border border-ink-1 p-4 transition-colors', isActive && 'is-selected bg-ink text-paper')}>
                <Avatar initials={card.initials} color={card.color} className="h-12 w-12 shrink-0 text-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-sm font-semibold">{card.name}</span>
                    {card.status === 'wait' ? <Clock className="h-3.5 w-3.5 shrink-0 text-accent-o" aria-label="на модерации" /> : <Check className="h-3.5 w-3.5 shrink-0 text-accent-b" aria-label="активна" />}
                  </div>
                  <div className="font-mono text-xs opacity-70">{card.role} · {card.tracks} треков · {card.listeners} слуш.</div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs">
                    {isActive ? <span className="tabnum opacity-70">активна · ГЗТ {card.score}</span> : <button type="button" onClick={() => { setActive(card.id); toast(`Переключено на «${card.name}»`) }} className="underline underline-offset-2 hover:text-accent-r">сделать активной</button>}
                    {hasPage && <Link href={`/artist/${card.id}`} className="underline underline-offset-2 hover:text-accent-r">открыть страницу</Link>}
                    {card.access === 'owner' && <button type="button" onClick={() => { setSharingId(card.id); setShareError('') }} className="underline underline-offset-2 hover:text-accent-r">доступ ({card.shares?.length ?? 0})</button>}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="mt-4">
          {open ? (
            <form onSubmit={submit} className="border border-ink p-4">
              <div className="eyebrow mb-3">новая карточка артиста</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Имя</span><input autoFocus required value={name} onChange={(event) => { setName(event.target.value); setError('') }} placeholder="имя / псевдоним" className="border border-ink-1 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-ink" /></label>
                <label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Slug</span><input required value={slug} onChange={(event) => { setSlug(event.target.value); setError('') }} placeholder="my-artist" className="border border-ink-1 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-ink" /></label>
                <label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Роль</span><select value={role} onChange={(event) => setRole(event.target.value)} className="border border-ink-1 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-ink">{ROLES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <label className="grid gap-1"><span className="font-mono text-xs text-ink-3">Цвет карточки</span><select value={color} onChange={(event) => setColor(event.target.value as AvColor)} className="border border-ink-1 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-ink">{COLORS.map((item) => <option key={item.value || 'default'} value={item.value}>{item.label}</option>)}</select></label>
              </div>
              <label className="mt-3 grid gap-1"><span className="font-mono text-xs text-ink-3">Биография (до 280 символов)</span><textarea value={bio} maxLength={280} rows={3} onChange={(event) => { setBio(event.target.value); setError('') }} className="resize-y border border-ink-1 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-ink" /></label>
              <div className="mt-3 flex gap-2"><button type="submit" className="bg-ink px-4 py-2 font-mono text-sm text-paper hover:opacity-80">создать</button><button type="button" onClick={() => { resetForm(); setOpen(false) }} className="border border-ink-1 px-4 py-2 font-mono text-sm hover:border-ink">отмена</button></div>
              {error && <p role="alert" className="mt-2 font-mono text-xs text-accent-r">{error}</p>}
            </form>
          ) : <button type="button" disabled={!canEditActive} onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-2 border border-dashed border-ink-2 py-4 font-mono text-sm text-ink-3 transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" /> {canEditActive ? 'добавить карточку' : 'viewer: создание недоступно'}</button>}
        </div>
      </section>

      {activeArtist && <SpotlightManager artistId={activeArtist.id} releases={activeReleases} />}
      <ArtistLinksEditor artistId={activeId} />
      <ListeningStats />
      <SocialLibrary />
      <BlendCreator />
      <ActivityFeed />

      {sharingCard && (
        <section className="mt-8 border border-ink p-4" aria-labelledby="sharing-title">
          <div className="flex items-start gap-3"><div><div className="eyebrow">совместное управление</div><h2 id="sharing-title" className="font-mono text-lg font-semibold">Доступ к «{sharingCard.name}»</h2></div><button type="button" aria-label="Закрыть" onClick={() => setSharingId(null)} className="ml-auto text-ink-3 hover:text-ink"><X className="h-4 w-4" /></button></div>
          <form onSubmit={submitShare} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto]">
            <input required type="email" value={shareEmail} onChange={(event) => { setShareEmail(event.target.value); setShareError('') }} placeholder="collaborator@example.com" className="border border-ink-1 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-ink" />
            <select value={shareRole} onChange={(event) => setShareRole(event.target.value as CardShare['role'])} className="border border-ink-1 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-ink">{SHARE_ROLES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <button type="submit" className="solid"><Users className="h-4 w-4" /> выдать доступ</button>
          </form>
          {shareError && <p role="alert" className="mt-2 font-mono text-xs text-accent-r">{shareError}</p>}
          <ul className="mt-4 divide-y divide-rule border-y border-rule font-mono text-sm">{(sharingCard.shares ?? []).length === 0 ? <li className="py-3 text-ink-3">Совладельцев пока нет.</li> : (sharingCard.shares ?? []).map((share) => <li key={share.email} className="flex items-center gap-3 py-3"><span className="min-w-0 flex-1 truncate">{share.email}</span><span className="text-ink-3">{share.role}</span><button type="button" onClick={() => { revokeShare(sharingCard.id, share.email); toast(`Доступ для ${share.email} отозван`) }} className="text-xs underline underline-offset-2 hover:text-accent-r">отозвать</button></li>)}</ul>
        </section>
      )}
      <UploadTrackModal />
    </div>
  )
}
