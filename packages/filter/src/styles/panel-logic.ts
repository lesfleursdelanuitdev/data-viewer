// The panel's pure helpers: no DOM, no Lit, tested with node:test.
import { chipsOf, defaultFilterWords } from '../core/summary.ts';
import type { FilterRange, FilterSection, FilterValue, FilterWords } from '../core/types.ts';

// Moved to core/options.ts (bar and rail use it too); still exported from here.
export { choiceOptions } from '../core/options.ts';

/** A single-choice section with 5 options or fewer is a segmented control; any other choice is chips. */
export function useSeg(section: FilterSection): boolean {
  return section.kind === 'choice' && Boolean(section.single) && section.options.length <= 5;
}

/** The primary button: "Show 12 results", "Show 1 result", "Nothing matches", or "Show results" while the count is unknown. */
export function showLabel(count: number | null, words: FilterWords): string {
  return count === null ? words.showResultsUnknown : count === 0 ? words.noResults : words.showResults(count);
}

/** The number on the button's badge: one per applied chip (a value no longer offered included). */
export function appliedCount(sections: FilterSection[], value: FilterValue): number {
  return chipsOf(sections, value, defaultFilterWords).length;
}

const end = (s: string | undefined, missing: number) => {
  const n = s === undefined || s.trim() === '' ? NaN : Number(s);
  return Number.isFinite(n) ? n : missing;
};

/**
 * The histogram's 12 bars: a height in px (40 for the tallest, at least 3) and whether it is
 * "on": it has rows and its bucket meets the drafted range (every bar with rows when no range is
 * drafted). Bucket i holds [from + i·w, from + (i+1)·w); the last also holds `to`.
 */
export function histogramBars(section: FilterSection, range: FilterRange | undefined): { height: number; on: boolean }[] {
  if (section.kind !== 'range' || !section.histogram) return [];
  const { from, to, buckets } = section.histogram;
  const lo = end(range?.from, -Infinity);
  const hi = end(range?.to, Infinity);
  const w = (to - from) / buckets.length;
  const max = Math.max(1, ...buckets);
  return buckets.map((n, i) => {
    const a = from + i * w;
    const b = i === buckets.length - 1 ? to : from + (i + 1) * w;
    const meets = a <= hi && (i === buckets.length - 1 ? b >= lo : b > lo);
    return { height: Math.max(3, Math.round((n / max) * 40)), on: n > 0 && meets };
  });
}

/**
 * The panel's left edge in the window, `width` px wide, for a trigger at `trigger` in a list at
 * `list`, in a window `vw` wide: under the trigger's left edge, or right-aligned to the trigger
 * when the trigger's middle is in the list's right half (it then sits at the bar's right end, and
 * a left-aligned 400 px panel would hang past the list). Always 8 px inside the window.
 */
export function panelLeft(trigger: { left: number; right: number }, list: { left: number; right: number }, width: number, vw: number): number {
  const end = (trigger.left + trigger.right) / 2 > (list.left + list.right) / 2;
  const left = end ? trigger.right - width : trigger.left;
  return Math.max(8, Math.min(left, vw - 8 - width));
}
