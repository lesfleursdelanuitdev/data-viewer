import type { SelectWords } from '../core/select-types.ts';

/** The selection's words in English. Each n arrives already formatted for the list's locale. */
export const defaultSelectWords: SelectWords = {
  selectedCount: (n) => `${n} selected`,
  selectRow: (name) => `Select ${name}`,
  selectPage: 'Select all on this page',
  pageSelected: (n) => `All ${n} on this page are selected.`,
  selectAllMatching: (n) => `Select all ${n} matching`,
  allSelected: (n) => `All ${n} are selected.`,
  clearSelection: 'Clear selection',
  moreActions: 'More actions',
};

/** The defaults with the page's own words on top (a word set to undefined keeps the default). */
export function wordsOf(words: Partial<SelectWords>): SelectWords {
  const out: Record<string, unknown> = { ...defaultSelectWords };
  for (const [k, v] of Object.entries(words)) if (v !== undefined) out[k] = v;
  return out as SelectWords;
}
