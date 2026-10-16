// The panel's pure helpers: no DOM, no Lit, tested with node:test.
import { chipsOf, defaultFilterWords } from '../core/summary.ts';
import type { FilterOption, FilterRange, FilterSection, FilterValue, FilterWords } from '../core/types.ts';

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
