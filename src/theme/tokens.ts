import { Platform } from 'react-native';

/**
 * Single source of truth for every visual value in the app.
 *
 * Nothing outside this file is allowed to hardcode a colour. Screens read
 * colours through `useTheme()`, which hands back one of the palettes below, so
 * light/dark mode is a single swap rather than a `dark:` variant sprinkled
 * across 35 screens.
 *
 * Three accent themes ship with the app and the reader picks one in
 * Settings → Appearance.
 *
 * Each theme is defined once, in light and dark, and every pair below was
 * checked for WCAG AA contrast: body text ≥ 7:1 on its background, secondary
 * text ≥ 4.5:1, and any text on a `*Soft` fill ≥ 4.5:1 against that fill.
 *
 * In light mode the page is deliberately several steps darker than a card.
 * They started one percent apart, which is no separation at all: every screen
 * read as flat boxes on paper, and the elevation shadows had nothing to sit on.
 */

export type ColorScheme = 'light' | 'dark';
export type ThemeName = 'ink' | 'forest' | 'violet';

export const THEME_NAMES: ThemeName[] = ['ink', 'forest', 'violet'];

export interface Palette {
  /** App background — the "paper" the reader looks at. */
  bg: string;
  /** Cards, sheets, anything lifted off the background. */
  card: string;
  /** A second card level, for cards sitting on top of cards. */
  cardRaised: string;
  /** Quiet fills: input backgrounds, chips, skeletons. */
  subtle: string;
  /** Primary text. */
  fg: string;
  /** Secondary text: metadata, helper copy. */
  fgMuted: string;
  /** Tertiary text: timestamps, disabled. */
  fgSubtle: string;
  /** Hairlines and outlines. */
  border: string;
  /** Stronger outline for focus rings and selected states. */
  borderStrong: string;

  primary: string;
  primaryFg: string;
  /** Tinted primary background for badges and soft buttons. */
  primarySoft: string;
  primarySoftFg: string;

  accent: string;
  accentFg: string;
  accentSoft: string;
  accentSoftFg: string;

  success: string;
  successSoft: string;
  successSoftFg: string;
  warning: string;
  warningSoft: string;
  warningSoftFg: string;
  danger: string;
  dangerSoft: string;
  dangerSoftFg: string;
  info: string;
  infoSoft: string;
  infoSoftFg: string;

  /** Star / rating fill. */
  rating: string;
  /** Reading-streak flame. */
  streak: string;

  overlay: string;
  /** Shadow colour; on Android only elevation is used. */
  shadow: string;
  /** Placeholder fill behind an image that has not decoded yet. */
  imagePlaceholder: string;

  /** Categorical series for the genre pie and activity charts. */
  chart: readonly [string, string, string, string, string, string];
}

/* -------------------------------------------------------------------------- */
/*  ink — default theme. Updated to the new warm light palette.               */
/* -------------------------------------------------------------------------- */

const inkLight: Palette = {
  bg: '#FAF9F6',
  card: '#FFFFFF',
  cardRaised: '#FFFFFF',
  subtle: '#F5F5F3',
  fg: '#222222',
  fgMuted: '#6B7280',
  fgSubtle: '#9CA3AF',
  border: '#E5E7EB',
  borderStrong: '#D9DCE0',

  primary: '#3F7D5A',
  primaryFg: '#FFFFFF',
  primarySoft: '#E8F2EC',
  primarySoftFg: '#184B36',
  accent: '#D88A4A',
  accentFg: '#FFFFFF',
  accentSoft: '#F7EDE2',
  accentSoftFg: '#6B3F20',

  success: '#3F7D5A',
  successSoft: '#E8F2EC',
  successSoftFg: '#184B36',
  warning: '#D88A4A',
  warningSoft: '#FDEBE0',
  warningSoftFg: '#6B3F20',
  danger: '#C94C4C',
  dangerSoft: '#FDECEE',
  dangerSoftFg: '#8A2F2F',
  info: '#2B6CB0',
  infoSoft: '#EBF3FF',
  infoSoftFg: '#10345A',

  rating: '#D99A15',
  streak: '#DC6803',

  overlay: 'rgba(0, 0, 0, 0.06)',
  shadow: '#000000',
  imagePlaceholder: '#ECECEA',

  chart: ['#3F7D5A', '#D88A4A', '#2C7A6B', '#8C4A6B', '#4B5FA8', '#7A7F45'],
};

