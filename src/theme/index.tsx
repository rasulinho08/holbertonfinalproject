import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { usePrefs } from '@/store/prefs';
import {
  elevation,
  fonts,
  layout,
  motion,
  radius,
  spacing,
  themes,
  typography,
  type ColorScheme,
  type Palette,
  type ThemeName,
} from './tokens';

export * from './tokens';

export interface Theme {
  scheme: ColorScheme;
  name: ThemeName;
  isDark: boolean;
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  fonts: typeof fonts;
  layout: typeof layout;
  motion: typeof motion;
  /**
   * True when the reader has asked for less motion (explicitly, or implicitly
   * via data saver). Animated components collapse to an instant state change
   * rather than branching on two prefs each.
   */
  reduceMotion: boolean;
  /** `theme.elevation(2)` — platform-correct shadow at the theme's shadow colour. */
  elevation: (level: 0 | 1 | 2 | 3) => object;
  /** `theme.duration(motion.base)` — 0 when motion is reduced. */
  duration: (ms: number) => number;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const mode = usePrefs((s) => s.themeMode);
  const themeName = usePrefs((s) => s.themeName);
  const dataSaver = usePrefs((s) => s.dataSaver);
  const reduceMotionPref = usePrefs((s) => s.reduceMotion);

  const scheme: ColorScheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const reduceMotion = reduceMotionPref || dataSaver;

  const value = useMemo<Theme>(() => {
    const colors = (themes[themeName] ?? themes.ink)[scheme];
    return {
      scheme,
      name: themeName,
      isDark: scheme === 'dark',
      colors,
      spacing,
      radius,
      typography,
      fonts,
      layout,
      motion,
      reduceMotion,
      elevation: (level) => elevation(level, colors.shadow) ?? {},
      duration: (ms) => (reduceMotion ? 0 : ms),
    };
  }, [scheme, themeName, reduceMotion]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside <ThemeProvider>');
  return theme;
}

/**
 * Declare theme-aware styles once, next to the component, and get a hook back.
 *
 *   const useStyles = makeStyles((t) => ({
 *     card: { backgroundColor: t.colors.card, padding: t.spacing.lg },
 *   }));
 *
 *   function Card() { const s = useStyles(); ... }
 *
 * Styles are memoised per colour scheme, so switching themes re-creates them
 * exactly once rather than on every render.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T) {
  const cache = new Map<string, T>();
  return function useStyles(): T {
    const theme = useTheme();
    // Keyed on every input the factory can read, so switching accent theme or
    // toggling reduced motion rebuilds the sheet instead of serving a stale one.
    const key = `${theme.name}:${theme.scheme}:${theme.reduceMotion ? 'still' : 'motion'}`;
    return useMemo(() => {
      const cached = cache.get(key);
      if (cached) return cached;
      const created = StyleSheet.create(factory(theme));
      cache.set(key, created);
      return created;
    }, [theme, key]);
  };
}
