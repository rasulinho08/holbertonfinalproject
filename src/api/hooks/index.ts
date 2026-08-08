/**
 * The only API surface screens are allowed to import.
 *
 * Screens never touch `client.ts` or `endpoints.ts` directly — they call
 * hooks. One module per resource knows its endpoints, so a route rename is one
 * edit here rather than a search across 40 screens.
 */
export * from './books';
export * from './commerce';
export * from './engagement';
export * from './management';
export * from './reading';
export * from './shelves';
export * from './social';
