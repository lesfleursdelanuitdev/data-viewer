// Check rows of a section, with the value a tick on each leaves: pure, no DOM, no Lit. Shared by
// the rail, the views builder and the shared check menu (columns, sentence).
import { setBool, setRange, toggleOption } from './draft.ts';
import { choiceOptions, matchingOptions, SEARCH_ABOVE } from './options.ts';
import { rangeOf, rangePressed } from './range.ts';
import type { FilterSection, FilterValue, FilterWords } from './types.ts';

/** One check row in the rail, with the value a tick on it leaves. */
export type RailRow = { value: string; label: string; count?: number; on: boolean; round: boolean; next: FilterValue };

/**
 * A section's check rows: a choice's options (and any picked value it no longer offers, count 0),
 * round for a single choice; a range's named ranges, round, one at a time. None for a range with
 * no named ranges (it has the From and To boxes) or a yes/no section (a switch).
 */
export function railRows(section: FilterSection, value: FilterValue): RailRow[] {
  if (section.kind === 'choice') {
    const v = value[section.key];
    const picked = Array.isArray(v) ? v : [];
    return choiceOptions(section, value).map((o) => ({
      value: o.value, label: o.label ?? o.value, count: o.count, on: picked.includes(o.value), round: Boolean(section.single),
      next: toggleOption(value, section, o.value),
    }));
  }
  if (section.kind === 'range' && section.ranges?.length) {
    const r = rangeOf(value[section.key]);
    return section.ranges.map((p) => {
      const on = rangePressed(p, r);
      return {
        value: p.label, label: p.label, count: p.count, on, round: true,
        next: on ? setRange(value, section.key) : setRange(value, section.key, p.from, p.to),
      };
    });
  }
  return [];
}

/** One row of a header's menu, with the value a tick on it leaves. */
export type ColumnRow = RailRow;

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
