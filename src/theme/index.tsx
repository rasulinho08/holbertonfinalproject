import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { usePrefs } from '@/store/prefs';
import {
  elevation,
  fonts,
  layout,
  palettes,
  radius,
  spacing,
  typography,
  type ColorScheme,
  type Palette,
} from './tokens';

export * from './tokens';

export interface Theme {
  scheme: ColorScheme;
  isDark: boolean;
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  fonts: typeof fonts;
  layout: typeof layout;
  /** `theme.elevation(2)` — platform-correct shadow at the theme's shadow colour. */
  elevation: (level: 0 | 1 | 2 | 3) => object;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const mode = usePrefs((s) => s.themeMode);

  const scheme: ColorScheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo<Theme>(() => {
    const colors = palettes[scheme];
    return {
      scheme,
      isDark: scheme === 'dark',
      colors,
      spacing,
      radius,
      typography,
      fonts,
      layout,
      elevation: (level) => elevation(level, colors.shadow) ?? {},
    };
  }, [scheme]);

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
  const cache = new Map<ColorScheme, T>();
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => {
      const cached = cache.get(theme.scheme);
      if (cached) return cached;
      const created = StyleSheet.create(factory(theme));
      cache.set(theme.scheme, created);
      return created;
    }, [theme]);
  };
}
