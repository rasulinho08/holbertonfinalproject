import { API_BASE_URL, REQUEST_TIMEOUT_MS, USE_MOCK_API } from './config';
import { Endpoints } from './endpoints';
import { ApiError, type ApiErrorCode } from './errors';
import { handleMockRequest } from './mock/handlers';
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

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Refreshes the access token. Concurrent 401s share one refresh call so a
 * screen firing five queries does not trigger five token rotations.
 */
async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return false;
    try {
      const res = await fetch(`${API_BASE_URL}${Endpoints.auth.refresh}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) return false;
      const json = (await res.json()) as SuccessEnvelope<{
        accessToken: string;
        refreshToken: string;
      }>;
      await setTokens(json.data.accessToken, json.data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
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
    if (response.status === 401 && auth && retry) {
      const refreshed = await refreshSession();
      if (refreshed) return httpRequest<T>(path, options, false);
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
  // Endpoints that return a bare object are tolerated, but the documented
  // contract is always `{ data, meta? }`.
  return (envelope && 'data' in envelope ? envelope.data : (payload as T)) as T;
}

/* --------------------------------- api ----------------------------------- */

/**
 * The single entry point for data access.
 *
 * When `USE_MOCK_API` is on, requests are served by `mock/handlers.ts` instead
 * of the network — same paths, same shapes, same errors.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (USE_MOCK_API) return handleMockRequest<T>(path, options);
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
