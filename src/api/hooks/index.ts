/**
 * The only API surface screens are allowed to import.
 *
 * Screens never touch `client.ts`, `endpoints.ts` or the mock directly — they
 * call hooks. That is what makes swapping the mock for the real backend a
 * zero-diff change in `app/`.
 */
export * from './books';
export * from './commerce';
export * from './engagement';
export * from './management';
export * from './shelves';
export * from './social';
