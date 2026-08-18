// ─────────────────────────────────────────────
// ГУЛ · моковые данные платформы (исправленная версия)
// ─────────────────────────────────────────────

export type CoverKey = 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'c6'
export type AvColor = '' | 'r' | 'b' | 'o' | 'g' | 'v'

export type Credit = {
  /** slug артиста для ссылки; null — если у автора нет карточки */
  artistId: string | null
  name: string
  /** роль в треке: «фит», «prod» и т.п. */
  role?: string
}

export type LyricLine = { t: number; text: string; section?: boolean }

export type TrackFacts = {
  producedBy?: Credit[]
  writtenBy?: Credit[]
  mixedMasteredBy?: Credit[]
  samples?: string[]
  tags?: string[]
}

export type GztNomination = 'track_of_month' | 'track_of_year' | 'cover_of_month' | 'album_of_year'

export type Artist = {
  id: string
  name: string
  initials: string
  color: AvColor
  city: string
  since: number
  monthly: number
  avg: number
  tracks: number
  verified: boolean
  /** аккаунт, к которому привязана карточка */
  account: string
  managedBy: string[]
  releaseIds: string[]
}

export type Track = {
  id: string
  title: string
  credits: Credit[]
  duration: string
  durationSec: number
  plays: number
  cover: CoverKey
  /** Пользовательский URL обложки; при отсутствии используется графический CoverKey. */
  coverUrl?: string
  /** Локальный или удалённый URL аудиопотока; при отсутствии используется demo fallback. */
  audioUrl?: string
  /** Нормализованные амплитуды для реальной пользовательской волноформы. */
  waveform?: number[]
  hasLyrics?: boolean
  releaseId?: string
  /** ID авторизованного владельца пользовательского трека. */
  owner_id?: string
  facts?: TrackFacts
}

// ГЗТ-критерии оценки: четыре базовых оси и единственный коэффициент восприятия.
export type GztScore = {
  text: number // Рифмы / Образы 1–10
  structure: number // Структура / Ритмика 1–10
  style: number // Реализация стиля 1–10
  individuality: number // Индивидуальность / Харизма 1–10
  atmosphere: number // Атмосфера / Вайб 1–5
}

export const GZT_CRITERIA = [
  { key: 'text', label: 'Рифмы / Образы', max: 10 },
  { key: 'structure', label: 'Структура / Ритмика', max: 10 },
  { key: 'style', label: 'Реализация стиля', max: 10 },
  { key: 'individuality', label: 'Индивидуальность / Харизма', max: 10 },
  { key: 'atmosphere', label: 'Атмосфера / Вайб', max: 5 },
] as const

export const GZT_MAX = 90
export const GZT_CORE_MAX = 40

/** ГУЛ За Творчество: сумма четырёх базовых критериев × вайб/5 × 2.25, шкала 0–90. */
export function gztTotal(score: GztScore): number {
  const core = score.text + score.structure + score.style + score.individuality
  return Math.round(core * (score.atmosphere / 5) * (GZT_MAX / GZT_CORE_MAX) * 10) / 10
}

export function gztCertification(score: number): 'diamond' | 'gold' | 'underground' {
  if (score >= 85) return 'diamond'
  if (score >= 70) return 'gold'
  return 'underground'
}

export type Review = {
  id: string
  author: string
  initials: string
  color: AvColor
  score: number
  when: string
  text: string
}

export type Release = {
  id: string
  title: string
  kind: string // «альбом», «EP», «сингл»
  genre?: string
  year: number
  cover: CoverKey
  /** Пользовательский URL обложки, приоритетнее декоративного CoverKey. */
  coverUrl?: string
  artistIds: string[]
  nomination?: GztNomination | null
  weeksInChart?: number
  plays: number
  trackIds: string[]
  votes: number
  reviewCount: number
  editorial: GztScore | null
  /** распределение оценок слушателей по 10-балльным корзинам (10 → 1) */
  distribution: number[]
  reviews: Review[]
  /** ID авторизованного владельца пользовательского релиза. */
  owner_id?: string
}

export type CardShare = {
  email: string
  role: 'owner' | 'editor' | 'viewer'
}

