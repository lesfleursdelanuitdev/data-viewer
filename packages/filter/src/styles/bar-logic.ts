// The bar's pure helpers: no DOM, no Lit, tested with node:test.
import { matchingOptions, SEARCH_ABOVE } from '../core/options.ts';
import { isSet, sectionSummary } from '../core/summary.ts';
import type { FilterOption, FilterSection, FilterValue, FilterWords } from '../core/types.ts';
import { choiceOptions } from './panel-logic.ts';

type Choice = Extract<FilterSection, { kind: 'choice' }>;

const labels = (s: Choice, v: FilterValue[string] | undefined): string[] =>
  (Array.isArray(v) ? v : []).map((x) => s.options.find((o) => o.value === x)?.label ?? x);

/**
 * What a pill says after its key: '' when nothing is set; a choice's first pick by its label
 * ('Herb'), and how many more ('Herb +1'); a range's name ('Under €5') or its ends in the
 * column's format ('€5–€10', 'Up to €5'); a yes/no pill nothing when on (the pill is its own
 * check), its "no" word when set to no. A picked value no longer offered shows as itself.
 */
export function pillSummary(section: FilterSection, value: FilterValue, words: FilterWords): string {
  const v = value[section.key];
  if (!isSet(section, v)) return '';
  if (section.kind === 'choice') {
    const l = labels(section, v);
    return l.length > 1 ? `${l[0]} +${l.length - 1}` : l[0]!;
  }
  if (section.kind === 'bool') return v === true ? '' : section.no ?? words.no;
  return sectionSummary(section, v, words);
}

/** A pill's accessible name: its label, then everything it is set to ('Kind: Herb, Fern'). */
export function pillName(section: FilterSection, value: FilterValue, words: FilterWords): string {
  const v = value[section.key];
  const all = section.kind === 'choice' ? labels(section, v).join(', ') : pillSummary(section, value, words);
  return all ? `${section.label}: ${all}` : section.label;
}

/** A choice with more than SEARCH_ABOVE options gets a search box at the top of its menu. */
export function searchable(section: FilterSection): boolean {
  return section.kind === 'choice' && section.options.length > SEARCH_ABOVE;
}

/** A choice menu's rows: its options and any picked value it no longer offers, then the typed search. */
export function menuOptions(section: Choice, value: FilterValue, search: string): FilterOption[] {
  return matchingOptions(choiceOptions(section, value), search);
}
