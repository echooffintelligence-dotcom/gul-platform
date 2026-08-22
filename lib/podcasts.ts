import type { CoverKey, Credit, Track } from '@/lib/data'

/**
 * Подкасты.
 *
 * Отдельный тип контента, но проигрываются они тем же плеером, что и музыка:
 * эпизод приводится к обычному Track через episodeAsTrack. Так подкасты сразу
 * получают очередь, «Мою волну» мимо себя, лайки и историю без дублирования кода.
 */

export type PodcastEpisode = {
  id: string
  title: string
  /** Краткое описание выпуска. */
  summary: string
  durationSec: number
  /** Дата публикации в формате ISO. */
  publishedAt: string
  audioUrl: string
  /** Номер выпуска для отображения. */
  number: number
}

export type Podcast = {
  id: string
  title: string
  author: string
  description: string
  cover: CoverKey
  coverUrl?: string
  category: string
  episodes: PodcastEpisode[]
}

const DEMO_AUDIO = '/audio/gul-demo.wav'

export const podcasts: Podcast[] = [
  {
    id: 'podcast-podval',
    title: 'Подвальный разбор',
    author: 'yegeor',
    description: 'Разбираем свежие релизы независимой сцены построчно: биты, тексты, сведение. Без вежливости и без рекламы.',
    cover: 'c3',
    category: 'Музыка',
    episodes: [
      { id: 'ep-podval-12', number: 12, title: 'Почему все звучат одинаково', summary: 'О пресетах, которые съели индивидуальность, и о том, как из этого выбраться.', durationSec: 1840, publishedAt: '2026-08-14', audioUrl: DEMO_AUDIO },
      { id: 'ep-podval-11', number: 11, title: 'Сведение на наушниках за 3 тысячи', summary: 'Можно ли свести релиз без студии. Спойлер: можно, но есть нюанс.', durationSec: 2120, publishedAt: '2026-08-07', audioUrl: DEMO_AUDIO },
      { id: 'ep-podval-10', number: 10, title: 'Гость: ПЛЕНКА 909', summary: 'Разговор о кассетах, шуме и о том, зачем портить чистый звук.', durationSec: 2650, publishedAt: '2026-07-31', audioUrl: DEMO_AUDIO },
    ],
  },
  {
    id: 'podcast-nochnaya',
    title: 'Ночная смена',
    author: 'stilsi',
    description: 'Разговоры под утро о музыке, городе и работе на износ. Записывается между четырьмя и шестью часами ночи.',
    cover: 'c5',
    category: 'Разговорный',
    episodes: [
      { id: 'ep-noch-05', number: 5, title: 'Город, который не спит вместе с тобой', summary: 'О пустых улицах, дешёвом кофе и текстах, которые пишутся только ночью.', durationSec: 1560, publishedAt: '2026-08-12', audioUrl: DEMO_AUDIO },
      { id: 'ep-noch-04', number: 4, title: 'Выгорание в независимой сцене', summary: 'Когда хобби стало работой, а работа перестала приносить радость.', durationSec: 1980, publishedAt: '2026-08-01', audioUrl: DEMO_AUDIO },
    ],
  },
  {
    id: 'podcast-fakty',
    title: 'Фактология трека',
    author: 'низкий сектор',
    description: 'Один выпуск — один трек. Кто написал, кто свёл, откуда сэмпл и почему он звучит именно так.',
    cover: 'c2',
    category: 'Образование',
    episodes: [
      { id: 'ep-fakt-08', number: 8, title: '«вода в бетоне»: разбор по слоям', summary: 'Что происходит в миксе на самом деле и зачем там третий слой бэков.', durationSec: 1320, publishedAt: '2026-08-16', audioUrl: DEMO_AUDIO },
      { id: 'ep-fakt-07', number: 7, title: 'Сэмпл, который засудили', summary: 'История о четырёх секундах, стоивших половину гонорара.', durationSec: 1440, publishedAt: '2026-08-09', audioUrl: DEMO_AUDIO },
    ],
  },
]

export const getPodcast = (id: string) => podcasts.find((podcast) => podcast.id === id)

function mmss(seconds: number) {
  const safe = Math.max(0, Math.round(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

/** Приводит эпизод к треку, чтобы его понимал обычный плеер и очередь. */
export function episodeAsTrack(podcast: Podcast, episode: PodcastEpisode): Track {
  const credits: Credit[] = [{ artistId: null, name: podcast.author, role: undefined }]
  return {
    id: episode.id,
    title: `${podcast.title} · №${episode.number} — ${episode.title}`,
    credits,
    duration: mmss(episode.durationSec),
    durationSec: episode.durationSec,
    plays: 0,
    cover: podcast.cover,
    coverUrl: podcast.coverUrl,
    audioUrl: episode.audioUrl,
    hasLyrics: false,
  }
}

/** Человекочитаемая длительность выпуска: «34 мин» вместо «34:12». */
export function episodeLength(seconds: number) {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`
}