export type WorkspaceCard = {
  id: string
  name: string
  slug: string
  initials: string
  color: AvColor
  role: string
  access?: CardShare['role']
  bio?: string
  tracks: number
  listeners: string
  score: string
  who: string
  status: 'ok' | 'wait'
  shares?: CardShare[]
  /** ID авторизованного владельца пользовательской карточки. */
  owner_id?: string
}

// ─────────────────────────────────────────────
// артисты
// ─────────────────────────────────────────────
export const artists: Artist[] = [
  {
    id: 'yegeor',
    name: 'yegeor',
    initials: 'YE',
    color: 'b',
    city: 'Москва',
    since: 2021,
    monthly: 184220,
    avg: 3.74,
    tracks: 61,
    verified: true,
    account: 'dasdasd',
    managedBy: ['ДА', 'YE', 'ST'],
    releaseIds: ['steklovata', 'net-seti', 'garazh-2', 'pole-pomeh', 'perviy-tirazh'],
  },
  {
    id: 'stilsi',
    name: 'stilsi',
    initials: 'ST',
    color: 'o',
    city: 'Санкт-Петербург',
    since: 2020,
    monthly: 96015,
    avg: 3.62,
    tracks: 44,
    verified: true,
    account: 'dasdasd',
    managedBy: ['ДА', 'ST'],
    releaseIds: ['steklovata', 'net-seti'],
  },
  {
    id: 'plenka-909',
    name: 'ПЛЕНКА 909',
    initials: 'П9',
    color: 'r',
    city: 'Казань',
    since: 2019,
    monthly: 212480,
    avg: 3.81,
    tracks: 38,
    verified: true,
    account: 'dasdasd',
    managedBy: ['ДА'],
    releaseIds: ['net-seti'],
  },
  {
    id: 'nizkiy-sektor',
    name: 'низкий сектор',
    initials: 'НС',
    color: 'g',
    city: 'Москва',
    since: 2018,
    monthly: 58700,
    avg: 3.9,
    tracks: 112,
    verified: true,
    account: 'dasdasd',
    managedBy: ['ДА'],
    releaseIds: ['steklovata'],
  },
  {
    id: 'ozero',
    name: 'ozero',
    initials: 'OZ',
    color: 'v',
    city: 'Екатеринбург',
    since: 2022,
    monthly: 12340,
    avg: 3.44,
    tracks: 9,
    verified: false,
    account: 'dasdasd',
    managedBy: ['YE'],
    releaseIds: ['pole-pomeh'],
  },
  {
    id: 'hlam',
    name: 'ХЛАМ',
    initials: 'ХЛ',
    color: '',
    city: 'Новосибирск',
    since: 2023,
    monthly: 4108,
    avg: 2.98,
    tracks: 6,
    verified: true,
    account: 'dasdasd',
    managedBy: ['ST'],
    releaseIds: [],
  },
]

const A = (id: string, role?: string): Credit => {
  const a = artists.find((x) => x.id === id)
  return { artistId: id, name: a ? a.name : id, role }
}

