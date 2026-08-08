/**
 * Gradient presets for the Instagram-story style quote cards.
 *
 * These are design tokens, not data: the backend stores only the preset's `id`
 * on a quote, and the gradient itself lives here so a palette change ships with
 * the app rather than requiring a migration. They used to sit in the mock seed,
 * which meant deleting the mock would have taken the app's quote styling with
 * it.
 */

export interface QuoteBackground {
  id: string;
  /** Two stops, top-left to bottom-right. */
  colors: [string, string];
  /** Text colour that clears 4.5:1 against the midpoint of the gradient. */
  text: string;
}

export const QUOTE_BACKGROUNDS: readonly QuoteBackground[] = [
  { id: 'paper', colors: ['#F5EFE3', '#E7DACA'], text: '#2A231C' },
  { id: 'ember', colors: ['#C2410C', '#F97316'], text: '#FFF7ED' },
  { id: 'ink', colors: ['#16202E', '#3A4A61'], text: '#EEF3F9' },
  { id: 'sea', colors: ['#0F766E', '#2DD4BF'], text: '#04211F' },
  { id: 'plum', colors: ['#4C1D95', '#A78BFA'], text: '#F5F3FF' },
  { id: 'rose', colors: ['#9F1239', '#FB7185'], text: '#FFF1F2' },
  { id: 'moss', colors: ['#365314', '#A3E635'], text: '#F7FEE7' },
  { id: 'dusk', colors: ['#1E3A8A', '#60A5FA'], text: '#EFF6FF' },
] as const;

export const DEFAULT_QUOTE_BACKGROUND = QUOTE_BACKGROUNDS[0]!;

/** Falls back to `paper` for an id the app does not know. */
export function quoteBackground(id: string | null | undefined): QuoteBackground {
  return QUOTE_BACKGROUNDS.find((b) => b.id === id) ?? DEFAULT_QUOTE_BACKGROUND;
}
