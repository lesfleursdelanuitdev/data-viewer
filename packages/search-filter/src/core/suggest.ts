// What the listbox offers for the typed text: the search rows, then the filters it matches, by
// section (S2-D4: named ranges like choices, ≤ n / ≥ n for a typed number, yes / no for bools).
import { choiceOptions, matchingOptions, rangePressed, SEARCH_ABOVE, setBool, setRange, toggleOption } from '@lesfleursdelanuitdev/filter/parts';
import type { FilterSection, FilterStyleSearch, FilterValue, FilterWords } from '@lesfleursdelanuitdev/filter/parts';
import type { SearchFilterWords } from './words.ts';

/** One row of the listbox: search the text (in every column or one), or apply a filter (`next`). */
export type Suggestion =
  | { kind: 'text'; searchIn: string; label: string; count: number | null }
  | { kind: 'filter'; section: string; group: string; op: string; label: string; count?: number; next: FilterValue };

type Range = Extract<FilterSection, { kind: 'range' }>;

/** A typed number ("7", "7,5"), or null. */
function numberOf(typed: string): number | null {
  const t = typed.trim();
  if (!t) return null;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Whether the typed text finds `label` (case and accents don't matter; no text finds all). */
const finds = (label: string, typed: string) => matchingOptions([{ value: label }], typed).length > 0;

function rangeItems(s: Range, value: FilterValue, typed: string, words: SearchFilterWords): Suggestion[] {
  const set = value[s.key];
  const current = set && typeof set === 'object' && !Array.isArray(set) ? set : {};
  const item = (label: string, next: FilterValue, count?: number): Suggestion =>
    ({ kind: 'filter', section: s.key, group: s.label, op: s.label, label, ...(count === undefined ? {} : { count }), next });
  const out = (s.ranges ?? [])
    .filter((r) => !rangePressed(r, current) && finds(r.label, typed))
    .map((r) => item(r.label, setRange(value, s.key, r.from, r.to), r.count));
  const n = numberOf(typed);
  if (n !== null && s.type !== 'date') {
    const text = String(n);
    out.push(item(words.atMost(text), setRange(value, s.key, undefined, text)), item(words.atLeast(text), setRange(value, s.key, text, undefined)));
  }
  return out;
}

/**
 * The listbox for `typed`. `text`: "Search for “q”" (every column), then one "Name has “q”" per
 * "Search in" field, each counted with `search.typedCount`; none for no text. `groups`: by
 * section, in order, the options the text finds that aren't picked, the named ranges it finds
 * that aren't set, ≤ / ≥ for a typed number (number and money ranges), and yes / no when the
 * text finds a bool's label (the one set left out); at most SEARCH_ABOVE each, empty groups left
 * out. No text lists every group.
 */
export function suggest(
  sections: FilterSection[], value: FilterValue, search: FilterStyleSearch, typed: string, words: SearchFilterWords & FilterWords,
): { text: Suggestion[]; groups: { label: string; items: Suggestion[] }[] } {
  const q = typed.trim();
  const text: Suggestion[] = q
    ? [
      { kind: 'text', searchIn: '', label: words.searchFor(q), count: search.typedCount },
      ...search.fields.map((f): Suggestion => ({ kind: 'text', searchIn: f.key, label: `${f.label} ${words.has} “${q}”`, count: search.typedCount })),
    ]
    : [];
  const groups: { label: string; items: Suggestion[] }[] = [];
  for (const s of sections) {
    let items: Suggestion[];
    if (s.kind === 'choice') {
      const v = value[s.key];
      const picked = new Set(Array.isArray(v) ? v : []);
      items = matchingOptions(choiceOptions(s, value).filter((o) => !picked.has(o.value)), q).map((o): Suggestion => ({
        kind: 'filter', section: s.key, group: s.label, op: `${s.label} ${words.is}`, label: o.label ?? o.value,
        ...(o.count === undefined ? {} : { count: o.count }), next: toggleOption(value, s, o.value),
      }));
    } else if (s.kind === 'range') {
      items = rangeItems(s, value, q, words);
    } else {
      items = !finds(s.label, q) ? [] : ([true, false] as const)
        .filter((b) => value[s.key] !== b)
        .map((b): Suggestion => ({
          kind: 'filter', section: s.key, group: s.label, op: s.label,
          label: b ? s.yes ?? words.yes : s.no ?? words.no, next: setBool(value, s.key, b),
        }));
    }
    if (items.length) groups.push({ label: s.label, items: items.slice(0, SEARCH_ABOVE) });
  }
  return { text, groups };
}