// ─────────────────────────────────────────────
// треки
// ─────────────────────────────────────────────
export const tracks: Track[] = [
  // Альбом «Стекловата»
  {
    id: 'plenka-rvetsya',
    title: 'плёнка рвётся',
    credits: [A('yegeor')],
    duration: '2:41',
    durationSec: 161,
    plays: 188902,
    cover: 'c1',
    releaseId: 'steklovata',
  },
  {
    id: 'voda-v-betone',
    title: 'вода в бетоне',
    credits: [A('yegeor'), A('stilsi'), A('nizkiy-sektor', 'prod')],
    duration: '2:58',
    durationSec: 178,
    plays: 812043,
    cover: 'c1',
    hasLyrics: true,
    releaseId: 'steklovata',
    facts: { producedBy: [A('nizkiy-sektor', 'prod')], writtenBy: [A('yegeor'), A('stilsi')], mixedMasteredBy: [{ artistId: null, name: 'low signal studio' }], samples: ['городской шум · field recording'], tags: ['гаражный рэп', 'лоу-фай', 'ночной город'] },
  },
  {
    id: 'skvoznyak-steklovata',
    title: 'сквозняк',
    credits: [A('stilsi'), A('ozero', 'фит')],
    duration: '3:12',
    durationSec: 192,
    plays: 288750,
    cover: 'c6',
    hasLyrics: true,
    releaseId: 'steklovata',
  },
  {
    id: 'kuhnya-3-nochi',
    title: 'кухня 3 ночи',
    credits: [A('stilsi'), A('hlam', 'фит'), A('nizkiy-sektor', 'prod')],
    duration: '2:20',
    durationSec: 140,
    plays: 377640,
    cover: 'c4',
    releaseId: 'steklovata',
  },
  {
    id: 'tirazh-500',
    title: 'тираж 500',
    credits: [A('yegeor'), A('plenka-909', 'фит')],
    duration: '3:44',
    durationSec: 224,
    plays: 154622,
    cover: 'c3',
    hasLyrics: true,
    releaseId: 'steklovata',
    facts: { producedBy: [A('ozero')], writtenBy: [A('stilsi'), A('ozero', 'фит')], mixedMasteredBy: [{ artistId: null, name: 'ozero room' }], tags: ['эмбиент-рэп', 'холодный синт'] },
  },
  {
    id: 'net-seti-repriza',
    title: 'нет сети (реприза)',
    credits: [A('yegeor'), A('stilsi')],
    duration: '1:58',
    durationSec: 118,
    plays: 96300,
    cover: 'c2',
    releaseId: 'steklovata',
  },
  {
    id: 'fevral',
    title: 'февраль',
    credits: [A('stilsi')],
    duration: '4:02',
    durationSec: 242,
    plays: 142118,
    cover: 'c2',
    releaseId: 'steklovata',
  },
  {
    id: 'podval-gorit',
    title: 'подвал горит',
    credits: [A('yegeor'), A('ozero', 'фит')],
    duration: '3:31',
    durationSec: 211,
    plays: 119664,
    cover: 'c5',
    releaseId: 'steklovata',
  },
  {
    id: 'steklovata-title',
    title: 'стекловата',
    credits: [A('yegeor'), A('stilsi'), A('plenka-909', 'фит')],
    duration: '5:08',
    durationSec: 308,
    plays: 238844,
    cover: 'c1',
    hasLyrics: true,
    releaseId: 'steklovata',
  },

  // Треки для EP «НЕТ СЕТИ»
  {
    id: 'net-seti-orig',
    title: 'нет сети',
    credits: [A('plenka-909'), A('yegeor', 'фит')],
    duration: '2:15',
    durationSec: 135,
    plays: 511220,
    cover: 'c3',
    releaseId: 'net-seti',
  },
  {
    id: 'fevral-kassette',
    title: 'февраль (кассета)',
    credits: [A('nizkiy-sektor'), A('ozero', 'фит')],
    duration: '3:50',
    durationSec: 230,
    plays: 402118,
    cover: 'c2',
    releaseId: 'net-seti',
  },
  {
    id: 'pustoy-chat',
    title: 'пустой чат',
    credits: [A('hlam')],
    duration: '2:05',
    durationSec: 125,
    plays: 190400,
    cover: 'c2',
    releaseId: 'net-seti',
  },

  // Треки для Альбома «ГАРАЖ 2»
  {
    id: 'garazh-title',
    title: 'гараж (переиздание)',
    credits: [A('yegeor')],
    duration: '3:10',
    durationSec: 190,
    plays: 341009,
    cover: 'c5',
    releaseId: 'garazh-2',
  },

  // Треки для EP «ПОЛЕ ПОМЕХ»
  {
    id: 'skvoznyak-pole',
    title: 'сквозняк (версия озер)',
    credits: [A('ozero'), A('plenka-909', 'фит'), A('nizkiy-sektor', 'prod')],
    duration: '3:12',
    durationSec: 192,
    plays: 288750,
    cover: 'c4',
    releaseId: 'pole-pomeh',
  },
  {
    id: 'podval-live',
    title: 'подвал горит (live)',
    credits: [A('yegeor'), A('ozero', 'фит')],
    duration: '3:45',
    durationSec: 225,
    plays: 132259,
    cover: 'c4',
    releaseId: 'pole-pomeh',
  },

  // Сингл «ПЕРВЫЙ ТИРАЖ»
  {
    id: 'perviy-tirazh-single',
    title: 'плёнка рвётся (single version)',
    credits: [A('yegeor')],
    duration: '2:41',
    durationSec: 161,
    plays: 38200,
    cover: 'c6',
    releaseId: 'perviy-tirazh',
  },
]

