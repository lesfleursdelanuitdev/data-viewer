import type { html, svg, nothing, TemplateResult } from 'lit';
import type { ref } from 'lit/directives/ref.js';
import type { repeat } from 'lit/directives/repeat.js';
import type { classMap } from 'lit/directives/class-map.js';
import type { live } from 'lit/directives/live.js';
import type { FilterHandlers, FilterView } from '../render.ts';
import type { FilterSection, FilterValue } from './types.ts';

/**
 * The host's own Lit, passed to each style's render function, so an add-on file that holds a
 * style never bundles a second copy of Lit. Style code uses only these, never a Lit import.
 */
export type FilterKit = {
  html: typeof html; svg: typeof svg; nothing: typeof nothing; ref: typeof ref; repeat: typeof repeat; classMap: typeof classMap; live: typeof live;
  // The host's ⋯ menu (the menu package's renderMenu): a button named `label` whose list offers
  // `items`; `id` is unique on the page. onPick gets the item's id and the button. Optional: a
  // host without it draws no menu.
  menu?(items: { id: string; label: string }[], id: string, label: string, onPick: (id: string, button: HTMLElement) => void): unknown;
};

/** A view a visitor saved (S3-D3): the filter value and the search text, nothing else. */
export type SavedView = { key: string; label: string; filter: FilterValue; search?: string };

/** One tab of a style that draws views: a page view (or the added "All", key ''), or a saved one. */
export type ViewTab = { key: string; label: string; count: number | null; user: boolean; current: boolean };

/** The views, for a style that sets drawsViews (filled in by the host). */
export type FilterStyleViews = {
  tabs: ViewTab[];                 // page views (or the added "All"), then user views
  renaming: string | null;         // the user view whose label is being edited
  undo: { label: string } | null;  // the toast after a delete, while it shows
};

/** The list's search, for a style that replaces the search box (search-filter). */
export type FilterStyleSearch = {
  text: string;                              // the applied search
  in: string;                                // the applied "Search in" key; '' = all
  fields: { key: string; label: string }[];  // offered "Search in" fields; [] when no picker
  only: string | null;                       // the one searched column's label, else null
  typed: string;                             // what is typed now (the host keeps it)
  typedCount: number | null;                 // rows the typed text would leave; null = unknown
};

export type FilterStyleView = FilterView & {
  countFor: number | null;   // rows the draft would leave; null = not known (yet)
  results: number | null;    // rows the applied filters leave (rail "N results", columns "N of M")
  total: number | null;      // rows before any filter (columns' M); null in server mode
  menu: string | null;       // the open pill/header menu's section key, for instant styles
  // The list's box in the window, for placing a popover against the list (the panel right-aligns
  // to a trigger in the list's right half). Read when a popover opens. None: the window.
  bounds?: () => { left: number; right: number };
  search?: FilterStyleSearch; // given to a style that sets replacesSearch
  views?: FilterStyleViews;   // given to a style that sets drawsViews, when the host keeps views
};

export type FilterStyleHandlers = FilterHandlers & {
  onApplyNow(next: FilterValue): void; // instant styles: apply this value at once
  onMenu(key: string | null): void;    // open or close one menu
  onSearch?(text: string, searchIn?: string): void; // apply a search at once (replacesSearch styles)
  onTyped?(text: string): void;                     // the typed text changed (for typedCount)
  // drawsViews styles. A tab is a whole state: a user view sets its filters and search (view
  // ''), a page view its key with no filters and no search.
  onView?(key: string): void;
  onSaveView?(label: string): void;        // saves the open draft (else the applied filters) and the search; label filled in by the style
  onRenaming?(key: string | null): void;   // starts (or with null stops) editing a user view's label
  onRename?(key: string, label: string): void; // an empty label keeps the old one
  onDeleteView?(key: string): void;        // removes it at once; an undo shows for 5 s
  onUndoDelete?(): void;
};

/** One filter design, drawn by the host (the data viewer) into its own light DOM. */
export type FilterStyle = {
  name: string;
  instant: boolean;      // applies on every change (bar, rail, columns)
  showsApplied: boolean; // draws applied filters itself, so the chips row is off
  styles(): void;        // injects its <style> once
  fallback?(ctx: { width: number; layout: 'table' | 'cards' }): string | null; // another style's name, or null
  // Drawn in a column of its own beside the list (rail), not in the bar. The host marks its root
  // `.dv-root[data-filter-side]` and puts the style in `.dv-side` and the list in `.dv-main`; the
  // style's own CSS lays the two out.
  side?: boolean;
  // Draws the search too: the host leaves out its search box and passes view.search.
  replacesSearch?: boolean;
  // view.phone is also set while the list is narrower than this many pixels.
  narrowBelow?: number;
  // Drawn above the bar, full width (in .dv-above), not in the bar's filter slot.
  above?: boolean;
  // Draws the views itself: the host leaves out its views nav and passes view.views.
  drawsViews?: boolean;
  // In browser mode the list shows the rows the open draft leaves (page 1, not dimmed); the
  // address and dv-query wait until it is applied.
  previewsDraft?: boolean;
  // The empty list's line; null (or none) keeps the host's.
  empty?(view: FilterStyleView): string | null;
  render(view: FilterStyleView, on: FilterStyleHandlers, kit: FilterKit): TemplateResult;
  // Drawn above the list, in the chips row's place (rail's "N results" and chips).
  summary?(view: FilterStyleView, on: FilterStyleHandlers, kit: FilterKit): TemplateResult;
  header?(section: FilterSection, place: { index: number; of: number }, view: FilterStyleView, on: FilterStyleHandlers, kit: FilterKit): TemplateResult;
};
