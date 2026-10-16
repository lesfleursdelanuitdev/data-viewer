// The views style's pure helpers and words: no DOM, no Lit, tested with node:test.
import { normalise, setBool } from '../core/draft.ts';
import type { FilterSection, FilterValue, FilterWords } from '../core/types.ts';
import { railRows } from './rail-logic.ts';

/** The views style's words, merged under the host's (a page sets any of them in `words`). */
export type ViewsWords = {
  views: string; // the tabs row's name (the viewer's own word)
  allViews: string; // the tab added when the page sets no views
  newView: string;
  viewName: (n: number) => string; // a view saved with no name
  nameView: string; // the name box's label and placeholder
  saveView: (n: number) => string;
  saveViewUnknown: string;
  nothingToSave: string; // why Save does nothing with no filter and no search
  viewMenu: (label: string) => string; // the ⋯ button's name
  rename: string;
  delete: string;
  renameView: (label: string) => string; // the rename box's label
  viewDeleted: (label: string) => string;
  undo: string;
};

export const defaultViewsWords: ViewsWords = {
  views: 'Views',
  allViews: 'All',
  newView: 'New view',
  viewName: (n) => `View ${n}`,
  nameView: 'Name this view',
  saveView: (n) => `Save · ${n} ${n === 1 ? 'result' : 'results'}`,
  saveViewUnknown: 'Save',
  nothingToSave: 'Pick a filter or search for something first.',
  viewMenu: (label) => `More for ${label}`,
  rename: 'Rename',
  delete: 'Delete',
  renameView: (label) => `Rename ${label}`,
  viewDeleted: (label) => `Deleted “${label}”`,
  undo: 'Undo',
};

/** One chip in a builder row, with the draft a tick on it leaves. */
export type BuilderChip = { label: string; count?: number; on: boolean; next: FilterValue };
/** One builder row: a section's label and chips, or (a range with no named ranges) its From and To boxes. */
export type BuilderRow = { key: string; label: string; chips: BuilderChip[]; boxes: boolean };

/**
 * The builder's rows: a choice's options as chips with counts (and a picked value it no longer
 * offers, count 0); a range's named ranges as single chips (a tick on the picked one unpicks it),
 * or the boxes when it has none; yes / no as two chips, one at a time.
 */
export function builderRows(sections: FilterSection[], draft: FilterValue, words: FilterWords): BuilderRow[] {
  return sections.map((s) => {
    const chips: BuilderChip[] = s.kind === 'bool'
      ? [true, false].map((b) => {
        const on = draft[s.key] === b;
        return { label: (b ? s.yes : s.no) ?? (b ? words.yes : words.no), on, next: setBool(draft, s.key, on ? undefined : b) };
      })
      : railRows(s, draft).map((r) => ({ label: r.label, count: r.count, on: r.on, next: r.next }));
    return { key: s.key, label: s.label, chips, boxes: s.kind === 'range' && !s.ranges?.length };
  });
}

/** The primary button: "Save · 12 results", "Save · 1 result", or "Save" while the count is unknown. */
export function saveLabel(count: number | null, words: ViewsWords): string {
  return count === null ? words.saveViewUnknown : words.saveView(count);
}

/** A new view's label: the name typed, trimmed, else "View n" after the user views there are. */
export function newViewLabel(name: string, userCount: number, words: ViewsWords): string {
  return name.trim() || words.viewName(userCount + 1);
}

/** Whether a view would hold anything: a filter that narrows the list, or a search. */
export function canSaveView(sections: FilterSection[], draft: FilterValue, search: string): boolean {
  return Object.keys(normalise(sections, draft)).length > 0 || search.trim() !== '';
}

/** The id of a saved view's ⋯ menu: keyed by the view key (not its place, so it stays put after a delete or undo), with every character but letters, digits and "-" written as _hex_. */
export function menuId(uid: string, key: string): string {
  return `${uid}-vm-${key.replace(/[^A-Za-z0-9-]/gu, (c) => `_${c.codePointAt(0)!.toString(16)}_`)}`;
}
