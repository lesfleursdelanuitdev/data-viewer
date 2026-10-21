import { addPaginationStyles } from '@lesfleursdelanuitdev/pagination';
import { addCardStyles } from '@lesfleursdelanuitdev/card';
import { addSearchStyles } from '@lesfleursdelanuitdev/search';
import { addFilterStyles } from '@lesfleursdelanuitdev/filter';
import { addSelectStyles } from '@lesfleursdelanuitdev/select';

// The built-in look. Every rule sits inside :where() so any page rule wins, and the style
// element goes first in <head> so page CSS loaded later wins ties too. The menus, the pager, the
// cards, the search box and the filter are the menu, pagination, card, search and filter
// packages, with their own styles; inside a list their variables are the list's (--dv-*), so
// theming the list themes them too.
// Colours follow the page's color-scheme through light-dark(): a page with none (or `light`)
// gets the light ones even on a dark OS; a page with `color-scheme: light dark` follows the OS.
// Phones (the filter's sheet width, 639 px): the bar is two rows, tops in line, one gap
// everywhere. Row 1: the search box, Filter, the switch; row 2: "Search in" and "Sort by", half
// the row each; then the applied filters (the panel filter's own rules) and the views. The search
// box's wrappers step aside (display: contents) so its parts are the bar's own items; the empty
// ::after and ::before end rows 1 and 2. The gap between rows is the items' margins, as a row-gap
// would count the empty rows too. Selectors outside :where() outweigh the search package's own
// phone rules (its style comes later in <head>).
export const css: string = `
:where(:root) {
  --dv-bg: light-dark(#ffffff, #17171a);
  --dv-surface: light-dark(#f6f6f7, #222226);
  --dv-text: light-dark(#1d1d20, #ececf0);
  --dv-muted: light-dark(#5e5e66, #a3a3ad);
  --dv-border: light-dark(#d9d9de, #3a3a41);
  --dv-accent: light-dark(#2f5bd3, #8aa9ff);
  --dv-danger: light-dark(#b42318, #ff8a80);
  --dv-radius: 8px;
  --dv-font: system-ui, -apple-system, "Segoe UI", sans-serif;
  /* One height for the controls of the bars and the pager */
  --dv-control-height: 2.375rem;
}
@media (max-width: 640px) { :where(:root) { --dv-control-height: 44px; } }
/* Inside a list, the menus, the pager and the cards take the list's colours and shape. */
:where(.dv-root) {
  --menu-bg: var(--dv-bg); --menu-surface: var(--dv-surface); --menu-text: var(--dv-text);
  --menu-muted: var(--dv-muted); --menu-border: var(--dv-border); --menu-accent: var(--dv-accent);
  --menu-danger: var(--dv-danger); --menu-radius: var(--dv-radius); --menu-font: var(--dv-font);
  --pagination-bg: var(--dv-bg); --pagination-surface: var(--dv-surface); --pagination-text: var(--dv-text);
  --pagination-muted: var(--dv-muted); --pagination-border: var(--dv-border); --pagination-accent: var(--dv-accent);
  --pagination-radius: var(--dv-radius); --pagination-font: var(--dv-font);
  --card-bg: var(--dv-bg); --card-surface: var(--dv-surface); --card-text: var(--dv-text);
  --card-muted: var(--dv-muted); --card-border: var(--dv-border); --card-accent: var(--dv-accent);
  --card-danger: var(--dv-danger); --card-radius: var(--dv-radius); --card-font: var(--dv-font);
  --search-bg: var(--dv-bg); --search-surface: var(--dv-surface); --search-text: var(--dv-text);
  --search-muted: var(--dv-muted); --search-border: var(--dv-border); --search-accent: var(--dv-accent);
  --search-radius: var(--dv-radius); --search-font: var(--dv-font);
  --filter-bg: var(--dv-bg); --filter-surface: var(--dv-surface); --filter-text: var(--dv-text);
  --filter-muted: var(--dv-muted); --filter-border: var(--dv-border); --filter-accent: var(--dv-accent);
  --filter-on-accent: var(--dv-bg); --filter-radius: var(--dv-radius); --filter-font: var(--dv-font);
  --select-bg: var(--dv-bg); --select-text: var(--dv-text); --select-border: var(--dv-border);
  --select-accent: var(--dv-accent); --select-radius: var(--dv-radius);
  --lfdln-control-height: var(--dv-control-height);
}
:where(.dv-root) {
  display: block; font-family: var(--dv-font); color: var(--dv-text); background: var(--dv-bg);
  min-width: 0; max-width: 100%;
}
:where(.dv-root) :where(*, *::before, *::after) { box-sizing: border-box; }
:where(.dv-root[aria-busy="true"]) :where(.dv-table, .dv-cards) { opacity: 0.6; }
/* The list's own controls (the menus, the pager, the cards, the search box and the filter style
   theirs, so these rules leave them alone). */
:where(.dv-bar, .dv-table, .dv-error) :where(button, a, input, select):where(:not(.lfdln-menu-item, .lfdln-menu-button, .lfdln-search-root *, .lfdln-filter-root *)):where(:focus-visible) {
  outline: 2px solid var(--dv-accent); outline-offset: 2px;
}
:where(.dv-bar, .dv-error) :where(button:not(.lfdln-search-root *, .lfdln-filter-root *)) {
  font: inherit; color: inherit; background: var(--dv-surface); border: 1px solid var(--dv-border);
  border-radius: var(--dv-radius); padding: 0 0.75rem; cursor: pointer; height: var(--dv-control-height);
}
:where(.dv-bar, .dv-error) :where(button:disabled) { opacity: 0.5; cursor: default; }
:where(.dv-table) :where(a:not(.lfdln-menu-item)) { color: var(--dv-accent); }
:where(.dv-sr) {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

:where(.dv-bar) { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem; }
/* The search keeps one width whatever else the bar holds (the cards' Sort by, the views, the
   switch): a set width that never grows into the line's free space, wider when it holds the
   "Search in" picker so the picker stays beside the box. It shrinks when the screen is narrower.
   Phones: it fills its own line, or shares it only with the Filter button. */
:where(.dv-search) { flex: 0 1 var(--dv-search-width, 22rem); min-width: 0; max-width: 100%; }
:where(.dv-search:has(.lfdln-search-in)) { flex-basis: var(--dv-search-width, 30rem); }
/* The line's free space goes after the search, so the controls keep to the bar's right end. */
:where(.dv-bar) > :where(.dv-search + *) { margin-left: auto; }
:where(.dv-filter) { display: flex; min-width: 0; max-width: 100%; }
:where(.dv-root) > :where(.lfdln-filter-chips) { margin: -0.25rem 0 0.75rem; }
/* Cards' Sort by: the select package's dropdown, as tall as the bar's buttons and in their colours. */
:where(.dv-sort) { display: inline-flex; --select-bg: var(--dv-surface); --select-pad-y: 0.35rem; --select-pad-x: 0.75rem; }
:where(.dv-views) { display: flex; flex-wrap: wrap; gap: 0.25rem; }
:where(.dv-views) :where(a) {
  display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.65rem; border-radius: 999px;
  color: var(--dv-muted); text-decoration: none; border: 1px solid transparent;
}
:where(.dv-views) :where(a[aria-current="true"]) { color: var(--dv-text); border-color: var(--dv-border); background: var(--dv-surface); }
:where(.dv-count) { font-size: 0.85em; color: var(--dv-muted); }
:where(.dv-layout) { display: inline-flex; gap: 0.25rem; }
:where(.dv-layout) :where(button[aria-pressed="true"]) { border-color: var(--dv-accent); }
:where(.dv-layout) :where(button) { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; }
:where(.dv-layout-icon) { display: inline-flex; line-height: 1; }
:where(.dv-layout-icon) > :where(svg) { display: block; width: 1.1em; height: 1.1em; }

/* position: relative keeps the hidden "What you can do" heading inside the scrolling box, so a
   wide table never makes the page scroll sideways on phones. */
:where(.dv-table-wrap) { position: relative; overflow-x: auto; border: 1px solid var(--dv-border); border-radius: var(--dv-radius); }
:where(.dv-table) { width: 100%; border-collapse: collapse; }
:where(.dv-table) :where(th, td) { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid var(--dv-border); vertical-align: middle; }
:where(.dv-table) :where(thead th) { font-size: 0.85em; color: var(--dv-muted); font-weight: 600; background: var(--dv-surface); white-space: nowrap; }
:where(.dv-table) :where(tbody th) { font-weight: 600; }
:where(.dv-table) :where(tbody th) { min-width: min(10rem, 40vw); }
:where(.dv-table) :where(tbody th:has(.dv-row-picture)) { min-width: min(13rem, 55vw); }
:where(.dv-table) :where(tbody tr:last-child) :where(th, td) { border-bottom: 0; }
:where(.dv-table) :where(.dv-right) { text-align: right; font-variant-numeric: tabular-nums; }
:where(.dv-table) :where(thead button) { all: unset; cursor: pointer; display: inline-flex; gap: 0.25rem; align-items: center; }
:where(.dv-table) :where(thead button:focus-visible) { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
:where(.dv-table) :where(img) { max-height: 2.5rem; border-radius: calc(var(--dv-radius) / 2); }

:where(.dv-cards) {
  list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
}
/* A custom card (a card template, cardTemplate or cardMount): the list item and the open layer
   only; what is inside is the page's. Its open control's ::after covers the card, like the
   built-in title's; the card's other buttons, links, fields and menus sit above that layer. */
:where(.dv-card-custom) { position: relative; min-width: 0; overflow-wrap: anywhere; }
:where(.dv-card-custom :is(a, button)[data-open])::after { content: ""; position: absolute; inset: 0; }
:where(.dv-card-custom) :where(a, button, input, select, textarea, summary, label, dv-menu, dv-actions):where(:not([data-open], .dv-card-open, .lfdln-menu-list *)) {
  position: relative; z-index: 1;
}
:where(.dv-card-custom:has(:is(.dv-card-open, a[data-open], button[data-open]):focus-visible)) { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
:where(dv-actions) { display: block; }
:where(.dv-badge) {
  display: inline-block; padding: 0.1rem 0.5rem; border-radius: 999px; font-size: 0.8em; white-space: nowrap;
  border: 1px solid var(--dv-border); color: var(--dv-muted); background: var(--dv-bg);
}

:where(.dv-open) { all: unset; cursor: pointer; overflow-wrap: anywhere; }
:where(a.dv-open) { color: var(--dv-accent); text-decoration: underline; }
:where(.dv-open:focus-visible) { outline: 2px solid var(--dv-accent); outline-offset: 2px; }
:where(.dv-table) :where(.dv-row-menu) { width: 1%; text-align: right; }
/* The row's picture: one small square for every row, like the cards' one shape. */
:where(.dv-row-head) { display: inline-flex; align-items: center; gap: 0.6rem; min-width: 0; }
:where(.dv-row-picture) {
  flex: none; width: 2.5rem; height: 2.5rem; overflow: hidden; border-radius: calc(var(--dv-radius) / 2);
  background: var(--dv-surface);
}
:where(.dv-row-picture) > :where(img, video, svg, picture) {
  display: block; width: 100%; height: 100%; max-height: none; object-fit: cover; border-radius: 0;
}

:where(.dv-root, .dv-main) > :where(.lfdln-pagination-nav) { margin-top: 0.75rem; }
:where(.dv-empty, .dv-error) { padding: 1.5rem; text-align: center; color: var(--dv-muted); border: 1px dashed var(--dv-border); border-radius: var(--dv-radius); }
:where(.dv-error) { color: var(--dv-danger); margin-bottom: 0.75rem; }

/* The loading state (before the first full drawing): a skeleton of the bar and of rows or cards.
   Even inside, like everything else (the house style). It pulses unless motion is reduced. It
   stays hidden for loading-delay (the space kept, the screen reader's line there), so a quick load
   never flashes it; the first full drawing then eases in (data-arrived; later loads show busy). */
:where(.dv-sk) { display: block; border-radius: var(--dv-radius); background: color-mix(in srgb, var(--dv-text) 9%, transparent); }
:where(.dv-loading) :where(.dv-sk) { animation: lfdln-dv-pulse 1.4s ease-in-out infinite; }
@keyframes lfdln-dv-pulse { 50% { opacity: 0.45; } }
@media (prefers-reduced-motion: reduce) { :where(.dv-loading) :where(.dv-sk) { animation: none; } }
:where(.dv-loading) > :where(:not(.dv-sr)) { visibility: hidden; animation: lfdln-dv-show 0s var(--dv-loading-delay) forwards; }
@keyframes lfdln-dv-show { to { visibility: visible; } }
:where(.dv-root[data-arrived]) { animation: lfdln-dv-arrive 150ms ease-out; }
@keyframes lfdln-dv-arrive { from { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { :where(.dv-root[data-arrived]) { animation: none; } }
:where(.dv-sk-bar) { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
:where(.dv-sk-search) { flex: 0 1 var(--dv-search-width, 22rem); height: 2.25rem; }
:where(.dv-sk-button) { flex: none; width: 5.5rem; height: 2.25rem; }
:where(.dv-sk-search + .dv-sk-button) { margin-left: auto; }
:where(.dv-sk-row) { padding: 0.75rem; border-bottom: 1px solid var(--dv-border); }
:where(.dv-sk-row:last-child) { border-bottom: 0; }
:where(.dv-sk-line) { height: 1rem; }
:where(.dv-sk-short) { width: 60%; }
:where(.dv-sk-card) {
  display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; border: 1px solid var(--dv-border); border-radius: var(--dv-radius);
}
:where(.dv-sk-title) { height: 1.25rem; width: 70%; }
:where(.dv-sk-picture) { aspect-ratio: 4 / 3; }

@media (max-width: 640px) {
  :where(.dv-sk-search) { flex: 1 1 100%; height: 44px; }
  :where(.dv-sk-button) { display: none; }
  :where(.dv-bar, .dv-error, .dv-table) :where(button, input, select, .dv-views a):where(:not(.lfdln-search-root *, .lfdln-filter-root *)) { min-height: 44px; }
  :where(.dv-layout) :where(button) { min-width: 44px; }
  :where(.dv-table) :where(td:not(.dv-row-menu)) { min-width: 7rem; }
  :where(.dv-table) :where(.dv-right) { white-space: nowrap; }
  :where(.dv-search, .dv-search:has(.lfdln-search-in)) { flex: 1 1 100%; }
  :where(.dv-search:has(+ .dv-filter)) { flex: 1 1 14rem; }
}
/* Phones: two rows (see the note above). */
@media (max-width: 639px) {
  :where(.dv-bar) { row-gap: 0; align-items: flex-start; margin: -0.25rem 0 0.5rem; }
  :where(.dv-bar)::after, :where(.dv-bar)::before { content: ""; flex-basis: 100%; order: 1; }
  :where(.dv-bar)::before { order: 3; }
  :where(.dv-bar) :where(.dv-bar > *, .lfdln-search-root > *) { margin-block: 0.25rem; }
  :where(.dv-bar) :is(.dv-search:not(.dv-search-filter), .lfdln-search-root) { display: contents; }
  :where(.dv-bar) .lfdln-search-field { flex: 1 1 0; }
  :where(.dv-bar) :is(.lfdln-search-in-wrap, .dv-sort) { order: 2; flex: 1 1 0; min-width: 0; max-width: none; }
  :where(.dv-sort) > :where(*) { flex: 1 1 auto; }
  :where(.dv-views) { order: 4; }
}
`;

// Adds the style once per document, first in <head>, and the menu's, the pager's and the card's
// (each once per document; the card's after the menu's). The list's rules only reach its own bar,
// table and error box, so nothing here depends on the order of the packages' styles.
export function addStyles(doc: Document = document): void {
  addCardStyles(doc);
  addPaginationStyles(doc);
  addSearchStyles(doc);
  addFilterStyles(doc);
  addSelectStyles(doc);
  if (doc.getElementById('lfdln-dv-style')) return;
  const el = doc.createElement('style');
  el.id = 'lfdln-dv-style';
  el.textContent = css;
  doc.head.prepend(el);
}