// ─────────────────────────────────────────────
// синхронный текст «вода в бетоне»
// ─────────────────────────────────────────────
export const lyricsByTrack: Record<string, LyricLine[]> = {
  'voda-v-betone': [
    { t: 0, text: '[интро]', section: true },
    { t: 4, text: 'фонари в лужах, как чужие окна' },
    { t: 11, text: 'я курю в подъезде на восьмом' },
    { t: 18, text: 'здесь вода в бетоне не сохнет' },
    { t: 25, text: 'и февраль остался за стеклом' },
    { t: 33, text: '[yegeor]', section: true },
    { t: 36, text: 'я считал этажи, а не деньги' },
    { t: 43, text: 'плёнка крутится, я в ней шумом' },
    { t: 50, text: 'если пишешь мне ночью, то честно' },
    { t: 57, text: 'у меня телефон на беззвучном' },
    { t: 65, text: 'сорок восемь минут до метро' },
    { t: 72, text: 'сорок восемь причин не идти' },
    { t: 80, text: '[stilsi]', section: true },
    { t: 83, text: 'мы не станции, мы перегоны' },
    { t: 90, text: 'между нами один поворот' },
    { t: 97, text: 'вода в бетоне, вода в бетоне' },
    { t: 104, text: 'просто держит, пока не пройдёт' },
    { t: 112, text: '[припев]', section: true },
    { t: 115, text: 'здесь вода в бетоне не сохнет' },
    { t: 122, text: 'и февраль остался за стеклом' },
    { t: 129, text: 'фонари в лужах, как чужие окна' },
    { t: 136, text: 'я вернусь, когда станет теплом' },
    { t: 145, text: '[аутро]', section: true },
    { t: 150, text: 'вода в бетоне' },
    { t: 158, text: 'вода в бетоне' },
    { t: 168, text: '…' },
  ],
}

// ─────────────────────────────────────────────
// релизы
// ─────────────────────────────────────────────
export const releases: Release[] = [
  {
    id: 'steklovata',
    title: 'Стекловата',
    kind: 'альбом',
    year: 2026,
    cover: 'c1',
    artistIds: ['yegeor', 'stilsi'],
    weeksInChart: 4,
    plays: 2418903,
    trackIds: [
      'plenka-rvetsya',
      'voda-v-betone',
      'skvoznyak-steklovata',
      'kuhnya-3-nochi',
      'tirazh-500',
      'net-seti-repriza',
      'fevral',
      'podval-gorit',
      'steklovata-title',
    ],
    votes: 1204,
    reviewCount: 87,
    editorial: { text: 8, structure: 7, style: 8, individuality: 9, atmosphere: 4 },
    nomination: 'album_of_year',
    distribution: [142, 238, 301, 196, 141, 74, 49, 28, 21, 14],
    reviews: [
      {
        id: 'r1',
        author: 'клавиша',
        initials: 'КЛ',
        color: 'v',
        score: 8.4,
        when: '2 дня назад',
        text: 'Первый раз слышу, чтобы гараж и вода в подвале звучали дорого. «вода в бетоне» вытаскивает весь диск, но и хвост держится.',
      },
      {
        id: 'r2',
        author: 'dmnk',
        initials: 'ДМ',
        color: 'g',
        score: 6.0,
        when: '5 дней назад',
        text: 'Сведение местами сырое, вокал stilsi тонет на втором припеве. Идея сильнее исполнения, но слушать буду.',
      },
      {
        id: 'r3',
        author: 'касетник',
        initials: 'КС',
        color: 'r',
        score: 7.6,
        when: 'неделю назад',
        text: 'Тексты держат весь релиз. «сорок восемь причин не идти» — лучшая строчка года в подвальном рэпе, без шуток.',
      },
    ],
  },
  {
    id: 'net-seti',
    title: 'НЕТ СЕТИ',
    kind: 'EP',
    year: 2025,
    cover: 'c3',
    artistIds: ['yegeor', 'stilsi'],
    weeksInChart: 1,
    plays: 511220,
    trackIds: ['net-seti-orig', 'fevral-kassette', 'pustoy-chat'],
    votes: 640,
    reviewCount: 31,
    editorial: { text: 7, structure: 7, style: 7, individuality: 6, atmosphere: 4 },
    nomination: 'track_of_month',
    distribution: [61, 118, 142, 110, 84, 51, 34, 20, 12, 8],
    reviews: [
      {
        id: 'n1',
        author: 'радиошум',
        initials: 'РШ',
        color: 'b',
        score: 7.2,
        when: '3 недели назад',
        text: 'Короткий EP, но каждый трек на своём месте. Реприза лишняя, остальное — попадание.',
      },
    ],
  },
  {
    id: 'garazh-2',
    title: 'ГАРАЖ 2',
    kind: 'альбом',
    year: 2024,
    cover: 'c5',
    artistIds: ['yegeor'],
    plays: 1204880,
    trackIds: ['podval-gorit', 'plenka-rvetsya', 'garazh-title'],
    votes: 980,
    reviewCount: 44,
    editorial: { text: 8, structure: 8, style: 9, individuality: 8, atmosphere: 5 },
    nomination: 'cover_of_month',
    distribution: [210, 260, 220, 130, 70, 40, 22, 14, 9, 5],
    reviews: [
      {
        id: 'g1',
        author: 'подвал',
        initials: 'ПД',
        color: 'o',
        score: 8.6,
        when: 'год назад',
        text: 'Вторая часть жёстче первой. Звук стал плотнее, а yegeor наконец научился держать структуру.',
      },
    ],
  },
  {
    id: 'pole-pomeh',
    title: 'ПОЛЕ ПОМЕХ',
    kind: 'EP',
    year: 2023,
    cover: 'c4',
    artistIds: ['yegeor', 'ozero'],
    plays: 421009,
    trackIds: ['skvoznyak-pole', 'podval-live'],
    votes: 210,
    reviewCount: 12,
    editorial: { text: 6, structure: 6, style: 7, individuality: 6, atmosphere: 3 },
    distribution: [22, 40, 55, 42, 28, 18, 10, 6, 3, 2],
    reviews: [],
  },
  {
    id: 'perviy-tirazh',
    title: 'ПЕРВЫЙ ТИРАЖ',
    kind: 'сингл',
    year: 2022,
    cover: 'c6',
    artistIds: ['yegeor'],
    plays: 38200,
    trackIds: ['perviy-tirazh-single'],
    votes: 0,
    reviewCount: 0,
    editorial: null,
    distribution: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    reviews: [],
  },
]

