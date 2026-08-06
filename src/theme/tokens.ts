import { Platform } from 'react-native';

/**
 * Single source of truth for every visual value in the app.
 *
 * Nothing outside this file is allowed to hardcode a colour. Screens read
 * colours through `useTheme()`, which hands back one of the two palettes
 * below, so light/dark mode is a single swap rather than a `dark:` variant
 * sprinkled across 35 screens.
 */

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  /** App background — the "paper" the reader looks at. */
  bg: string;
  /** Cards, sheets, anything lifted off the background. */
  card: string;
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
  accentSoft: string;

  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;

  /** Star / rating fill. */
  rating: string;
  /** Reading-streak flame. */
  streak: string;

  overlay: string;
  /** Shadow colour; on Android only elevation is used. */
  shadow: string;

  /** Categorical series for the genre pie and activity charts. */
  chart: readonly [string, string, string, string, string, string];
}

const light: Palette = {
  bg: '#FBF8F3',
  card: '#FFFFFF',
  subtle: '#F2ECE3',
  fg: '#1C1917',
  fgMuted: '#6B625A',
  fgSubtle: '#9A9086',
  border: '#E7DFD4',
  borderStrong: '#D3C7B6',

  primary: '#C2410C',
  primaryFg: '#FFFFFF',
  primarySoft: '#FCE9DD',
  primarySoftFg: '#9A3412',

  accent: '#0F766E',
  accentSoft: '#D9F2EF',

  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  info: '#1D4ED8',
  infoSoft: '#DBEAFE',

  rating: '#D97706',
  streak: '#EA580C',

  overlay: 'rgba(28, 25, 23, 0.45)',
  shadow: '#3B322A',

  chart: ['#C2410C', '#0F766E', '#B45309', '#4338CA', '#BE123C', '#4D7C0F'],
};

const dark: Palette = {
  bg: '#12100E',
  card: '#1C1917',
  subtle: '#272220',
  fg: '#F7F1E6',
  fgMuted: '#A79E93',
  fgSubtle: '#786F66',
  border: '#332C27',
  borderStrong: '#463D36',

  primary: '#F97316',
  primaryFg: '#1F1005',
  primarySoft: '#3A2011',
  primarySoftFg: '#FDBA74',

  accent: '#2DD4BF',
  accentSoft: '#0E2E2B',

  success: '#4ADE80',
  successSoft: '#0F2A19',
  warning: '#FBBF24',
  warningSoft: '#2E220A',
  danger: '#F87171',
  dangerSoft: '#331616',
  info: '#60A5FA',
  infoSoft: '#12203B',

  rating: '#FBBF24',
  streak: '#FB923C',

  overlay: 'rgba(0, 0, 0, 0.65)',
  shadow: '#000000',

  chart: ['#F97316', '#2DD4BF', '#FBBF24', '#818CF8', '#FB7185', '#A3E635'],
};

export const palettes: Record<ColorScheme, Palette> = { light, dark };

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
    1: { radius: 6, offset: 2, opacity: 0.06 },
    2: { radius: 14, offset: 5, opacity: 0.1 },
    3: { radius: 26, offset: 10, opacity: 0.14 },
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

/** Bottom-tab and header heights, kept here so screens can pad correctly. */
export const layout = {
  tabBarHeight: 60,
  headerHeight: 52,
  maxContentWidth: 720,
  bookCoverRatio: 2 / 3,
} as const;
