// The columns style's pure helpers: no DOM, no Lit, tested with node:test.
import type { FilterWords } from '../core/types.ts';

/** The columns style's fallback: the panel in cards view (there are no headers), else none. */
export function columnsFallback(ctx: { width: number; layout: 'table' | 'cards' }): string | null {
  return ctx.layout === 'cards' ? 'panel' : null;
}

/** The last two columns open their menus right-aligned, so the menu stays over the table. */
export function menuAtEnd(place: { index: number; of: number }): boolean {
  return place.index >= place.of - 2;
}

// Moved to parts/place-menu.ts (the sentence's menus are placed the same way); still exported from here.
export { menuLeft, menuRoom } from '../parts/place-menu.ts';

// Moved to core/summary.ts (bar and rail use anySet beside it); still exported from here.
export { filteredCount } from '../core/summary.ts';

/**
 * The line above the table: "5 of 12 · 1 column filtered"; "All 12 results" with nothing set;
 * "4 results" when only a search narrows the list; "7 results · 1 column filtered" in server mode
 * (no total before filters); '' while the number is not known.
 */
export function columnsSummary(results: number | null, total: number | null, k: number, w: FilterWords): string {
  if (results === null) return '';
  if (!k) return total !== null && results === total ? w.allResults(total) : w.resultsCount(results);
  return `${total === null ? w.resultsCount(results) : w.resultsOf(results, total)} · ${w.columnsFiltered(k)}`;
}

// Moved to core/rows.ts (the shared check menu uses it); still exported from here.
export { columnRows, type ColumnRow } from '../core/rows.ts';
