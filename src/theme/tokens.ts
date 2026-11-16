import { Platform } from 'react-native'

/**
 * UI colours, by role. Contrast is checked for text: `ink`, `muted`, `accent`, `info`, `warn` and
 * `danger` all reach 4.5:1 on `ground`, `surface`, `subtle`, `todayTint` and `holyTint`.
 */
export const colors = {
  /** The page: a warm cream that white groups sit on. */
  ground: '#F7F4ED',
  /** Grouped lists, cards, sheets. */
  surface: '#FFFFFF',
  /** A quieter fill on the ground or inside a surface: chips, neutral badges, sunk panels. */
  subtle: '#F0ECE3',
  ink: '#1D201C',
  /** Secondary text (5.3:1 on ground, 5.9:1 on surface). */
  muted: '#6B6458',
  /** Borders on controls and outlined cards. */
  line: '#E6E1D6',
  /** Hairlines between rows of a grouped list and between week columns. Decorative only. */
  separator: '#EEEBE3',
  accent: '#2E6A4E',
  accentSoft: '#E7F0EA',
  /** The accent laid over glass or white: the active tab in the nav pill. */
  accentTint: 'rgba(46, 106, 78, 0.13)',
  onAccent: '#FFFFFF',
  /** Today's column and row (pair with `accent` text). */
  todayTint: '#F1F6F2',
  /** Shabbat and Yom Tov (pair with `info` text). */
  holyTint: '#EFF3F9',
  danger: '#A3261B',
  dangerSoft: '#FBEAE7',
  warn: '#7A4E00',
  warnSoft: '#FBF1DC',
  info: '#1F4F86',
  infoSoft: '#E6EEF8',
  /** Quiet translucent fills on the cream ground: the Week | Month toggle, round buttons. */
  wash: 'rgba(0, 0, 0, 0.06)',
  washLight: 'rgba(0, 0, 0, 0.05)',
  /** The empty ring of a tick circle. */
  ring: '#C9C2B4',
  /** Translucent white for floating chrome (the web nav pill and its buttons). */
  glass: 'rgba(255, 255, 255, 0.72)',
  glassEdge: 'rgba(255, 255, 255, 0.85)',
  /** Shadow colour for floating chrome and menus; strength comes from the opacity. */
  shadow: '#3C321E',
  scrim: 'rgba(29, 32, 28, 0.5)',
  // Cooking mode (dark)
  cookBg: '#151816',
  cookSurface: '#212622',
  cookLine: '#363C37',
  cookInk: '#F4F2EA',
  cookMuted: '#A9AFA5',
  cookAccent: '#7FC8A0',
  cookAlert: '#F2B84B',
  cookDanger: '#F27B6E',
  cookAlertSoft: '#8A6A2A',
} as const

/** The app-icon pot, drawn in code for the loader. Illustration colours, not UI colours. */
export const pot = {
  body: '#C23B2E',
  sheen: '#D9564A',
  rim: '#9E2C24',
  mouth: '#4A1612',
  stew: '#6E3B1F',
  stewShine: '#7E4626',
  bubble: '#8A5530',
  bubbleRing: '#E6D3AA',
  chunk: '#D6A85E',
  chunkShine: '#E7C27F',
} as const

/** Third-party sign-in branding; fixed by Apple's and Google's guidelines, not themeable. */
export const brand = {
  appleBg: '#000000',
  appleFg: '#FFFFFF',
  googleBg: '#FFFFFF',
  googleFg: '#1F1F1F',
  googleBorder: '#747775',
} as const

/**
 * On the web a family that has not loaded (or never does) must fall back to a sans, not the browser's
 * default serif, so each face carries a fallback stack there. Native needs the bare family name.
 */
const SANS =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
const face = (name: string) => (Platform.OS === 'web' ? `${name}, ${SANS}` : name)

export const fonts = {
  display: face('BricolageGrotesque_700Bold'),
  body: face('InstrumentSans_400Regular'),
  bodyMedium: face('InstrumentSans_500Medium'),
  bodySemiBold: face('InstrumentSans_600SemiBold'),
} as const

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, huge: 48 } as const

export const radius = {
  card: 14,
  /** White grouped containers on the cream ground (week, tonight card). */
  group: 20,
  input: 12,
  pill: 999,
  tile: 12,
  button: 6,
  /** The brand icon in the nav. */
  icon: 9,
} as const

export const size = {
  touch: 44,
  maxContent: 1120,
  wideBreakpoint: 900,
  navHeight: 64,
  /** The brand icon in the web top nav. */
  brandIcon: 34,
  tabBarHeight: 64,
  gutterPhone: 16,
  gutterWide: 32,
} as const

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  h1: 28,
  display: 34,
  cook: 30,
  cookTimer: 64,
} as const

export type Tone = 'neutral' | 'danger' | 'warn' | 'info' | 'accent' | 'muted'

/** Foreground / background pair for each tone. */
export const tones: Record<Tone, { fg: string; bg: string }> = {
  neutral: { fg: colors.ink, bg: colors.subtle },
  muted: { fg: colors.muted, bg: colors.subtle },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
  warn: { fg: colors.warn, bg: colors.warnSoft },
  info: { fg: colors.info, bg: colors.infoSoft },
  accent: { fg: colors.accent, bg: colors.accentSoft },
}