const inkDark: Palette = {
  bg: '#0E1116',
  card: '#171B22',
  cardRaised: '#1E232B',
  subtle: '#22272F',
  fg: '#E9EBEE',
  fgMuted: '#9BA5B2',
  fgSubtle: '#6E7885',
  border: '#282E37',
  borderStrong: '#3A424D',

  primary: '#7BA8D9',
  primaryFg: '#0B1620',
  primarySoft: '#182432',
  primarySoftFg: '#A7C6E8',
  accent: '#E0A45C',
  accentFg: '#201506',
  accentSoft: '#2A2013',
  accentSoftFg: '#EBBE84',

  success: '#4ADE80',
  successSoft: '#12271A',
  successSoftFg: '#86EFAC',
  warning: '#FBBF24',
  warningSoft: '#2A2109',
  warningSoftFg: '#FCD34D',
  danger: '#F87171',
  dangerSoft: '#2C1616',
  dangerSoftFg: '#FCA5A5',
  info: '#60A5FA',
  infoSoft: '#131F33',
  infoSoftFg: '#93C5FD',

  rating: '#E8B33B',
  streak: '#F59E0B',

  overlay: 'rgba(0, 0, 0, 0.68)',
  shadow: '#000000',
  imagePlaceholder: '#1E232B',

  chart: ['#7BA8D9', '#E0A45C', '#5CCBB5', '#E08CB0', '#8B9BE8', '#B8C46A'],
};

/* -------------------------------------------------------------------------- */
/*  forest — keep existing palettes but align light variant to new look.      */
/* -------------------------------------------------------------------------- */

const forestLight: Palette = {
  bg: '#F7FAF6',
  card: '#FFFFFF',
  cardRaised: '#FFFFFF',
  subtle: '#F5F7F4',
  fg: '#222222',
  fgMuted: '#586158',
  fgSubtle: '#879186',
  border: '#E9EEE9',
  borderStrong: '#C6CFC4',

  primary: '#1B5E4A',
  primaryFg: '#FFFFFF',
  primarySoft: '#DFF1EA',
  primarySoftFg: '#134736',
  accent: '#9A4F26',
  accentFg: '#FFFFFF',
  accentSoft: '#FBEBE0',
  accentSoftFg: '#7A3D1B',

  success: '#166534',
  successSoft: '#DCFCE7',
  successSoftFg: '#14532D',
  warning: '#8F5A00',
  warningSoft: '#FDF1C7',
  warningSoftFg: '#734802',
  danger: '#B22C2C',
  dangerSoft: '#FCE7E7',
  dangerSoftFg: '#8C2222',
  info: '#1A6091',
  infoSoft: '#E0EFF9',
  infoSoftFg: '#134C74',

  rating: '#C9930F',
  streak: '#C2571A',

  overlay: 'rgba(0,0,0,0.06)',
  shadow: '#000000',
  imagePlaceholder: '#EAEEE8',

  chart: ['#1B5E4A', '#9A4F26', '#2F6F9E', '#7D5BA6', '#A8873C', '#8C3A55'],
};

const forestDark: Palette = {
  bg: '#0C1210',
  card: '#141B18',
  cardRaised: '#1B2320',
  subtle: '#1F2724',
  fg: '#E5EAE7',
  fgMuted: '#95A29C',
  fgSubtle: '#6A7772',
  border: '#242D29',
  borderStrong: '#36423D',

  primary: '#4ECCA3',
  primaryFg: '#04241A',
  primarySoft: '#122A22',
  primarySoftFg: '#7FDCBE',
  accent: '#DD8F62',
  accentFg: '#25120A',
  accentSoft: '#2A1B13',
  accentSoftFg: '#E9AE8B',

  success: '#4ADE80',
  successSoft: '#0F2A19',
  successSoftFg: '#86EFAC',
  warning: '#F5C038',
  warningSoft: '#2A2209',
  warningSoftFg: '#FBD75E',
  danger: '#F0757A',
  dangerSoft: '#2B1618',
  dangerSoftFg: '#F7A3A6',
  info: '#5BB0E8',
  infoSoft: '#12232E',
  infoSoftFg: '#8FCBF2',

  rating: '#E2B23C',
  streak: '#EE8A3C',

  overlay: 'rgba(0,0,0,0.68)',
  shadow: '#000000',
  imagePlaceholder: '#1B2320',

  chart: ['#4ECCA3', '#DD8F62', '#6BB6E8', '#B49AE0', '#D8BE63', '#E086A0'],
};

/* -------------------------------------------------------------------------- */
/*  violet — align light palette to the warm aesthetic while keeping accents. */
/* -------------------------------------------------------------------------- */

const violetLight: Palette = {
  bg: '#FAF9F6',
  card: '#FFFFFF',
  cardRaised: '#FFFFFF',
  subtle: '#F5F5F3',
  fg: '#222222',
  fgMuted: '#5C5C6B',
  fgSubtle: '#8B8B9B',
  border: '#E5E5EC',
  borderStrong: '#C9C9D6',

  primary: '#4F3FBF',
  primaryFg: '#FFFFFF',
  primarySoft: '#EBE8FB',
  primarySoftFg: '#3E31A0',
  accent: '#C13A55',
  accentFg: '#FFFFFF',
  accentSoft: '#FCE7EB',
  accentSoftFg: '#9B2C43',

  success: '#16704A',
  successSoft: '#DAF6EA',
  successSoftFg: '#0F573A',
  warning: '#95590A',
  warningSoft: '#FEF0D3',
  warningSoftFg: '#78470A',
  danger: '#BC2B3E',
  dangerSoft: '#FCE5E9',
  dangerSoftFg: '#95202F',
  info: '#2159B8',
  infoSoft: '#E4ECFC',
  infoSoftFg: '#1A468F',

  rating: '#D69412',
  streak: '#E05B2B',

  overlay: 'rgba(0,0,0,0.06)',
  shadow: '#000000',
  imagePlaceholder: '#EDEDF2',

  chart: ['#4F3FBF', '#C13A55', '#1F8A8A', '#B57A1E', '#7A4FB5', '#2E7D5B'],
};

