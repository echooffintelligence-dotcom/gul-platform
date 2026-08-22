'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { BarChart3, Heart, Layers, Library, ListMusic, Mic2, Plus, Podcast, Search, Users } from 'lucide-react'
import { usePlayer, toNowPlaying } from '@/components/providers/player-provider'
import { useReleases } from '@/components/providers/release-provider'
import { useSocial } from '@/components/providers/social-provider'
import { useToast } from '@/components/providers/toast-provider'
import { Avatar, Cover } from '@/components/shared/art'
import { artists, type Track } from '@/lib/data'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/', label: 'Чарт', icon: BarChart3, match: (path: string) => path === '/' },
  { href: '/search', label: 'Поиск', icon: Search, match: (path: string) => path.startsWith('/search') },
  { href: '/podcasts', label: 'Подкасты', icon: Podcast, match: (path: string) => path.startsWith('/podcast') },
  { href: '/account', label: 'Кабинет', icon: Layers, match: (path: string) => path.startsWith('/account') },
]

type LibraryTab = 'playlists' | 'artists'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const { playCollection } = usePlayer()
  const { getTrack, getRelease } = useReleases()
  const { playlists, likedPlaylist, followingArtistIds } = useSocial()
  const [tab, setTab] = useState<LibraryTab>('playlists')
  const [filter, setFilter] = useState('')

  const followed = useMemo(
    () => followingArtistIds.map((id) => artists.find((artist) => artist.id === id)).filter((artist): artist is NonNullable<typeof artist> => Boolean(artist)),
    [followingArtistIds],
  )

  const allPlaylists = useMemo(() => [likedPlaylist, ...playlists], [likedPlaylist, playlists])
  const needle = filter.trim().toLocaleLowerCase('ru-RU')
  const visiblePlaylists = needle ? allPlaylists.filter((item) => item.title.toLocaleLowerCase('ru-RU').includes(needle)) : allPlaylists
  const visibleArtists = needle ? followed.filter((item) => item.name.toLocaleLowerCase('ru-RU').includes(needle)) : followed

  const resolve = (ids: string[]) => ids.map((id) => getTrack(id)).filter((track): track is Track => Boolean(track))

  /** Двойной клик запускает подборку целиком — как в Spotify. */
  function playPlaylist(trackIds: string[], title: string) {
    const items = resolve(trackIds)
    if (items.length === 0) { toast('В подборке пока нет треков'); return }
    playCollection(items.map(toNowPlaying))
    toast(`Играет «${title}»`)
  }

  function playArtist(artistId: string, name: string) {
    const artist = artists.find((item) => item.id === artistId)
    if (!artist) return
    const items = artist.releaseIds
      .map((id) => getRelease(id))
      .filter((release): release is NonNullable<typeof release> => Boolean(release))
      .flatMap((release) => release.trackIds)
      .map((id) => getTrack(id))
      .filter((track): track is Track => Boolean(track))
    if (items.length === 0) { toast('У артиста пока нет треков'); return }
    playCollection(items.map(toNowPlaying))
    toast(`Играет ${name}`)
  }

  return (
    <aside className="glass-panel hidden min-h-0 flex-col gap-5 overflow-hidden rounded-none border-y-0 border-l-0 px-3 py-4 md:flex">
      <nav className="flex flex-col gap-0.5">
        {nav.map(({ href, label, icon: Icon, match }) => {
          const on = match(pathname)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-[0.875rem] text-ink-2 transition-all duration-300 hover:translate-x-[3px] hover:bg-paper-2 hover:text-ink',
                on && 'bg-accent-1/12 font-bold text-ink shadow-[inset_0_0_0_1px_var(--accent-1-edge)]',
              )}
            >
              <Icon width={16} height={16} className={cn(on && 'text-accent-1')} />
              {label}
              {on && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-1" />}
            </Link>
          )
        })}
      </nav>

      {/* Медиатека: плейлисты и подписки. Двойной клик по строке включает её. */}
      <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-rule bg-paper-2 p-2.5" aria-label="Моя медиатека">
        <div className="flex items-center gap-2 px-1">
          <Library className="h-4 w-4 text-ink-2" />
          <h2 className="text-[0.8125rem] font-semibold">Моя медиатека</h2>
          <button
            type="button"
            onClick={() => router.push('/account')}
            aria-label="Создать плейлист"
            className="ml-auto grid h-6 w-6 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-paper-3 hover:text-ink"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-2.5 flex gap-1.5 px-0.5">
          {([['playlists', 'Плейлисты'], ['artists', 'Исполнители']] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={cn(
                'rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold transition-colors',
                tab === id ? 'bg-accent-1 text-on-accent' : 'bg-paper-3 text-ink-2 hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="mt-2.5 flex items-center gap-2 rounded-lg border border-rule bg-paper-2 px-2 py-1.5">
          <Search className="h-3 w-3 shrink-0 text-ink-3" />
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Найти в медиатеке"
            aria-label="Найти в медиатеке"
            className="w-full border-none bg-transparent text-[0.75rem] outline-none placeholder:text-ink-3"
          />
        </label>

        <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-0.5">
          {tab === 'playlists' ? (
            visiblePlaylists.length === 0 ? (
              <p className="px-1 py-3 text-[0.72rem] text-ink-3">Плейлистов пока нет. Создайте в кабинете.</p>
            ) : (
              <ul className="grid gap-0.5">
                {visiblePlaylists.map((playlist) => (
                  <li key={playlist.id}>
                    <button
                      type="button"
                      onDoubleClick={() => playPlaylist(playlist.trackIds, playlist.title)}
                      onClick={() => router.push('/account')}
                      title="Двойной клик — включить"
                      className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-paper-3"
                    >
                      {playlist.system ? (
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-hot/20 text-accent-hot"><Heart className="h-4 w-4" fill="currentColor" /></span>
                      ) : (
                        <Cover cover="c1" coverUrl={playlist.coverUrl} className="h-9 w-9" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.8125rem]">{playlist.title}</span>
                        <span className="block truncate font-mono text-[0.6rem] text-ink-3">
                          {playlist.system ? 'Плейлист' : `Плейлист · ${playlist.trackIds.length}`}
                        </span>
                      </span>
                      <ListMusic className="h-3 w-3 shrink-0 text-ink-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : visibleArtists.length === 0 ? (
            <p className="px-1 py-3 text-[0.72rem] text-ink-3">Подписок пока нет. Подпишитесь на странице артиста.</p>
          ) : (
            <ul className="grid gap-0.5">
              {visibleArtists.map((artist) => (
                <li key={artist.id}>
                  <button
                    type="button"
                    onDoubleClick={() => playArtist(artist.id, artist.name)}
                    onClick={() => router.push(`/artist/${artist.id}`)}
                    title="Двойной клик — включить"
                    className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-paper-3"
                  >
                    <Avatar initials={artist.initials} color={artist.color} className="h-9 w-9 shrink-0 rounded-full text-[0.7rem]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.8125rem]">{artist.name}</span>
                      <span className="block truncate font-mono text-[0.6rem] text-ink-3">Исполнитель</span>
                    </span>
                    <Mic2 className="h-3 w-3 shrink-0 text-ink-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link href="/account" className="mt-2 flex items-center gap-2 rounded-lg px-1.5 py-1.5 font-mono text-[0.65rem] text-ink-3 transition-colors hover:text-ink">
          <Users className="h-3 w-3" /> Все карточки и подборки
        </Link>
      </section>
    </aside>
  )
}
