/**
 * Colour presets for the quote cards.
 *
 * These are design tokens, not data: the backend stores only the preset's `id`
 * on a quote, and the colours live here so a palette change ships with the
 * app rather than requiring a migration.
 *
 * The stops are deliberately close in value: a quote is read, so the card
 * should feel like a printed page in a colour, not a poster. Every preset was
 * checked against both stops: `text` and `muted` clear 4.5:1 (sea's muted sits
 * at 4.54), and `accent`, used for the opening quote mark and the book title,
 * clears 4.5:1 too.
 */

export interface QuoteBackground {
  id: string;
  /** Two stops, top-left to bottom-right. */
  colors: [string, string];
  /** The quote itself. */
  text: string;
  /** Attribution: author, page, the reader who shared it. */
  muted: string;
  /** The opening quote mark and the book title. */
  accent: string;
}

export const QUOTE_BACKGROUNDS: readonly QuoteBackground[] = [
  { id: 'paper', colors: ['#FBF6EC', '#F1E6D3'], text: '#2B2118', muted: '#6B5A48', accent: '#A8360A' },
  { id: 'ember', colors: ['#7C2A0A', '#9C3A0E'], text: '#FFF4EA', muted: '#F8D9C4', accent: '#FFC59E' },
  { id: 'ink', colors: ['#141B2B', '#25324A'], text: '#F1F4FA', muted: '#AAB6CC', accent: '#F2A76B' },
  { id: 'sea', colors: ['#0D4A47', '#14615C'], text: '#EFFAF8', muted: '#A6D6D0', accent: '#7FE0D2' },
  { id: 'plum', colors: ['#3B1F4E', '#553069'], text: '#F7F0FB', muted: '#CDB6DD', accent: '#E9B7F2' },
  { id: 'rose', colors: ['#7A2338', '#953047'], text: '#FFF1F3', muted: '#F2BFCA', accent: '#FFC2CF' },
  { id: 'moss', colors: ['#2F3F1E', '#43572A'], text: '#F5F9EC', muted: '#C3D2A8', accent: '#D8EC9A' },
  { id: 'dusk', colors: ['#1F2F57', '#2E447A'], text: '#EEF3FF', muted: '#B3C2E6', accent: '#AFC4FF' },
] as const;

export const DEFAULT_QUOTE_BACKGROUND = QUOTE_BACKGROUNDS[0]!;

/** Falls back to `paper` for an id the app does not know. */
export function quoteBackground(id: string | null | undefined): QuoteBackground {
  return QUOTE_BACKGROUNDS.find((b) => b.id === id) ?? DEFAULT_QUOTE_BACKGROUND;
}
