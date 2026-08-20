import type { Artist, Credit, Release, Track } from '@/lib/data'

/**
 * Подбор музыки для «Моей волны» и блока «Слушателям также нравится».
 *
 * Никаких внешних сервисов: считаем пересечения по тем данным, которые уже есть
 * у трека — жанр релиза, теги фактологии, авторы и продюсеры из кредитов, —
 * и взвешиваем их вкусом слушателя (лайки, история, подписки).
 *
 * Функции чистые и детерминированные: одинаковый вход даёт одинаковый выход.
 * Разнообразие потока обеспечивает параметр seed, а не Math.random, чтобы
 * очередь не перетасовывалась на каждом ре-рендере.
 */

export type TasteProfile = {
  /** Лайкнутые треки — самый сильный сигнал. */
  likedTrackIds: string[]
  /** История прослушиваний, свежие записи первыми. */
  historyTrackIds: string[]
  followingArtistIds: string[]
}

export const emptyTaste = (): TasteProfile => ({ likedTrackIds: [], historyTrackIds: [], followingArtistIds: [] })

type Signals = {
  tags: Set<string>
  genres: Set<string>
  artistIds: Set<string>
  people: Set<string>
}

const norm = (value: string) => value.trim().toLowerCase()

function peopleFrom(credits: Credit[] | undefined): string[] {
  return (credits ?? []).map((credit) => norm(credit.name)).filter(Boolean)
}

/** Все «признаки» трека, по которым его можно с чем-то сопоставить. */
export function trackSignals(track: Track, release?: Release): Signals {
  const facts = track.facts
  const tags = new Set((facts?.tags ?? []).map(norm).filter(Boolean))
  const genres = new Set<string>()
  if (release?.genre) genres.add(norm(release.genre))

  const artistIds = new Set<string>()
  for (const credit of track.credits ?? []) if (credit.artistId) artistIds.add(credit.artistId)
  for (const id of release?.artistIds ?? []) artistIds.add(id)

  const people = new Set<string>([
    ...peopleFrom(track.credits),
    ...peopleFrom(facts?.producedBy),
    ...peopleFrom(facts?.writtenBy),
    ...peopleFrom(facts?.mixedMasteredBy),
  ])

  return { tags, genres, artistIds, people }
}

function overlap(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0
  let shared = 0
  for (const value of left) if (right.has(value)) shared += 1
  return shared
}

function mergeSignals(list: Signals[]): Signals {
  const merged: Signals = { tags: new Set(), genres: new Set(), artistIds: new Set(), people: new Set() }
  for (const signals of list) {
    for (const tag of signals.tags) merged.tags.add(tag)
    for (const genre of signals.genres) merged.genres.add(genre)
    for (const id of signals.artistIds) merged.artistIds.add(id)
    for (const person of signals.people) merged.people.add(person)
  }
  return merged
}

/** Детерминированный псевдослучайный сдвиг: даёт разнообразие без Math.random. */
function jitter(id: string, seed: number): number {
  let hash = seed >>> 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0
  }
  return (hash % 1000) / 1000
}

export type Scored<T> = { item: T; score: number; reasons: string[] }

/**
 * Русская плюрализация: 1 тег / 2 тега / 5 тегов.
 * Правило «больше одного — множественное» здесь не работает и даёт «5 общих тега».
 */
function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100
  const mod10 = count % 10
  if (mod100 >= 11 && mod100 <= 14) return `${count} ${many}`
  if (mod10 === 1) return `${count} ${one}`
  if (mod10 >= 2 && mod10 <= 4) return `${count} ${few}`
  return `${count} ${many}`
}

export type RecommendInput = {
  taste: TasteProfile
  pool: Track[]
  getRelease: (id: string) => Release | undefined
  /** Треки, которые уже прозвучали или стоят в очереди. */
  exclude?: Iterable<string>
  limit?: number
  seed?: number
}

/**
 * Ранжирует треки под вкус слушателя.
 *
 * Вес сигналов подобран так, чтобы явное действие (лайк, подписка) весило
 * больше пассивного (совпадение жанра): иначе поток вырождается в один жанр.
 */