// ─────────────────────────────────────────────
// чарт
// ─────────────────────────────────────────────
export type ChartEntry = {
  trackId: string
  title: string
  credits: Credit[]
  cover: CoverKey
  coverUrl?: string
  score: number
  votes: number
  plays24: number
  playsWeek: number
  move: number | 'new'
  releaseId: string
  fresh?: boolean
}

export const chart: ChartEntry[] = [
  {
    trackId: 'voda-v-betone',
    title: 'вода в бетоне',
    credits: [A('yegeor'), A('stilsi')],
    cover: 'c1',
    score: 7.9,
    votes: 1204,
    plays24: 128043,
    playsWeek: 812043,
    move: 2,
    releaseId: 'steklovata',
    fresh: true,
  },
  {
    trackId: 'net-seti-orig',
    title: 'нет сети',
    credits: [A('plenka-909'), A('yegeor', 'фит')],
    cover: 'c3',
    score: 7.4,
    votes: 640,
    plays24: 78220,
    playsWeek: 511220,
    move: -1,
    releaseId: 'net-seti',
  },
  {
    trackId: 'fevral-kassette',
    title: 'февраль в кассете',
    credits: [A('nizkiy-sektor'), A('ozero', 'фит')],
    cover: 'c2',
    score: 8.2,
    votes: 388,
    plays24: 62118,
    playsWeek: 402118,
    move: 0,
    releaseId: 'net-seti',
  },
  {
    trackId: 'kuhnya-3-nochi',
    title: 'кухня 3 ночи',
    credits: [A('stilsi'), A('hlam', 'фит')],
    cover: 'c4',
    score: 6.6,
    votes: 915,
    plays24: 91640,
    playsWeek: 377640,
    move: 'new',
    releaseId: 'steklovata',
  },
  {
    trackId: 'garazh-title',
    title: 'гараж (переиздание)',
    credits: [A('yegeor')],
    cover: 'c5',
    score: 8.6,
    votes: 2210,
    plays24: 51009,
    playsWeek: 341009,
    move: 5,
    releaseId: 'garazh-2',
  },
  {
    trackId: 'skvoznyak-pole',
    title: 'сквозняк',
    credits: [A('ozero'), A('plenka-909', 'фит'), A('nizkiy-sektor', 'prod')],
    cover: 'c6',
    score: 6.1,
    votes: 142,
    plays24: 38750,
    playsWeek: 288750,
    move: -4,
    releaseId: 'pole-pomeh',
  },
  {
    trackId: 'pustoy-chat',
    title: 'пустой чат',
    credits: [A('hlam')],
    cover: 'c2',
    score: 5.7,
    votes: 97,
    plays24: 24400,
    playsWeek: 190400,
    move: 1,
    releaseId: 'net-seti',
  },
  {
    trackId: 'tirazh-500',
    title: 'тираж 500',
    credits: [A('plenka-909'), A('yegeor', 'фит')],
    cover: 'c3',
    score: 8.0,
    votes: 519,
    plays24: 34622,
    playsWeek: 154622,
    move: 'new',
    releaseId: 'steklovata',
  },
]