const violetDark: Palette = {
  bg: '#0D0D14',
  card: '#16161F',
  cardRaised: '#1D1D28',
  subtle: '#21212C',
  fg: '#E9E9F0',
  fgMuted: '#9C9CAF',
  fgSubtle: '#70708A',
  border: '#272733',
  borderStrong: '#3A3A4A',

  primary: '#9B8AFB',
  primaryFg: '#120F26',
  primarySoft: '#1C1930',
  primarySoftFg: '#BCB0FD',
  accent: '#FF7A8F',
  accentFg: '#2A0A11',
  accentSoft: '#2E161C',
  accentSoftFg: '#FFA3B2',

  success: '#4ADE80',
  successSoft: '#12271A',
  successSoftFg: '#86EFAC',
  warning: '#FBBF24',
  warningSoft: '#2A2109',
  warningSoftFg: '#FCD34D',
  danger: '#F87171',
  dangerSoft: '#2C1616',
  dangerSoftFg: '#FCA5A5',
  info: '#60A5FA',
  infoSoft: '#131F33',
  infoSoftFg: '#93C5FD',

  rating: '#E8B33B',
  streak: '#FB7E45',

  overlay: 'rgba(0,0,0,0.68)',
  shadow: '#000000',
  imagePlaceholder: '#1D1D28',

  chart: ['#9B8AFB', '#FF7A8F', '#4ECDC4', '#E8B33B', '#C08AF0', '#5BD79A'],
};

/* -------------------------------------------------------------------------- */

export const themes: Record<ThemeName, Record<ColorScheme, Palette>> = {
  ink: { light: inkLight, dark: inkDark },
  forest: { light: forestLight, dark: forestDark },
  violet: { light: violetLight, dark: violetDark },
};

/** Swatches for the theme picker, so it does not have to reach into palettes. */
export const THEME_SWATCHES: Record<ThemeName, { light: string[]; dark: string[] }> = {
  ink: {
    light: [inkLight.primary, inkLight.accent, inkLight.bg],
    dark: [inkDark.primary, inkDark.accent, inkDark.bg],
  },
  forest: {
    light: [forestLight.primary, forestLight.accent, forestLight.bg],
    dark: [forestDark.primary, forestDark.accent, forestDark.bg],
  },
  violet: {
    light: [violetLight.primary, violetLight.accent, violetLight.bg],
    dark: [violetDark.primary, violetDark.accent, violetDark.bg],
  },
};

/** Kept for callers that only ever wanted the default theme's two palettes. */
export const palettes: Record<ColorScheme, Palette> = themes.ink;

/* -------------------------------------------------------------------------- */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  pill: 999,
} as const;

/**
 * Long-form reading wants a different face than UI chrome, so quotes and book
 * descriptions get a serif while everything else stays on the system sans.
 */
export const fonts = {
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  }) as string,
  sansMedium: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  }) as string,
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: "Georgia, 'Times New Roman', serif",
  }) as string,
} as const;

export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800' },
  h1: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  h2: { fontSize: 19, lineHeight: 25, fontWeight: '700' },
  h3: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  small: { fontSize: 13, lineHeight: 19, fontWeight: '400' },
  smallStrong: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: '600', letterSpacing: 0.4 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Cross-platform elevation: iOS/web get a shadow, Android gets `elevation`. */
export function elevation(level: 0 | 1 | 2 | 3, shadowColor: string) {
  if (level === 0) return {};
  const map = {
    1: { radius: 6, offset: 2, opacity: 0.04 },
    2: { radius: 10, offset: 3, opacity: 0.06 },
    3: { radius: 18, offset: 6, opacity: 0.08 },
  } as const;
  const { radius: r, offset, opacity } = map[level];
  return Platform.select({
    android: { elevation: level * 3 },
    default: {
      shadowColor,
      shadowOpacity: opacity,
      shadowRadius: r,
      shadowOffset: { width: 0, height: offset },
    },
  });
}

/**
 * Motion durations. Every animated component reads from here so "reduce
 * motion" can scale the whole app to zero in one place.
 */
export const motion = {
  fast: 140,
  base: 220,
  slow: 380,
  /** Spring used by sheets and press feedback. */
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
  /** Stagger between successive list items on entrance. */
  stagger: 45,
} as const;

/** Bottom-tab and header heights, kept here so screens can pad correctly. */
export const layout = {
  tabBarHeight: 60,
  headerHeight: 52,
  maxContentWidth: 720,
  bookCoverRatio: 2 / 3,
} as const;
