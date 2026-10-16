// The columns style's pure helpers: no DOM, no Lit, tested with node:test.
import { setBool } from '../core/draft.ts';
import { choiceOptions, matchingOptions, SEARCH_ABOVE } from '../core/options.ts';
import type { FilterSection, FilterValue, FilterWords } from '../core/types.ts';
import { railRows, type RailRow } from './rail-logic.ts';

/** One row of a header's menu, with the value a tick on it leaves. */
export type ColumnRow = RailRow;

/** The columns style's fallback: the panel in cards view (there are no headers), else none. */
export function columnsFallback(ctx: { width: number; layout: 'table' | 'cards' }): string | null {
  return ctx.layout === 'cards' ? 'panel' : null;
}

/** The last two columns open their menus right-aligned, so the menu stays over the table. */
export function menuAtEnd(place: { index: number; of: number }): boolean {
  return place.index >= place.of - 2;
}

/**
 * Where a menu `width` wide goes, in window pixels: under its anchor, from the anchor's left edge,
 * or (at the end) ending at its right edge; kept 8 px inside a window `vw` wide.
 */
export function menuLeft(anchor: { left: number; right: number }, width: number, vw: number, end: boolean): number {
  const left = end ? anchor.right - width : anchor.left;
  return Math.max(8, Math.min(left, vw - 8 - width));
}

/**
 * How tall a menu may be, and whether it opens above its anchor: under it when 200 px or more are
 * free below in a window `vh` tall (or when there is more room below than above), at most 320 px
 * and at least 120 px, 14 px from the window's edge.
 */
export function menuRoom(anchor: { top: number; bottom: number }, vh: number): { up: boolean; max: number } {
  const below = vh - anchor.bottom - 14;
  const above = anchor.top - 14;
  const up = below < 200 && above > below;
  return { up, max: Math.max(120, Math.min(320, up ? above : below)) };
}

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

/**
 * A header menu's rows: a choice's options (and any picked value no longer offered, count 0),
 * after the typed search when the list is long enough to have one; a range's named ranges, one at
 * a time; a yes/no column's Yes and No, one at a time. A tick on a picked row unpicks it. None
 * for a range with no named ranges (it has the From and To boxes).
 */
export function columnRows(section: FilterSection, value: FilterValue, words: FilterWords, search: string): ColumnRow[] {
  if (section.kind === 'bool') {
    const v = value[section.key];
    return ([['yes', true, section.yes ?? words.yes], ['no', false, section.no ?? words.no]] as const).map(([key, b, label]) => ({
      value: key, label, on: v === b, round: true, next: setBool(value, section.key, v === b ? undefined : b),
    }));
  }
  const rows = railRows(section, value);
  if (section.kind !== 'choice' || section.options.length <= SEARCH_ABOVE || !search.trim()) return rows;
  const keep = new Set(matchingOptions(choiceOptions(section, value), search).map((o) => o.value));
  return rows.filter((r) => keep.has(r.value));
}
