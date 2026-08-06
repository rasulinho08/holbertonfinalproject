import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { StorageKeys } from '@/lib/storage';
import type { Locale } from '@/i18n/dictionaries';

export type ThemeMode = 'system' | 'light' | 'dark';

interface PrefsState {
  themeMode: ThemeMode;
  locale: Locale;
  /** Set once the onboarding quiz has been completed or skipped. */
  onboardingDone: boolean;
  /** Reduce animation + heavy imagery on slow connections. */
  dataSaver: boolean;
  /** Blur spoiler-tagged review bodies until tapped. */
  hideSpoilers: boolean;
  /** Rehydration flag so the UI can hold the splash until prefs are known. */
  hydrated: boolean;

  setThemeMode: (mode: ThemeMode) => void;
  setLocale: (locale: Locale) => void;
  setOnboardingDone: (done: boolean) => void;
  setDataSaver: (on: boolean) => void;
  setHideSpoilers: (on: boolean) => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      locale: (process.env.EXPO_PUBLIC_DEFAULT_LOCALE as Locale) ?? 'az',
      onboardingDone: false,
      dataSaver: false,
      hideSpoilers: true,
      hydrated: false,

      setThemeMode: (themeMode) => set({ themeMode }),
      setLocale: (locale) => set({ locale }),
      setOnboardingDone: (onboardingDone) => set({ onboardingDone }),
      setDataSaver: (dataSaver) => set({ dataSaver }),
      setHideSpoilers: (hideSpoilers) => set({ hideSpoilers }),
    }),
    {
      name: StorageKeys.prefs,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ themeMode, locale, onboardingDone, dataSaver, hideSpoilers }) => ({
        themeMode,
        locale,
        onboardingDone,
        dataSaver,
        hideSpoilers,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setThemeMode(state.themeMode);
        usePrefs.setState({ hydrated: true });
      },
    },
  ),
);
