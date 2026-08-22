/**
 * Темы оформления ГУЛа.
 *
 * Каждая тема — это набор CSS-переменных, которые применяются к <html>.
 * Компоненты не знают о темах ничего: они пользуются только токенами
 * (bg-paper-2, text-ink-2, border-rule, text-accent-1 и т.д.), поэтому
 * добавление новой темы не требует правок в разметке.
 *
 * Правило, которое здесь важно не нарушать: ни один компонент не должен
 * задавать цвет напрямую (bg-cyan-300, text-rose-200 и подобное). Иначе тема
 * переключится «в одном месте», а в остальных останется старая палитра.
 */

export type ThemeId = 'warm' | 'neon' | 'midnight' | 'daylight'

export type ThemeTokens = {
  /** Базовый фон страницы. */
  paper: string
  /** Стекло: панели и карточки. */
  paper2: string
  /** Стекло поплотнее: активные и вложенные поверхности. */
  paper3: string
  ink: string
  ink1: string
  ink2: string
  ink3: string
  rule: string
  ruleSoft: string
  /** Основной акцент: активные состояния, ссылки, прогресс. */
  accent1: string
  /** Дополнительный акцент: выделение, ИИ-бейдж, приватность. */
  accent2: string
  /** Тёплый акцент: лайки, «сейчас играет». */
  accentHot: string
  /** Цвет текста поверх заливки accent1. */
  onAccent: string
  glassBg: string
  glassBorder: string
  glassBlur: string
  /**
   * Насколько ярко проступает размытая обложка текущего трека в фоне.
   * 0 — фон статичный. Именно этот приём даёт «живой» фон из референса.
   */
  ambient: string
  /** Дополнительная заливка поверх обложки, задаёт общий тон темы. */
  ambientScrim: string
  /** Схема для нативных контролов (скроллбары, автозаполнение). */
  scheme: 'dark' | 'light'
}

export type Theme = {
  id: ThemeId
  label: string
  hint: string
  tokens: ThemeTokens
}

