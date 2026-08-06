import { intlTags, type Locale } from '@/i18n/dictionaries';

/**
 * Formatting helpers. Everything money-related goes through `formatPrice` so a
 * currency change is one edit, and every date goes through the helpers below so
 * AZ and EN render consistently.
 */

export const CURRENCY = 'AZN';

/** The manat sign. Written out rather than relying on ICU currency data. */
export const CURRENCY_SYMBOL = '₼';

const priceCache = new Map<string, Intl.NumberFormat>();

function priceFormatter(locale: Locale) {
  const tag = intlTags[locale];
  let fmt = priceCache.get(tag);
  if (!fmt) {
    // Deliberately formatted as a plain decimal with the symbol appended:
    // `style: 'currency'` renders "AZN 14.90" in most browsers and in the
    // trimmed ICU that ships with Hermes, which is not how prices are written
    // in Azerbaijan.
    fmt = new Intl.NumberFormat(tag, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    priceCache.set(tag, fmt);
  }
  return fmt;
}

/** `formatPrice(14.9, 'az')` -> "14,90 ₼" */
export function formatPrice(amount: number, locale: Locale = 'az'): string {
  try {
    return `${priceFormatter(locale).format(amount)} ${CURRENCY_SYMBOL}`;
  } catch {
    return `${amount.toFixed(2)} ${CURRENCY_SYMBOL}`;
  }
}

/** Compact counts for social metrics: 1200 -> "1.2K". */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

/**
 * Azerbaijani month abbreviations, written out on purpose.
 *
 * Chrome and the Hermes ICU both render `month: 'short'` for `az-AZ` as
 * "M12" rather than a month name, which looks broken in the UI.
 */
const AZ_MONTHS_SHORT = [
  'yan',
  'fev',
  'mar',
  'apr',
  'may',
  'iyn',
  'iyl',
  'avq',
  'sen',
  'okt',
  'noy',
  'dek',
];

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(iso: string, locale: Locale = 'az'): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  if (locale === 'az') {
    return `${pad(d.getDate())} ${AZ_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  }

  try {
    return new Intl.DateTimeFormat(intlTags[locale], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function formatDateTime(iso: string, locale: Locale = 'az'): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  if (locale === 'az') {
    return `${pad(d.getDate())} ${AZ_MONTHS_SHORT[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  try {
    return new Intl.DateTimeFormat(intlTags[locale], {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "3 gün əvvəl" / "3 days ago". Falls back to an absolute date if Intl is thin. */
export function formatRelative(iso: string, locale: Locale = 'az'): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffSeconds = (d.getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSeconds);

  try {
    const rtf = new Intl.RelativeTimeFormat(intlTags[locale], { numeric: 'auto' });
    for (const [unit, seconds] of RELATIVE_UNITS) {
      if (abs >= seconds) return rtf.format(Math.round(diffSeconds / seconds), unit);
    }
    return rtf.format(Math.round(diffSeconds), 'second');
  } catch {
    return formatDate(iso, locale);
  }
}

/** Percentage of a book read, clamped so bad data can't overflow a progress bar. */
export function readingPercent(page: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((page / total) * 100)));
}

/** "978-9952-8-1234-5" -> readable grouping, tolerant of missing dashes. */
export function formatIsbn(isbn: string): string {
  const digits = isbn.replace(/[^0-9Xx]/g, '');
  if (digits.length !== 13) return isbn;
  return `${digits.slice(0, 3)}-${digits.slice(3, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/** Two-letter monogram for avatar fallbacks. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Azerbaijani mobile numbers, normalised to +994XXXXXXXXX. */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('994')) return `+${digits}`;
  if (digits.startsWith('0')) return `+994${digits.slice(1)}`;
  return `+994${digits}`;
}