export function recommendTracks({ taste, pool, getRelease, exclude, limit = 20, seed = 1 }: RecommendInput): Scored<Track>[] {
  const excluded = new Set(exclude ?? [])
  const byId = new Map(pool.map((track) => [track.id, track]))

  const signalsOf = (track: Track) => trackSignals(track, track.releaseId ? getRelease(track.releaseId) : undefined)

  const likedSignals = taste.likedTrackIds.map((id) => byId.get(id)).filter((track): track is Track => Boolean(track)).map(signalsOf)
  // Из истории берём последние 30 прослушиваний: более старые уже не описывают вкус.
  const recentHistory = taste.historyTrackIds.slice(0, 30)
  const historySignals = recentHistory.map((id) => byId.get(id)).filter((track): track is Track => Boolean(track)).map(signalsOf)

  const likedProfile = mergeSignals(likedSignals)
  const historyProfile = mergeSignals(historySignals)
  const following = new Set(taste.followingArtistIds)
  const recentlyPlayed = new Set(recentHistory.slice(0, 10))
  const liked = new Set(taste.likedTrackIds)

  const scored: Scored<Track>[] = []
  for (const track of pool) {
    if (excluded.has(track.id)) continue
    const signals = signalsOf(track)
    const reasons: string[] = []
    let score = 0

    const likedTags = overlap(signals.tags, likedProfile.tags)
    if (likedTags) { score += likedTags * 4; reasons.push(`${plural(likedTags, 'тег', 'тега', 'тегов')} из любимого`) }

    const historyTags = overlap(signals.tags, historyProfile.tags)
    if (historyTags) { score += historyTags * 2; reasons.push(`${plural(historyTags, 'тег', 'тега', 'тегов')} из истории`) }

    const likedGenres = overlap(signals.genres, likedProfile.genres)
    if (likedGenres) { score += likedGenres * 3; reasons.push('жанр из любимого') }

    const historyGenres = overlap(signals.genres, historyProfile.genres)
    if (historyGenres) { score += historyGenres * 1.5; reasons.push('жанр из истории') }

    const people = overlap(signals.people, likedProfile.people) + overlap(signals.people, historyProfile.people)
    if (people) { score += people * 2.5; reasons.push(`${plural(people, 'общий автор', 'общих автора', 'общих авторов')}`) }

    let followed = 0
    for (const artistId of signals.artistIds) if (following.has(artistId)) followed += 1
    if (followed) { score += followed * 5; reasons.push('вы подписаны на артиста') }

    // Уже лайкнутое не крутим в потоке — оно и так доступно в «Понравившихся».
    if (liked.has(track.id)) score -= 6
    // Только что игравшее отодвигаем, чтобы волна не зацикливалась.
    if (recentlyPlayed.has(track.id)) score -= 10

    // Популярность — слабый добавок, чтобы при нулевом профиле поток не был пустым.
    score += Math.min(track.plays / 50_000, 2)
    score += jitter(track.id, seed) * 1.2

    scored.push({ item: track, score, reasons })
  }

  return scored.sort((left, right) => right.score - left.score).slice(0, limit)
}

export type SimilarArtistsInput = {
  artist: Artist
  artists: Artist[]
  getRelease: (id: string) => Release | undefined
  getTrack: (id: string) => Track | undefined
  limit?: number
}

/**
 * Похожие артисты для блока «Слушателям также нравится»:
 * пересечение жанров, тегов и общих продюсеров/авторов.
 */
export function similarArtists({ artist, artists, getRelease, getTrack, limit = 6 }: SimilarArtistsInput): Scored<Artist>[] {
  const profileOf = (candidate: Artist): Signals => {
    const releases = candidate.releaseIds.map(getRelease).filter((release): release is Release => Boolean(release))
    const signals = releases.flatMap((release) =>
      release.trackIds
        .map(getTrack)
        .filter((track): track is Track => Boolean(track))
        .map((track) => trackSignals(track, release)),
    )
    // Даже без треков у артиста остаются жанры релизов — этого хватает для связи.
    const genreOnly: Signals = {
      tags: new Set(),
      genres: new Set(releases.map((release) => release.genre).filter((genre): genre is string => Boolean(genre)).map(norm)),
      artistIds: new Set(),
      people: new Set(),
    }
    return mergeSignals([...signals, genreOnly])
  }

  const source = profileOf(artist)

  const scored: Scored<Artist>[] = []
  for (const candidate of artists) {
    if (candidate.id === artist.id) continue
    const signals = profileOf(candidate)
    const reasons: string[] = []
    let score = 0

    const genres = overlap(signals.genres, source.genres)
    if (genres) { score += genres * 4; reasons.push(plural(genres, 'общий жанр', 'общих жанра', 'общих жанров')) }

    const tags = overlap(signals.tags, source.tags)
    if (tags) { score += tags * 3; reasons.push(plural(tags, 'общий тег', 'общих тега', 'общих тегов')) }

    const people = overlap(signals.people, source.people)
    if (people) { score += people * 5; reasons.push(plural(people, 'общий участник', 'общих участника', 'общих участников')) }

    if (candidate.city === artist.city) { score += 1.5; reasons.push('тот же город') }

    if (score <= 0) continue
    scored.push({ item: candidate, score, reasons })
  }

  return scored.sort((left, right) => right.score - left.score).slice(0, limit)
}