export const THEMES: Theme[] = [
  {
    id: 'warm',
    label: 'Тёплая',
    hint: 'Мягкое стекло поверх обложки альбома',
    tokens: {
      paper: '#191411',
      paper2: 'rgba(255, 246, 238, 0.075)',
      paper3: 'rgba(255, 246, 238, 0.135)',
      ink: '#f8f2ea',
      ink1: '#e9ded1',
      ink2: '#c2b3a4',
      ink3: '#98897b',
      rule: 'rgba(255, 243, 231, 0.15)',
      ruleSoft: 'rgba(255, 243, 231, 0.075)',
      accent1: '#eccfa9',
      accent2: '#cbb0e0',
      accentHot: '#e59a8f',
      onAccent: '#2a1d10',
      glassBg: 'rgba(48, 39, 33, 0.52)',
      glassBorder: 'rgba(255, 243, 231, 0.16)',
      glassBlur: '26px',
      ambient: '0.62',
      ambientScrim: 'radial-gradient(120% 120% at 50% 0%, rgba(58,46,38,0.35), rgba(20,16,13,0.86))',
      scheme: 'dark',
    },
  },
  {
    id: 'neon',
    label: 'Неон',
    hint: 'Прежний тёмный кибер-стиль ГУЛа',
    tokens: {
      paper: '#050812',
      paper2: 'rgba(12, 18, 34, 0.72)',
      paper3: 'rgba(24, 34, 58, 0.64)',
      ink: '#f6f8ff',
      ink1: '#d8e1f7',
      ink2: '#9aa9c8',
      ink3: '#667493',
      rule: 'rgba(171, 193, 255, 0.16)',
      ruleSoft: 'rgba(171, 193, 255, 0.09)',
      accent1: '#4ee6ff',
      accent2: '#a78bfa',
      accentHot: '#ff4fa8',
      onAccent: '#031019',
      glassBg: 'rgba(11, 17, 32, 0.6)',
      glassBorder: 'rgba(171, 193, 255, 0.16)',
      glassBlur: '22px',
      ambient: '0.16',
      ambientScrim: 'radial-gradient(120% 120% at 50% 0%, rgba(10,18,38,0.6), rgba(5,8,18,0.94))',
      scheme: 'dark',
    },
  },
  {
    id: 'midnight',
    label: 'Полночь',
    hint: 'Спокойный тёмный, без неона',
    tokens: {
      paper: '#101216',
      paper2: 'rgba(238, 243, 255, 0.06)',
      paper3: 'rgba(238, 243, 255, 0.11)',
      ink: '#f1f4f8',
      ink1: '#dbe1e9',
      ink2: '#a7b0bd',
      ink3: '#78828f',
      rule: 'rgba(226, 234, 246, 0.13)',
      ruleSoft: 'rgba(226, 234, 246, 0.07)',
      accent1: '#8ab4f8',
      accent2: '#b3a5e8',
      accentHot: '#e88fa4',
      onAccent: '#0b1421',
      glassBg: 'rgba(22, 26, 33, 0.62)',
      glassBorder: 'rgba(226, 234, 246, 0.14)',
      glassBlur: '20px',
      ambient: '0.3',
      ambientScrim: 'radial-gradient(120% 120% at 50% 0%, rgba(26,31,40,0.5), rgba(14,16,20,0.9))',
      scheme: 'dark',
    },
  },
  {
    id: 'daylight',
    label: 'Светлая',
    hint: 'Дневной режим с тёплой бумагой',
    tokens: {
      paper: '#f6f2ec',
      paper2: 'rgba(28, 22, 16, 0.045)',
      paper3: 'rgba(28, 22, 16, 0.085)',
      ink: '#1d1712',
      ink1: '#3a3128',
      ink2: '#6b5f52',
      ink3: '#93867a',
      rule: 'rgba(28, 22, 16, 0.14)',
      ruleSoft: 'rgba(28, 22, 16, 0.07)',
      accent1: '#a86b32',
      accent2: '#7b5aa6',
      accentHot: '#c2544a',
      onAccent: '#fdf8f2',
      glassBg: 'rgba(255, 252, 247, 0.72)',
      glassBorder: 'rgba(28, 22, 16, 0.12)',
      glassBlur: '20px',
      ambient: '0.22',
      ambientScrim: 'radial-gradient(120% 120% at 50% 0%, rgba(255,250,243,0.72), rgba(246,242,236,0.93))',
      scheme: 'light',
    },
  },
]

export const DEFAULT_THEME: ThemeId = 'warm'

export function themeById(id: string | null | undefined): Theme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]
}

/** Соответствие токена темы и имени CSS-переменной. */
const CSS_VARIABLE: Record<keyof ThemeTokens, string> = {
  paper: '--paper',
  paper2: '--paper-2',
  paper3: '--paper-3',
  ink: '--ink',
  ink1: '--ink-1',
  ink2: '--ink-2',
  ink3: '--ink-3',
  rule: '--rule',
  ruleSoft: '--rule-soft',
  accent1: '--accent-1',
  accent2: '--accent-2',
  accentHot: '--accent-hot',
  onAccent: '--on-accent',
  glassBg: '--glass-bg',
  glassBorder: '--glass-border',
  glassBlur: '--glass-blur',
  ambient: '--ambient',
  ambientScrim: '--ambient-scrim',
  scheme: '--color-scheme',
}

/** Готовый список пар «переменная → значение» для применения к элементу. */
export function themeVariables(theme: Theme, accentOverride?: string | null): [string, string][] {
  const entries = (Object.keys(CSS_VARIABLE) as (keyof ThemeTokens)[]).map(
    (key) => [CSS_VARIABLE[key], theme.tokens[key]] as [string, string],
  )
  // Пользовательский акцент перекрывает акцент темы, всё остальное оставляя на месте.
  if (accentOverride) entries.push(['--accent-1', accentOverride], ['--on-accent', readableOn(accentOverride)])
  return entries
}

/**
 * Подбирает читаемый цвет текста поверх произвольного акцента.
 * Без этого пользовательская тема легко даёт белое по жёлтому.
 */
export function readableOn(hex: string): string {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? value.split('').map((char) => char + char).join('') : value
  if (full.length !== 6) return '#101010'
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16) / 255)
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  return luminance > 0.45 ? '#15100b' : '#fdf9f4'
}
