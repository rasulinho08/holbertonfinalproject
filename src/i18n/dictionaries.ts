import { az, type Dictionary } from './az';
import { en } from './en';

export type Locale = 'az' | 'en';

export const LOCALES: readonly Locale[] = ['az', 'en'];

export const dictionaries = { az, en } as const;

/** BCP-47 tags used by Intl for number/date formatting. */
export const intlTags: Record<Locale, string> = {
  az: 'az-AZ',
  en: 'en-GB',
};

/**
 * Dot-notation union of every leaf in the dictionary, e.g. `'book.addToShelf'`.
 * A typo in `t('book.addToShelff')` fails to compile.
 */
export type TranslationKey = Leaves<Dictionary>;

type Leaves<T, P extends string = ''> = T extends string
  ? P
  : {
      [K in keyof T & string]: Leaves<T[K], P extends '' ? K : `${P}.${K}`>;
    }[keyof T & string];

export type { Dictionary };
