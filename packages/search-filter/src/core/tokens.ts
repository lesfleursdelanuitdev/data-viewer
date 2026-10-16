// The field's tokens: the search text first (S2-D1: at most one), then the applied filters.
import { isSet, removeChip, sectionSummary } from '@lesfleursdelanuitdev/filter/parts';
import type { FilterSection, FilterStyleSearch, FilterValue, FilterWords } from '@lesfleursdelanuitdev/filter/parts';
import type { SearchFilterWords } from './words.ts';

/** One token in the field: "Name has mint", "Kind is Herb", "Price · Under €5". */
export type Token =
  | { kind: 'text'; key: string; op: string; value: string }
  | { kind: 'filter'; section: string; option?: string; key: string; op: string; value: string };

/** The text token's key: the "Search in" field, else the one searched column, else "Any column". */
function textKey(search: FilterStyleSearch, words: SearchFilterWords): string {
  if (search.in) return search.fields.find((f) => f.key === search.in)?.label ?? search.in;
  return search.only ?? words.anyColumn;
}

/**
 * The tokens, in order: the search text (when there is one), then one per picked option (by its
 * label, or its value when no longer offered), one per set range and one per set yes / no, in
 * section order. Keys with no section give none.
 */
export function tokensOf(sections: FilterSection[], value: FilterValue, search: FilterStyleSearch, words: SearchFilterWords & FilterWords): Token[] {
  const out: Token[] = [];
  if (search.text.trim()) out.push({ kind: 'text', key: textKey(search, words), op: words.has, value: search.text });
  for (const s of sections) {
    const v = value[s.key];
    if (!isSet(s, v)) continue;
    if (s.kind === 'choice') {
      for (const option of v as string[]) {
        const label = s.options.find((o) => o.value === option)?.label ?? option;
        out.push({ kind: 'filter', section: s.key, option, key: s.label, op: words.is, value: label });
      }
    } else {
      out.push({ kind: 'filter', section: s.key, key: s.label, op: '', value: sectionSummary(s, v, words) });
    }
  }
  return out;
}

/** The value without what a filter token stands for: its option, or its whole section. A text token changes nothing (the host clears the search). */
export function removeToken(value: FilterValue, token: Token): FilterValue {
  if (token.kind !== 'filter') return value;
  return removeChip(value, token.option === undefined ? { key: token.section, label: '' } : { key: token.section, option: token.option, label: '' });
}
