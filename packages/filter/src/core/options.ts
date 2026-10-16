// Option lists and their typed search, with no DOM and no Lit: shared by today's dialog
// (render-sections.ts) and the filter styles.
import type { FilterOption } from './types.ts';

/** Lists longer than this get a search box above them. */
export const SEARCH_ABOVE = 8;

// For matching typed text: case and accents don't matter ("cafe" finds "Café").
const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();

/** The options a typed search leaves (all of them for no text), by label, value or description. */
export function matchingOptions(options: FilterOption[], text: string): FilterOption[] {
  const q = fold(text.trim());
  if (!q) return options;
  return options.filter((o) => fold(`${o.label ?? o.value}\n${o.description ?? ''}`).includes(q));
}
