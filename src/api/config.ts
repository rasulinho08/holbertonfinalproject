/**
 * Decides, once at startup, whether the app talks to the real backend or to the
 * bundled mock API.
 *
 * This is the whole integration switch: when the backend repository is running,
 * set EXPO_PUBLIC_API_BASE_URL and EXPO_PUBLIC_USE_MOCK_API=false in `.env.local`
 * and every screen keeps working unchanged.
 */

const rawBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim();
const forceMock = (process.env.EXPO_PUBLIC_USE_MOCK_API ?? 'true').toLowerCase() === 'true';

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

/** True when no backend URL is configured, or mocks are explicitly forced. */
export const USE_MOCK_API = forceMock || API_BASE_URL.length === 0;

export const MOCK_LATENCY_MS = Number(process.env.EXPO_PUBLIC_MOCK_LATENCY_MS ?? 320);

/** Requests give up after this long so a dead backend cannot hang a screen. */
export const REQUEST_TIMEOUT_MS = 15_000;

export const DEFAULT_PAGE_SIZE = 20;

export const API_VERSION = 'v1';
