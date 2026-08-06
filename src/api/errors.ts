import type { TranslationKey } from '@/i18n';

/**
 * Error codes the backend returns in `{ error: { code, message } }`.
 * Documented in `backend-guide/CONVENTIONS.md`.
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'OUT_OF_STOCK'
  | 'INVALID_CREDENTIALS'
  | 'USERNAME_TAKEN'
  | 'EMAIL_TAKEN'
  | 'TWO_FACTOR_REQUIRED'
  | 'RATE_LIMITED'
  | 'PAYMENT_FAILED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'SERVER_ERROR';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  /** Field-level messages from a 422, keyed by field name. */
  readonly fields?: Record<string, string>;

  constructor(
    code: ApiErrorCode,
    message: string,
    status = 500,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }

  /** True when retrying the same request could plausibly succeed. */
  get isRetryable(): boolean {
    return (
      this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT' || this.code === 'SERVER_ERROR'
    );
  }
}

const CODE_TO_KEY: Partial<Record<ApiErrorCode, TranslationKey>> = {
  NETWORK_ERROR: 'errors.network',
  TIMEOUT: 'errors.network',
  NOT_FOUND: 'errors.notFound',
  UNAUTHORIZED: 'errors.unauthorized',
  FORBIDDEN: 'errors.forbidden',
  INVALID_CREDENTIALS: 'errors.invalidCredentials',
  USERNAME_TAKEN: 'errors.usernameTaken',
  OUT_OF_STOCK: 'errors.outOfStock',
};

/**
 * Maps an unknown thrown value to a translation key, so screens can surface a
 * localized message without knowing anything about the transport.
 */
export function errorMessageKey(error: unknown): TranslationKey {
  if (error instanceof ApiError) return CODE_TO_KEY[error.code] ?? 'errors.generic';
  return 'errors.generic';
}

/** Server-supplied message when it is user-facing, else null. */
export function serverMessage(error: unknown): string | null {
  if (error instanceof ApiError && error.status < 500 && error.message) return error.message;
  return null;
}
