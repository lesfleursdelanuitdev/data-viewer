// Option lists and their typed search, with no DOM and no Lit: shared by today's dialog
// (render-sections.ts) and the filter styles.
import type { FilterOption, FilterSection, FilterValue } from './types.ts';

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

/**
 * A choice section's options, then the picked values it no longer offers (a bookmarked
 * "Cactus"), with count 0, so they show as picked and can be unpicked.
 */
export function choiceOptions(section: Extract<FilterSection, { kind: 'choice' }>, draft: FilterValue): FilterOption[] {
  const v = draft[section.key];
  const known = new Set(section.options.map((o) => o.value));
  const gone = (Array.isArray(v) ? v : []).filter((x) => !known.has(x));
  return gone.length ? [...section.options, ...gone.map((value) => ({ value, count: 0 }))] : section.options;
}

/** A choice with more than SEARCH_ABOVE options gets a search box at the top of its menu. */
export function searchable(section: FilterSection): boolean {
  return section.kind === 'choice' && section.options.length > SEARCH_ABOVE;
}
