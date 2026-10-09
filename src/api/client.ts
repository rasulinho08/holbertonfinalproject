import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { Endpoints } from './endpoints';
import { ApiError, type ApiErrorCode } from './errors';
import {
  clearTokens,
  emitSessionExpired,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './tokens';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type QueryValue = string | number | boolean | undefined | null | (string | number)[];

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** Set false for endpoints that must not send the bearer token. */
  auth?: boolean;
  signal?: AbortSignal;
}

/** Envelope the backend wraps every successful response in. */
interface SuccessEnvelope<T> {
  data: T;
  meta?: unknown;
}

interface ErrorEnvelope {
  error: { code: string; message: string; fields?: Record<string, string> };
}

/* --------------------------------- query --------------------------------- */

export function buildQueryString(query?: Record<string, QueryValue>): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      // Repeated keys rather than CSV: `?genres=novel&genres=poetry`
      value.forEach((v) => params.append(key, String(v)));
    } else {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/* --------------------------------- core ---------------------------------- */

/**
 * How a refresh attempt ended. Only `rejected` — the server looked at the
 * refresh token and said no — means the session is over. `unreachable` (no
 * network, a timeout, a 5xx while the free-tier host wakes up) must not sign
 * the reader out: their tokens are still good, the server just did not answer.
 */
type RefreshOutcome = 'ok' | 'rejected' | 'unreachable';

let refreshInFlight: Promise<RefreshOutcome> | null = null;

/**
 * Refreshes the access token. Concurrent 401s share one refresh call so a
 * screen firing five queries does not trigger five token rotations.
 */
async function refreshSession(): Promise<RefreshOutcome> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async (): Promise<RefreshOutcome> => {
    const refresh = getRefreshToken();
    if (!refresh) return 'rejected';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${API_BASE_URL}${Endpoints.auth.refresh}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
        signal: controller.signal,
      });
      if (res.status === 429 || res.status >= 500) return 'unreachable';
      if (!res.ok) return 'rejected';
      const json = (await res.json()) as SuccessEnvelope<{
        accessToken: string;
        refreshToken: string;
      }>;
      await setTokens(json.data.accessToken, json.data.refreshToken);
      return 'ok';
    } catch {
      return 'unreachable';
    } finally {
      clearTimeout(timeout);
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function mapStatusToCode(status: number, raw?: string): ApiErrorCode {
  const known: ApiErrorCode[] = [
    'VALIDATION_ERROR',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'CONFLICT',
    'OUT_OF_STOCK',
    'INVALID_CREDENTIALS',
    'USERNAME_TAKEN',
    'EMAIL_TAKEN',
    'TWO_FACTOR_REQUIRED',
    'RATE_LIMITED',
    'PAYMENT_FAILED',
    'SERVER_ERROR',
  ];
  if (raw && (known as string[]).includes(raw)) return raw as ApiErrorCode;

  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 422) return 'VALIDATION_ERROR';
  if (status === 429) return 'RATE_LIMITED';
  return 'SERVER_ERROR';
}

async function httpRequest<T>(path: string, options: RequestOptions, retry = true): Promise<T> {
  const { method = 'GET', body, query, auth = true, signal } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  // Propagate an externally supplied abort (React Query cancellation).
  signal?.addEventListener('abort', () => controller.abort(), { once: true });

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getAccessToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}${buildQueryString(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const aborted = (err as Error)?.name === 'AbortError';
    throw new ApiError(
      aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
      aborted ? 'Request timed out' : 'Network request failed',
      0,
    );
  }
  clearTimeout(timeout);

  if (response.status === 204) return undefined as T;

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    // One transparent refresh-and-retry on 401, then give up and sign out.
    // Without any stored session (a guest) there is nothing to refresh or to
    // sign out of: emitting "session expired" there used to trigger one
    // logout call per failed request.
    if (response.status === 401 && auth && retry && (getAccessToken() || getRefreshToken())) {
      const outcome = await refreshSession();
      if (outcome === 'ok') return httpRequest<T>(path, options, false);
      if (outcome === 'unreachable') {
        throw new ApiError('NETWORK_ERROR', 'Network request failed', 0);
      }
      await clearTokens();
      emitSessionExpired();
    }

    const envelope = payload as ErrorEnvelope | null;
    throw new ApiError(
      mapStatusToCode(response.status, envelope?.error?.code),
      envelope?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      envelope?.error?.fields,
    );
  }

  const envelope = payload as SuccessEnvelope<T> | null;
  if (!envelope || !('data' in envelope)) {
    // Endpoints that return a bare object are tolerated, but the documented
    // contract is always `{ data, meta? }`.
    return payload as T;
  }

  // List endpoints are typed as `Paginated<T>` — the hooks read `meta.hasMore`
  // to drive infinite scroll — so the envelope has to survive when it carries
  // `meta`, and be unwrapped when it does not.
  //
  // The mock returns `{ data, meta }` directly and never went through this
  // unwrapping, so the two paths disagreed and every paginated screen broke
  // the moment a real backend answered: `last.meta` was undefined.
  if (envelope.meta !== undefined) {
    return { data: envelope.data, meta: envelope.meta } as T;
  }

  return envelope.data as T;
}

/* --------------------------------- api ----------------------------------- */

/**
 * The single entry point for data access.
 *
 * Every screen reaches the backend through here, via the hooks in `hooks/`.
 * Nothing else in `src/` calls `fetch` directly, which is what keeps token
 * refresh, error normalisation and the response envelope in one place.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return httpRequest<T>(path, options);
}

export const api = {
  get: <T>(path: string, query?: Record<string, QueryValue>, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'GET', query }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};
