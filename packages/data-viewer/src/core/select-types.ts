// The select add-on's contract with the viewer: types only (the add-on draws with the viewer's
// kit, so it carries no Lit of its own).
import type { TemplateResult } from 'lit';
import type { FilterKit } from '@lesfleursdelanuitdev/filter';
import type { renderMenu } from '@lesfleursdelanuitdev/menu';
import type { MenuItem } from './types.ts';

/** The selection's words. n arrives already formatted for the list's locale. */
export type SelectWords = {
  selectedCount: (n: string) => string;
  selectRow: (name: string) => string;
  selectPage: string;
  pageSelected: (n: string) => string;
  selectAllMatching: (n: string) => string;
  allSelected: (n: string) => string;
  clearSelection: string;
  moreActions: string;
};

/**
 * The viewer's Lit and its menu, handed to the add-on. The menu is the menu package's own
 * renderMenu (entries and MenuItems), not the filter styles' simpler ⋯ menu (ids).
 */
export type SelectKit = Omit<FilterKit, 'menu'> & { menu: typeof renderMenu };

/** What the add-on draws from. */
export type SelectView = {
  count: number; // "3 selected"
  all: boolean; // "all matching" is on
  page: 'none' | 'some' | 'all';
  pageCount: number; // tickable rows on this page
  matching: number | null; // rows matching the query; null = not known
  offerAll: boolean; // draw the select-all line
  actions: MenuItem[]; // batchActions
  words: Partial<SelectWords>; // the page's words; the add-on puts its defaults under them
  num: (n: number) => string; // a number in the list's locale
  rowKey: string | ((row: never) => string) | undefined; // the list's row-key, for the add-on's missing-key warning
  uid: string; // unique on the page, for ids
};

export type SelectHandlers = { onPage(on: boolean): void; onAll(): void; onClear(): void; onAction(item: MenuItem): void };

/** One row's box: key undefined means the row can't be ticked (its box is disabled). */
export type SelectBox = { key: string | undefined; name: string; ticked: boolean };

export type SelectAddon = {
  styles(): void;
  bar(view: SelectView, on: SelectHandlers, kit: SelectKit): TemplateResult;
  pageBox(view: SelectView, on: SelectHandlers, kit: SelectKit): TemplateResult;
  box(row: SelectBox, view: SelectView, onTick: (on: boolean) => void, kit: SelectKit): TemplateResult;
};