// ─────────────────────────────────────────────
// карточки артиста на аккаунте
// ─────────────────────────────────────────────
export const workspaceCards: WorkspaceCard[] = [
  {
    id: 'plenka-909',
    name: 'ПЛЕНКА 909',
    slug: 'plenka-909',
    initials: 'П9',
    color: 'r',
    role: 'основная',
    access: 'owner',
    bio: 'Казанский лоу-фай и гаражный звук.',
    tracks: 38,
    listeners: '212 480',
    score: '3.81',
    who: 'dasdasd',
    status: 'ok',
    shares: [],
  },
  {
    id: 'yegeor',
    name: 'yegeor',
    slug: 'yegeor',
    initials: 'YE',
    color: 'b',
    role: 'основная',
    access: 'owner',
    bio: 'Электронный хип-хоп / Москва.',
    tracks: 61,
    listeners: '184 220',
    score: '3.74',
    who: 'yegeor',
    status: 'ok',
    shares: [{ email: 'stilsi@gul.fm', role: 'editor' }],
  },
  {
    id: 'stilsi',
    name: 'stilsi',
    slug: 'stilsi',
    initials: 'ST',
    color: 'o',
    role: 'основная',
    access: 'owner',
    bio: 'Инди-продакшн из Петербурга.',
    tracks: 44,
    listeners: '96 015',
    score: '3.62',
    who: 'stilsi',
    status: 'ok',
    shares: [],
  },
  {
    id: 'nizkiy-sektor',
    name: 'низкий сектор',
    slug: 'nizkiy-sektor',
    initials: 'НС',
    color: 'g',
    role: 'коллектив',
    access: 'owner',
    bio: 'Независимое творческое объединение.',
    tracks: 112,
    listeners: '58 700',
    score: '3.90',
    who: 'dasdasd',
    status: 'ok',
    shares: [],
  },
  {
    id: 'ozero',
    name: 'ozero',
    slug: 'ozero',
    initials: 'OZ',
    color: 'v',
    role: 'сайд-проект',
    access: 'editor',
    bio: 'Эмбиент-проект.',
    tracks: 9,
    listeners: '12 340',
    score: '3.44',
    who: 'yegeor',
    status: 'wait',
    shares: [],
  },
  {
    id: 'hlam',
    name: 'ХЛАМ',
    slug: 'hlam',
    initials: 'ХЛ',
    color: '',
    role: 'сайд-проект',
    access: 'editor',
    bio: 'Новосибирский шум.',
    tracks: 6,
    listeners: '4 108',
    score: '2.98',
    who: 'stilsi',
    status: 'ok',
    shares: [],
  },
]

export const ACCOUNT = {
  handle: 'dasdasd',
  email: 'lostgnta@gmail.com',
  totalCards: 53,
}

// ─────────────────────────────────────────────
// хелперы
// ─────────────────────────────────────────────
export const fmt = (n: number) => n.toLocaleString('ru-RU')
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export const getArtist = (id: string) => artists.find((a) => a.id === id)
export const getRelease = (id: string) => releases.find((r) => r.id === id)
export const getTrack = (id: string) => tracks.find((t) => t.id === id)