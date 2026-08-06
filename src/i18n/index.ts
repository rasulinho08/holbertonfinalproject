import { useCallback, useMemo } from 'react';
import { usePrefs } from '@/store/prefs';
import { dictionaries, intlTags, type Locale, type TranslationKey } from './dictionaries';

export type { Locale, TranslationKey };
export { LOCALES } from './dictionaries';

export type TranslateParams = Record<string, string | number>;
export type Translate = (key: TranslationKey, params?: TranslateParams) => string;

function lookup(locale: Locale, key: string): string | undefined {
  let node: unknown = dictionaries[locale];
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Locale-independent translator, for use outside React (validators, stores). */
export function translate(locale: Locale, key: TranslationKey, params?: TranslateParams): string {
  // Fall back to Azerbaijani, then to the raw key, so a missing string is
  // visible in development but never crashes a screen.
  const template = lookup(locale, key) ?? lookup('az', key) ?? key;
  return interpolate(template, params);
}

/**
 * The hook every screen uses.
 *
 *   const { t, locale, setLocale } = useI18n();
 *   <Text>{t('book.addToShelf')}</Text>
 *   <Text>{t('shelf.booksCount', { count: 12 })}</Text>
 */
export function useI18n() {
  const locale = usePrefs((s) => s.locale);
  const setLocale = usePrefs((s) => s.setLocale);

  const t = useCallback<Translate>(
    (key, params) => translate(locale, key, params),
    [locale],
  );

  return useMemo(
    () => ({ t, locale, setLocale, intlTag: intlTags[locale] }),
    [t, locale, setLocale],
  );
}

/** Shorthand when a component only needs the translator. */
export function useT(): Translate {
  return useI18n().t;
}
