'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Globe2, Heart, Link2, Lock, Music2, Play, Plus, Trash2, Users } from 'lucide-react'
import { useSocial, type PlaylistPrivacy, type SocialPlaylist } from '@/components/providers/social-provider'
import { usePlayer, toNowPlaying } from '@/components/providers/player-provider'
import { useReleases } from '@/components/providers/release-provider'
import { useToast } from '@/components/providers/toast-provider'
import { AiBadge } from '@/components/shared/ai-badge'
import { Cover } from '@/components/shared/art'
import { artists } from '@/lib/data'
import type { Track } from '@/lib/data'
import { cn } from '@/lib/utils'

const privacyMeta: Record<PlaylistPrivacy, { label: string; hint: string; Icon: typeof Globe2 }> = {
  public: { label: 'Публичный', hint: 'Виден всем слушателям', Icon: Globe2 },
  private: { label: 'Только я', hint: 'Виден только вам', Icon: Lock },
  link: { label: 'По ссылке', hint: 'Откроется у того, кому дали ссылку', Icon: Link2 },
}

const PRIVACY_ORDER: PlaylistPrivacy[] = ['public', 'link', 'private']

export function SocialLibrary() {
  const { followingArtistIds, likedPlaylist, playlists, createPlaylist, deletePlaylist, updatePlaylist } = useSocial()
  const { playCollection, currentTrack } = usePlayer()
  const { getRelease, getTrack } = useReleases()
  const { toast } = useToast()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [privacy, setPrivacy] = useState<PlaylistPrivacy>('private')
  const [openId, setOpenId] = useState<string | null>(null)

  const resolve = (ids: string[]) => ids.map((id) => getTrack(id)).filter((track): track is Track => Boolean(track))
  const likedTracks = resolve(likedPlaylist.trackIds)
  const follows = followingArtistIds.map((id) => artists.find((artist) => artist.id === id)).filter((artist): artist is NonNullable<typeof artist> => Boolean(artist))

  function playPlaylist(playlist: SocialPlaylist) {
    const items = resolve(playlist.trackIds)
    if (items.length === 0) {
      toast('В плейлисте пока нет треков')
      return
    }
    playCollection(items.map(toNowPlaying))
    toast(`Играет «${playlist.title}»`)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) return
    const created = createPlaylist({ title, description, coverUrl, privacy })
    toast(`Плейлист «${created.title}» создан · ${privacyMeta[privacy].label.toLowerCase()}`)
    setTitle('')
    setDescription('')
    setCoverUrl('')
    setPrivacy('private')
  }

  return (
    <section className="mt-8 grid gap-5" aria-label="Музыкальная библиотека">
      <div className="section-h"><h3>Моя музыка</h3><span className="line" /></div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Системный автоплейлист «Понравившиеся треки» */}
        <div className="rounded-2xl border border-accent-hot/15 bg-accent-hot/[.025] p-4">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-accent-hot" fill="currentColor" />
            <div>
              <div className="eyebrow">системный плейлист</div>
              <h3 className="font-semibold">{likedPlaylist.title}</h3>
            </div>
            <span className="ml-auto font-mono text-xs text-ink-3">{likedTracks.length}</span>
            {likedTracks.length > 0 && (
              <button type="button" onClick={() => playPlaylist(likedPlaylist)} aria-label="Слушать понравившиеся треки" className="solid !px-2.5 !py-1.5 !text-xs">
                <Play className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {likedTracks.length === 0 ? (
            <p className="mt-4 text-sm text-ink-3">Нажмите сердце у трека в чарте, релизе или плеере — он появится здесь автоматически.</p>
          ) : (
            <ul className="mt-4 grid divide-y divide-rule">
              {likedTracks.slice(0, 5).map((track) => (
                <li key={track.id} className="flex items-center gap-3 py-2">
                  <Cover cover={track.cover} coverUrl={track.coverUrl} className={cn('h-9 w-9', currentTrack.id === track.id && 'is-selected-cover')} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm">{track.title}</span>
                      {track.isAiGenerated && <AiBadge compact />}
                    </div>
                    <div className="font-mono text-[.65rem] text-ink-3">{track.duration}</div>
                  </div>
                  {track.releaseId && <Link href={`/release/${track.releaseId}`} className="font-mono text-[.65rem] text-accent-1 hover:underline">релиз</Link>}
                </li>
              ))}
              {likedTracks.length > 5 && <li className="py-2 font-mono text-[.65rem] text-ink-3">и ещё {likedTracks.length - 5}</li>}
            </ul>
          )}
        </div>

        {/* Подписки */}
        <div className="rounded-2xl border border-accent-1/15 bg-accent-1/[.025] p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-accent-1" />
            <div>
              <div className="eyebrow">мои подписки</div>
              <h3 className="font-semibold">Артисты и новинки</h3>
            </div>
            <span className="ml-auto font-mono text-xs text-ink-3">{follows.length}</span>
          </div>
          {follows.length === 0 ? (
            <p className="mt-4 text-sm text-ink-3">Подпишитесь на артиста — его карточка и свежие релизы появятся здесь.</p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {follows.map((artist) => {
                const newest = artist.releaseIds
                  .map((id) => getRelease(id))
                  .filter((release): release is NonNullable<typeof release> => Boolean(release))
                  .sort((left, right) => right.year - left.year)[0]
                return (
                  <li key={artist.id} className="flex items-center gap-3 rounded-xl bg-paper-2 p-2">
                    <Cover cover={newest?.cover ?? 'c1'} coverUrl={newest?.coverUrl} className="h-9 w-9" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/artist/${artist.id}`} className="block truncate text-sm hover:text-accent-1">{artist.name}</Link>
                      <span className="font-mono text-[.62rem] text-ink-3">{newest ? `новинка: ${newest.title}` : 'новинки появятся здесь'}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Создание плейлиста */}
        <form onSubmit={submit} className="rounded-2xl border border-rule bg-paper-2 p-4">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-accent-1" />
            <div>
              <div className="eyebrow">новый плейлист</div>
              <h3 className="font-semibold">Собрать свою подборку</h3>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            <input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Название плейлиста" className="rounded-lg border border-rule bg-paper-2 px-3 py-2 text-sm outline-none focus:border-accent-1/45" />
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="Описание" className="resize-none rounded-lg border border-rule bg-paper-2 px-3 py-2 text-sm outline-none focus:border-accent-1/45" />
            <input value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="URL обложки — необязательно" className="rounded-lg border border-rule bg-paper-2 px-3 py-2 text-sm outline-none focus:border-accent-1/45" />

            {/* Приватность выбирается кнопками: так видно все варианты сразу и текущий выделен. */}
            <div className="grid gap-1">
              <span className="font-mono text-[.6rem] uppercase tracking-[.1em] text-ink-3">доступ</span>
              <div className="flex flex-wrap gap-2">
                {PRIVACY_ORDER.map((value) => {
                  const { label, Icon } = privacyMeta[value]
                  const selected = privacy === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPrivacy(value)}
                      aria-pressed={selected}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs transition-colors',
                        selected ? 'is-selected border-accent-2/60 bg-accent-2/10 text-accent-2' : 'border-rule text-ink-2 hover:border-rule hover:text-ink',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />{label}
                    </button>
                  )
                })}
              </div>
              <span className="font-mono text-[.6rem] text-ink-3">{privacyMeta[privacy].hint}</span>
            </div>

            <button type="submit" className="solid justify-center">Создать плейлист</button>
          </div>
        </form>

        {/* Список плейлистов */}
        <div className="rounded-2xl border border-rule p-4">
          <div className="flex items-center gap-2">
            <Music2 className="h-4 w-4 text-accent-1" />
            <div>
              <div className="eyebrow">мои плейлисты</div>
              <h3 className="font-semibold">{playlists.length || 'Нет пользовательских плейлистов'}</h3>
            </div>
          </div>

          {playlists.length === 0 ? (
            <p className="mt-4 text-sm text-ink-3">Создайте плейлист и добавляйте в него треки из чарта, релиза или плеера.</p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {playlists.map((playlist) => {
                const { Icon, label, hint } = privacyMeta[playlist.privacy]
                const expanded = openId === playlist.id
                const items = resolve(playlist.trackIds)
                return (
                  <li key={playlist.id} className={cn('rounded-xl bg-paper-2 p-2.5', expanded && 'is-selected')}>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => playPlaylist(playlist)} aria-label={`Слушать ${playlist.title}`} className="shrink-0">
                        <Cover cover="c1" coverUrl={playlist.coverUrl} className="h-10 w-10" />
                      </button>
                      <button type="button" onClick={() => setOpenId(expanded ? null : playlist.id)} className="min-w-0 flex-1 text-left">
                        <div className="truncate text-sm">{playlist.title}</div>
                        <div className="flex gap-2 font-mono text-[.62rem] text-ink-3">
                          <span>{playlist.trackIds.length} треков</span>
                          <span className="inline-flex items-center gap-1" title={hint}><Icon className="h-3 w-3" />{label}</span>
                        </div>
                      </button>
                      <button type="button" onClick={() => playPlaylist(playlist)} aria-label={`Воспроизвести ${playlist.title}`} className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-accent-1/10 hover:text-accent-1">
                        <Play className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { deletePlaylist(playlist.id); toast(`Плейлист «${playlist.title}» удалён`) }}
                        aria-label={`Удалить плейлист ${playlist.title}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-accent-hot/10 hover:text-accent-hot"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {expanded && (
                      <div className="mt-3 border-t border-rule pt-3">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[.6rem] uppercase tracking-[.1em] text-ink-3">доступ</span>
                          {PRIVACY_ORDER.map((value) => {
                            const meta = privacyMeta[value]
                            const selected = playlist.privacy === value
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => { updatePlaylist(playlist.id, { privacy: value }); toast(`«${playlist.title}» — ${meta.label.toLowerCase()}`) }}
                                aria-pressed={selected}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-[.65rem] transition-colors',
                                  selected ? 'is-selected border-accent-2/60 bg-accent-2/10 text-accent-2' : 'border-rule text-ink-3 hover:text-ink',
                                )}
                              >
                                <meta.Icon className="h-3 w-3" />{meta.label}
                              </button>
                            )
                          })}
                        </div>
                        {playlist.description && <p className="mb-2 text-xs text-ink-3">{playlist.description}</p>}
                        {items.length === 0 ? (
                          <p className="text-xs text-ink-3">Пусто. Добавьте треки кнопкой ⊕ в чарте или на странице релиза.</p>
                        ) : (
                          <ul className="grid divide-y divide-rule">
                            {items.map((track) => (
                              <li key={track.id} className="flex items-center gap-2 py-1.5">
                                <Cover cover={track.cover} coverUrl={track.coverUrl} className={cn('h-7 w-7', currentTrack.id === track.id && 'is-selected-cover')} />
                                <span className="min-w-0 flex-1 truncate text-xs">{track.title}</span>
                                {track.isAiGenerated && <AiBadge compact />}
                                <span className="font-mono text-[.6rem] text-ink-3">{track.duration}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
