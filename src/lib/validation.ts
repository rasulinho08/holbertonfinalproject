import type { TranslationKey } from '@/i18n';

/**
 * Form validation.
 *
 * Rules return a translation key rather than a message, so a validated form
 * renders correctly in both AZ and EN without re-validating on locale change.
 */

export type FieldError = TranslationKey | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Azerbaijani mobile numbers, with or without the country prefix. */
const PHONE_RE = /^(\+994|0)(10|50|51|55|60|70|77|99)\d{7}$/;

export function required(value: string): FieldError {
  return value.trim().length === 0 ? 'errors.required' : null;
}

export function email(value: string): FieldError {
  if (!value.trim()) return 'errors.required';
  return EMAIL_RE.test(value.trim()) ? null : 'errors.invalidEmail';
}

export function password(value: string): FieldError {
  if (!value) return 'errors.required';
  return value.length >= 8 ? null : 'errors.passwordTooShort';
}

export function passwordsMatch(a: string, b: string): FieldError {
  if (!b) return 'errors.required';
  return a === b ? null : 'errors.passwordsDoNotMatch';
}

export function phone(value: string): FieldError {
  const cleaned = value.replace(/[\s()-]/g, '');
  if (!cleaned) return 'errors.required';
  return PHONE_RE.test(cleaned) ? null : 'errors.invalidPhone';
}

export function username(value: string): FieldError {
  const cleaned = value.trim();
  if (!cleaned) return 'errors.required';
  return /^[a-z0-9_]{3,20}$/.test(cleaned) ? null : 'errors.invalidUsername';
}

export function maxLength(value: string, limit: number): FieldError {
  return value.length > limit ? 'errors.tooLong' : null;
}

/** True when every field in the map validated cleanly. */
export function isValid(errors: Record<string, FieldError>): boolean {
  return Object.values(errors).every((e) => e === null);
}
