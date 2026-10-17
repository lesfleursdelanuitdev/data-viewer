# data-viewer: one list, as a table or as cards, for any page

Status: SPEC APPROVED 2026-10-14 (DV-Q1..Q4 answered). Local folder `~/data-viewer` only: no GitHub repo,
nothing on npm, nothing built.

## What momolig asked (2026-10-14)

"We have a DataViewer component, do we have this packaged separately? We should package it
separately as a Lit component."

Today's DataViewer is `@panel/dataviewer` (panel repo, `packages/dataviewer`, made in shop-admin-ui
UI-1). It is React, and it needs the panel's UI kit, react-router and Radix. Studio records and the
shop admin's Products, Product and Orders pages use it.

## Decisions (momolig, 2026-10-14)

| | Decision |
|---|---|
| Who it's for | **Any project, not only the panel**: Ligneous, TutorLumi, plain HTML pages, and the panel's React apps. |
| Rows | **Handed rows, plus adapters.** The core never fetches anything. Optional adapter files fetch for HTML-only pages. |
| Styling | **Page CSS reaches in.** It draws into the page itself (no shadow root), its built-in look sits inside `:where()`, and colours come from `--dv-*` variables. |
| React users | **Switch them after.** Build and test the package on its own first. Then `@panel/dataviewer` becomes a thin wrapper over it, as a separate step (DV-6). |
| Home | **Its own repo, published on public npm.** Public GitHub repo `lesfleursdelanuitdev/data-viewer`, MIT licence. |
| Tag | **`<lfdln-data-viewer>`** (and `<lfdln-dv-column>`). |

## The split into four packages (decided by momolig 2026-10-15)

One repository, npm workspaces, four packages published separately (all 0.1.0, MIT, Monica
Gonsalves; each with its own package.json, README, LICENSE, vite build, standalone script with a
size check, types and tests). The root package.json is private and builds and tests them all.

| Folder | Package | Tags | Standalone (limit, gzipped) |
|---|---|---|---|
| `packages/menu` | `@lesfleursdelanuitdev/menu` | `<lfdln-menu>` (+ `-item`, `-separator`, `-heading` children) | `menu.standalone.js` (14 KB) |
| `packages/pagination` | `@lesfleursdelanuitdev/pagination` | `<lfdln-pagination>` | `pagination.standalone.js` (12 KB) |
| `packages/card` | `@lesfleursdelanuitdev/card` | `<lfdln-card>` (+ `-header`, `-body`, `-footer`) | `card.standalone.js` (18 KB; defines `<lfdln-menu>` too) |
| `packages/data-viewer` | `@lesfleursdelanuitdev/data-viewer` | `<lfdln-data-viewer>`, `<lfdln-dv-column>` | `data-viewer.standalone.js` (30 KB; defines all five tags) |

- The card depends on the menu; the viewer depends on all three (exact versions). Lit stays a
  peer dependency everywhere.
- **One implementation, shared as render functions.** Each package exports its drawing
  (`renderMenu`/`renderConfirm`, `renderPagination`/`focusCurrentPage`, `renderCard` with the
  `rowFit` directive) and its custom element is a thin wrapper over it. The viewer calls the
  functions, not the elements: its menus, pager and cards stay part of its own light DOM and
  its own update, its events stay `dv-action`/`dv-query`/… with the row attached (no
  `menu-action` or `page-change` leaks out of a list), one confirm dialog per list as before,
  and it works whatever tag names a page registers (or none). No shadow DOM anywhere.
- **Styles:** each package injects its own `<style id="lfdln-menu-style">` (…`-pagination-`,
  `-card-`) once per page, rules in `:where()`, colours as `--menu-*`, `--pagination-*`,
  `--card-*` with `light-dark()` defaults. Inside `.dv-root` the viewer sets those variables from
  its `--dv-*`, so theming a list themes its menus, pager and cards. The viewer's own rules only
  reach its bar, table and error box, so the order of the sheets doesn't matter, except the
  card's, which goes right after the menu's (it adjusts the row's More button).
- **Class names** of the moved parts became `lfdln-menu-*`, `lfdln-pagination-*` and
  `lfdln-card-*` (the menu's popover is `lfdln-menu-list`, the pages bar `lfdln-pagination-nav`,
  a card `lfdln-card`). Everything else keeps `dv-*`.
- **Several scripts on one page:** every `define()` skips a name that is taken, and ids come from
  one counter on `globalThis[Symbol.for('lfdln.ids')]`, shared by every copy of the code.
- **Behaviour kept and pinned by tests:** a one-size list shows no picker; a gap that would hide
  one page shows it; after a number, focus moves to the current page (fixed on the way: it could
  stay on the button that now showed the next number); a new size keeps the first row
  (`pageAfterResize`, exported). The light-dismiss click-swallow now works on any element marked
  `data-lfdln-menu-guard` (the card's open layer), not on a class of the viewer's.
- **Card actions:** `card-actions` takes `menu` (default), `wrap` (the former `footer`, which
  stays as an alias since it shipped in b11c4c5) or `row`; `card-actions-max`, `card-more-label`,
  and per card `actionsAt` with the same values. `row` keeps one line: as many buttons as fit
  (measured with a ResizeObserver), at most max, the rest in the row's own More menu; danger
  items go into More first; More always fits. The rule is `fitRow()` in `packages/card/src/fit.ts`,
  unit-tested.

## Search and filter: two more packages (decided by momolig 2026-10-15)

momolig asked: developers mark which columns search looks at and which can be filtered, and the
filter looks like the one on the Gonsalves generated albums
(`/srv/apps/gonsalves/the-gonsalves-family/src/components/album/AlbumMediaFilterPanel.tsx` and
`PublicAlbumLayout.tsx`: funnel button, two-column popover, phone sheet, draft then Apply, chips).
Decided: the whole album pattern (not a simpler bar); search and filter are packages of their own,
like menu, pagination and card; "Search in" picker, optional; optional submit button for search;
in server mode the server sends options and counts back as `facets`.

| Folder | Package | Tags | Standalone (limit, gzipped) |
|---|---|---|---|
| `packages/search` | `@lesfleursdelanuitdev/search` | `<lfdln-search>` | `search.standalone.js` (8 KB) |
| `packages/filter` | `@lesfleursdelanuitdev/filter` | `<lfdln-filter>`, `<lfdln-filter-chips>` | `filter.standalone.js` (20 KB) |

The viewer depends on both (exact versions) and calls their render functions, as it does for the
other three (its search box and filter stay in its own light DOM and its own update, and its events
stay `dv-*`). Its standalone limit goes from 30 KB to 45 KB. The views tabs, the table/cards switch
and the confirm dialog stay inside the viewer.

### `<lfdln-search>`

- Attributes: `value`, `placeholder`, `label` (accessible name, default "Search"), `delay` (ms,
  default 300), `search-in` (shows the picker), `in` (the picked field, `''` = all),
  `submit-label`, `submit` (boolean).
- **Search in:** a `<select>` beside the box: "All fields" first, then the fields from the
  `fields` property (`{key, label}[]`) or `<option value>` children. On phones it goes under the box.
- **Typing:** fires after `delay` ms of quiet; Enter fires at once; a clear × empties and fires.
- **Submit button:** with `submit-label="Search"` (or `submit` alone: a magnifier icon, accessible
  name from `label`) a button follows the box; typing then does **not** fire, only Enter or the button.
- Event `search-change` `{ search, in }` (bubbles, composed). Changing the picker fires at once
  when there is text (or always, with no submit button).
- Classes `lfdln-search-*`, variables `--search-*`, style `<style id="lfdln-search-style">`.

### `<lfdln-filter>` and `<lfdln-filter-chips>`

```ts
type FilterOption = { value: string; label?: string; count?: number; description?: string };
type FilterSection =
  | { key: string; label: string; kind: 'choice'; options: FilterOption[]; single?: boolean }
  | { key: string; label: string; kind: 'range'; type?: 'number' | 'money' | 'date';
      ranges?: { label: string; from?: string; to?: string }[]; format?: { currency?: string; locale?: string } }
  | { key: string; label: string; kind: 'bool'; yes?: string; no?: string };
type FilterValue = Record<string, string[] | { from?: string; to?: string } | boolean>;
```

- Properties `sections`, `value`; attributes `label` (button text when nothing is set, default
  "Filter"), `heading` (popover title, default "Filter"), `apply-label`, `clear-label`.
- **Button:** outline, funnel icon, the applied filters summed up and joined with " · "
  ("Shipped · Pending · €10–50"; a choice with more than two picked shows "3 statuses"-style
  "<n> <section label>"); `aria-expanded`, `aria-haspopup="dialog"`.
- **Desktop (wider than 639px):** a popover under the button, `role="dialog"`, up to 42rem wide:
  header (heading + ×), the draft's chips (or "No filters yet"), then two columns. Left: one row per
  section with a chevron and its summary ("2 selected", "Any", "€10–50"), then "Clear all". Right:
  the active section's controls, then Cancel and Apply. Esc and a click outside close it (as Cancel).
- **Phone (639px or narrower):** a bottom sheet with a dim backdrop and a grab handle: header, the
  draft's chips, the section rows; a row opens its own screen with a back chevron and the section's
  title; sticky footer Clear + Apply (48px, safe-area padding). Focus is trapped in the sheet.
- **choice:** a `listbox` (`aria-multiselectable` unless `single`), each row a round check, label,
  optional description, count on the right. A search box above the list when there are more than 8
  options; "Nothing matches" with a link that clears it. Options with count 0 stay but are muted.
- **range:** quick-range pills (from `ranges`), then From and To boxes (`inputmode="decimal"` for
  numbers and money; dates take `1950`, `1950-06` or `1950-06-15`, so text boxes, not date
  pickers). From greater than To swaps them on Apply. Values stay strings.
- **bool:** Any / Yes / No (labels from `yes`/`no`).
- **Draft, then Apply:** changes stay in a draft, filled from `value` when it opens. Apply sets
  `value` and fires `filter-change` `{ value }`; Cancel, × and Esc drop the draft. "Clear all" on
  desktop applies at once (as on the albums); Clear on the phone only empties the draft.
- **`<lfdln-filter-chips for="id">`:** the applied filters as chips with ×, and "Clear all"
  when there are two or more; removing one applies at once (it sets the filter's `value` and the
  filter fires `filter-change`). It can sit anywhere on the page. Nothing is drawn when nothing is set.
- Classes `lfdln-filter-*`, variables `--filter-*`, style `<style id="lfdln-filter-style">`; the
  same keyboard rules as the menu (Esc, focus back to the button).
- Render functions exported (`renderFilter`, `renderFilterChips`, plus pure helpers
  `summarise`, `chipsOf`, `removeChip`) so the viewer can draw them in its own DOM.

### In the viewer

- **Columns:** `searchable?: boolean`, `filterable?: boolean`, `options?: (string | FilterOption)[]`,
  `ranges?: {label, from?, to?}[]`; `<lfdln-dv-column searchable filterable options="A,B"
  ranges="1900s:1900..1999,Recent:2020..">`. `searchKeys` stays and means the same as marking those
  columns searchable. With no column marked (and no `searchKeys`), search looks at every column, as before.
- **Filter kind from the column type:** text, badge, link, tags → `choice`; number, money, date →
  `range`; bool → `bool`; image is never filterable.
- **Browser mode:** choice options are the distinct values with counts (a tags cell counts each
  tag), sorted by label; the counts are over the rows the other filters, the view and the search
  leave (so they say what you'd get). Matching: AND across fields, OR within a field, a tags cell
  matches if any tag matches; range compares numbers, or dates by their start/end (`1950` = the
  whole year); a value-less cell never matches a set filter.
- **Server mode:** `dv-query` gains `searchIn: string` and `filters: FilterValue`. The host may set
  `facets` (`Record<key, FilterOption[]>`) with `rows`/`total`; adapters return it with `rows`.
  Without facets a choice uses the column's `options` (no counts); with neither it is left out.
- **Attributes:** `search-in` (the picker), `search-submit-label`, `filter-label`, `filter-chips`
  (`on` default | `off`). Words: "Search in", "All fields", "Filter", "Apply filter", "Cancel",
  "Clear all", "No filters yet", "Nothing matches", "Any", "Yes", "No", "From", "To".
- **Bar layout:** search (and its picker), then the filter button, then the layout switch; the chips
  row under the bar. A filter or search change goes back to page 1.
- **Address** (`url-state="orders"`): `orders.in=name`, `orders.f.status=shipped,pending`,
  `orders.f.price=10..50`, `orders.f.planted=1990..`, `orders.f.organic=yes|no`. Values are
  URL-encoded; a comma inside a value is written `%2C`.
- **json adapter:** sends `in` and `f.<key>` in that same form, reads `facets` from the answer.
- **pammy adapter:** the panel's data API only has `where.<column>=value` (one exact value). The
  adapter declares `supports: { filters: 'equals', searchIn: false, facets: false }`; with it the
  viewer makes choices single, leaves out range and bool sections and the "Search in" picker, and
  sends a choice as `where.<key>`. Adapters without `supports` get everything.

## The package

- Name `@lesfleursdelanuitdev/data-viewer` (free on npm, checked 2026-10-14; the plain name `data-viewer`
  is taken). It defines the tag `<lfdln-data-viewer>`. `define('other-name')` registers it under another
  tag for a page where that name is used.
- It depends on Lit only (a peer dependency). There is no React, router or panel code.
- Two builds:
  - `dist/data-viewer.js`: an ES module with types, Lit left out, for apps that already have Lit.
  - `dist/data-viewer.standalone.js`: one script with Lit inside, for a plain page that adds a
    `<script type="module">` and the tag.
- Adapters are separate entry points (`@lesfleursdelanuitdev/data-viewer/adapters/json`, `…/pammy`), so a
  page only loads the one it uses.

## How a page uses it

### Columns

```ts
type Column<T> = {
  key: string;                 // also what sorting by it is called
  label: string;
  type?: 'text' | 'number' | 'money' | 'date' | 'badge' | 'image' | 'link' | 'tags' | 'bool';
  value?: (row: T) => unknown;  // default: row[key]
  render?: (row: T) => string | Node | TemplateResult;   // replaces the type's drawing
  sortable?: boolean;
  align?: 'left' | 'right';    // numbers and money default to right
  format?: { currency?: string; locale?: string; date?: Intl.DateTimeFormatOptions };
};
```

### Cards

`cardOf(row)` returns the card's parts. The rules are today's, from the shop-admin-ui plan:

- **header:** a top row with the select box at the left (in a `selectable` list) and the ⋯ menu
  at the right, on one centre line; then the title (two lines at most, the whole of it on hover)
  and its badge. Without a box the row holds only the ⋯; without either there is no row. A long
  title never moves the box or the ⋯ (decided by momolig 2026-10-17, with this mockup):

  ```
  ┌──────────────────────────┐
  │ ☐                     ⋯  │
  │ Rose jam                 │
  │ [On sale]                │
  │ ┌──────picture─────────┐ │
  │ 3 jars · 250 g           │
  │ updated 2 days ago  €6.50│
  └──────────────────────────┘
  ```

  Custom cards get the box as a piece, `pieces.select` (`<dv-select>` in a template), the way they
  get `pieces.menu`, and put it in their own header. A custom card that doesn't place it gets it in
  the viewer's fallback slot (`.dv-select-slot`), absolutely positioned at the card's top left
  inside its padding and above the open layer, so `overflow: hidden` and round corners never clip
  it;
- **body:** picture (one shape for all cards), two facts at most, nothing to press;
- **footer:** the time on the left, the money on the right, at most one button;
- the whole card opens the thing (`href` or the `dv-open` event). The menu and the footer's button
  stay separate buttons.

```ts
type CardParts = {
  title: string; href?: string; badge?: Content; picture?: Content; facts?: Content[];
  meta?: Content; value?: Content; action?: { id: string; label: string; href?: string };
  menu?: { id: string; label: string; href?: string; danger?: boolean; disabled?: boolean; why?: string }[];
};
```

In the table, the first column is the row's header (picture plus the way in), and the last column is
the same ⋯ menu.

### Rows: two modes

- **In the browser:** set `rows` (all of them). It searches, sorts, filters by view and pages them
  itself. Search looks at every column's text unless `searchKeys` is set.
- **From a server:** set `rows` (one page) and `total`. Every change fires a `dv-query` event:
  `{ page, search, sort, dir, view, size }` (`size` added 2026-10-15). The host loads that page and sets `rows`/`total` again. Until
  then the list shows it is busy (`aria-busy`). Typing in the search box waits 300ms before the
  query goes out, as today.

### Other properties

`label` (what the list is called, for screen readers), `views` (`{key, label, count?, where?}`; in
the browser `where(row)` filters), `pageSize` (default 20), `layout` (`table` | `cards`),
`rememberAs` (keeps table-or-cards, and a picked page size under `<key>.size`, in localStorage;
since 2026-10-15 it no longer decides whether the switch shows), `layoutSwitch`,
`tableLabel`/`cardsLabel` and `layoutIcons` (see below),
`compact` (no bar and no pages, for a list inside another card), `words` (every piece of text,
English defaults), `state` (to hand it page, search, sort, dir and view from outside).

### Pages and page sizes (decided by momolig 2026-10-15)

- **Numbered pages, opt-in:** `pager="simple"` (default, Previous / Next) or `pager="numbers"`:
  `‹ Previous  1 … 4 [5] 6 … 12  Next ›`, the first, the last, the current page and its
  neighbours, "…" for gaps (a gap hiding one page shows that page instead). The current page has
  `aria-current="page"` and is no button; the others are buttons named "Page 4", in a group named
  "Page numbers". The polite live-region status stays. On phones the numbers collapse to
  "Page 5 of 12" between Previous and Next. One page or none: no numbers.
- **Page-size picker:** `page-sizes="10,20,50"` (property `pageSizes: number[]`) shows a "Rows per
  page" select next to the status. `page-size` is the starting choice and is added to the list
  in order. The list is parsed in core (`src/core/paging.ts`): junk ignored, deduplicated, sorted,
  values below 1 dropped. Fewer than two sizes left: no picker, and `page-size` is fixed.
  A new size keeps the first row on screen: page = floor(firstIndex / newSize) + 1. It fires
  `dv-query` with `size` in both modes. Address key `<prefix>.size` (left out at the starting
  size, checked against the list), restored on load and on Back/Forward; with `remember-as` it is
  kept in localStorage under `<remember-as>.size`, and the address wins. The json adapter sends
  `size` when it isn't 20; pammy sends it as `per`, capped at 100 by its API (documented).

### The layout switch (decided by momolig 2026-10-15)

- It shows by default, whether or not `remember-as` is set. `layout-switch` is `text` (default;
  unknown values too), `icons`, `both` or `none`. With `none` there is no switch: `layout` or the
  phone default decides, and a choice saved under `remember-as` still applies.
- `table-label` / `cards-label` set the words (defaults "Show a table" / "Show cards"). With icons
  only, the words are hidden text (the button's name) and its `title`. Built-in icons are inline
  SVG in currentColor, `aria-hidden`. `layoutIcons` from script replaces them; a string is text,
  never HTML, and a Node is cloned per drawing. Classes `dv-layout-icon`, `dv-layout-text`.
  `aria-pressed` and 44 px targets on phones in every form.

### Setup in its own file (decided by momolig 2026-10-15)

- `config="./plants-list.js"`: the element imports the module (`import(/* @vite-ignore */ …)`,
  read against `document.baseURI`). Its default export is an object
  `{ columns?, views?, cardOf?, rows?, load?, on?, …any public property }` or a function
  `(list) => void | object | Promise<…>`.
- `on` handlers are tracked: removed when the config changes, taken off on disconnect and put back
  on reconnect, never doubled. `load` gives `rows`, with busy and the error box. A failed module
  shows "Couldn't load this list's setup from <file>." and logs the cause. Busy while loading.
- Order: markup attributes, then the config, then what the page sets afterwards (that wins).
- Bundlers / React: `configure(el, config)` applies the same thing; `defineList<T>(config)` is an
  identity helper for types (column keys checked against `T` unless `value`/`render`, typed `on`).
- The pure part (which keys are applied and in what order, unknown keys warned once) is
  `src/core/config.ts`, unit-tested.

### Menus (decided by momolig 2026-10-15)

- `MenuItem` gains `icon` (string as text, Node copied per drawing, TemplateResult) in a fixed
  `.dv-menu-icon` slot, and `description` (a muted second line, `.dv-menu-desc`; `why` takes its
  place on a disabled item). Entries may also be `{ separator: true }` or `{ heading }` (a
  `role="group"` named by the heading). Danger items still go last under their own line. The name
  is the label; the description is `aria-describedby`. Layout rules: `src/core/menu.ts`.
- `<lfdln-dv-menu>` is the same menu code (`src/element/menu.ts`: keyboard, popover, light dismiss
  with the click-swallow fix, the confirm dialog template, disabled + why, focus return) on its
  own: `label`, `icon`, `trigger-text`, `items`, or `<lfdln-dv-menu-item>` / `-separator` /
  `-heading` children (an item's own markup is cloned). Fires `dv-action` `{ id, item }`,
  `dv-menu-open`, `dv-menu-close`. **Since the split it is `<lfdln-menu>` in the menu package,
  firing `menu-action`, `menu-open` and `menu-close`.**

### Card actions (decided by momolig 2026-10-15)

- (Since the split: `menu`, `wrap` and `row`, with `footer` kept as `wrap`; see above.)
- `card-actions="menu"` (default): the ⋯ menu in the card head, as before. `"footer"`: the items
  become buttons in the footer after the primary `action` (icons kept, danger styled and last,
  separators and headings dropped, disabled kept with `aria-disabled` and `why` as title and
  description, `confirm` and `href` as in the menu). `card-actions-max` (default 3): the rest go
  into a ⋯ menu at the end of the row. A card's `actionsAt` overrides. Tables are unchanged.
  Same `dv-action`. Classes `dv-card-actions`, `dv-card-actions-more`.
- No icon-only footer buttons: the labels stay visible (decided; an icon-only option would need
  a separate decision).

### Address

Opt-in: `url-state="orders"` keeps the state in the address as `orders.page`, `orders.search`, …
(and `orders.size` with a page-size picker), so
two lists on one page don't clash, and Back, a reload and a bookmark come back to the same list.
Without it the state is in the element. A React wrapper can drive it from the router through `state`
and the `dv-query` event instead.

### Events

All of them bubble and are `composed`:

- `dv-query`: what to show changed (both modes), `{ page, search, sort, dir, view, size }`;
- `dv-open`: `{ row }`, a card or first cell pressed when there is no `href`;
- `dv-action`: `{ id, row }`, a menu item or the footer button;
- `dv-layout`: `{ layout }`.

They carry a `dv-` prefix (decided 2026-10-15) so they don't collide with other libraries' or
the platform's generic names.

**Delete:** the list only offers it. The host asks for confirmation, as pages do today. For
HTML-only pages, a menu item with `confirm="Delete this recipe?"` gets a built-in `<dialog>`
confirmation before `dv-action` fires.

### HTML only

```html
<script type="module" src="/js/data-viewer.standalone.js"></script>
<script type="module" src="/js/data-viewer-pammy.js"></script>
<lfdln-data-viewer label="Recipes" adapter="pammy" src="/api/data/recipes" url-state="r"
             card-title="name" card-picture="photo" card-facts="cuisine,minutes" card-meta="updated_at">
  <lfdln-dv-column key="name" label="Name" sortable></lfdln-dv-column>
  <lfdln-dv-column key="minutes" label="Minutes" type="number" sortable></lfdln-dv-column>
  <lfdln-dv-column key="updated_at" label="Changed" type="date"></lfdln-dv-column>
</lfdln-data-viewer>
```

- **Adapter contract:** `load(query, { signal }) → Promise<{ rows, total? }>`. An adapter that sends
  back no `total` means "all rows, page them in the browser".
- **`json`:** fetches `src` with `?page&search&sort&dir&view`. It accepts an array, or
  `{ rows, total }`.
- **`pammy`:** the panel's data API, with its own paging and search. Its exact query format is
  checked against `packages/*/src` at DV-4.
- **Failure:** a failed load shows "Couldn't load this list." with Try again and keeps the last rows.
  A newer query cancels the one still running (`AbortController`).

## Look and accessibility

- **Even spacing (house style, momolig 2026-10-17).** Padding and margins are even unless momolig
  says otherwise: left equals right, top equals bottom. That includes the visible gaps, not only
  the CSS values: the space after a chevron or a trailing icon equals the space before the text,
  and a control at a card's or a bar's edge sits as far from that edge on both sides. Check it in
  the browser (the e2e tests measure it), not only in the stylesheet.
- **Dropdowns (momolig 2026-10-17): a styled native select.** Every `<select>` in the packages
  (Search in, Sort by, Rows per page) is the `select` package's `<lfdln-select>` / `renderSelect`:
  a real `<select>` with `appearance: none`, an SVG chevron in `currentColor` and even spacing
  (`--select-pad-x` before the text and after the chevron, `--select-chevron-size`,
  `--select-gap`). The open list, events, forms, keyboard, screen readers and the phone picker
  stay native. A page keeping its own plain select opts in with `class="lfdln-select"`.
- **Pop-ups (momolig 2026-10-17)** share one set of spacing tokens, each with its default as the
  fallback: `--lfdln-pop-inset` (a menu list's own padding, 0.25rem), `--lfdln-pop-item-x` /
  `-y` (its items and headings, 0.65rem / 0.45rem), `--lfdln-pop-pad-x` / `-y` (a panel's, a
  sheet's or a dialog's, 16px / 12px). The ⋯ and More menus, the confirm dialog, the Filter
  panel and its phone sheet use them; e2e checks left = right and top = bottom (±1 px).
- **Loading (momolig 2026-10-17).** No stepwise build-up: before its script, the
  `data-viewer-loading.css` skeleton keeps the space; after it, the viewer's own skeleton (bar and
  rows or cards, in the coming layout) until the first page is drawn whole; then `ready` and
  `dv-ready` (once). Later loads only set `busy`. Customisable with `slot="loading"` and
  `loading-label`; still under `prefers-reduced-motion`.

- Class names `dv-root`, `dv-bar`, `dv-table`, `dv-card`, `dv-card-head`, … are documented, because
  they are the styling interface. Built-in rules sit inside `:where()`, so any page rule wins.
- **Variables:** `--dv-bg`, `--dv-surface`, `--dv-text`, `--dv-muted`, `--dv-border`, `--dv-accent`,
  `--dv-danger`, `--dv-radius`, `--dv-font`. Each has a plain default, so the list looks finished with
  no CSS at all, light and dark, following the page's `color-scheme` through `light-dark()` (decided
  2026-10-15): a page with no color-scheme, or `light`, stays light on a dark system.
- **Table:** a real `<table>`, sorting buttons in the header, and `aria-sort` on the sorted column.
- **Pages:** "Showing 1–20 of 54" and the page number are in a polite live region.
- **⋯ menu:** built here, because Radix is React only. It uses the browser's `popover` (the top
  layer, so it isn't clipped), says it opens a menu (`aria-haspopup`, `aria-expanded`), and supports
  arrow keys, Home/End, Escape and a click outside. Focus goes back to the button, and danger items
  come last after a line. A disabled item says why.
- **Phones:** 44px targets, cards by default, and no sideways page scroll (the table scrolls inside
  its own box).
- Focus is always visible (`:focus-visible` ring in `--dv-accent`).

## Built and checked with

- TypeScript, Lit 3, Vite library mode, emitted `.d.ts`.
- **DV-1 tests:** node:test on the logic, no browser (search, sort including dates and money, views,
  pages, formatting, address read/write).
- **Browser tests:** Playwright in Chromium, using the server's cached chromium_headless_shell (no
  WebKit on this server), against a demo page with both modes, the HTML-only form, a phone width,
  dark mode, and keyboard-only use of the menu.
- A size check in the build: the standalone script under 30 KB gzipped.

## The steps

1. **DV-1 The logic:** pure functions and their tests.
2. **DV-2 The tag:** table, cards, search, views, pages, layout switch, address.
3. **DV-3 Cards, menu, events:** the card parts, the ⋯ menu, `dv-open`/`dv-action`, and the built-in
   confirm.
4. **DV-4 Adapters and HTML only:** `json`, `pammy`, `<lfdln-dv-column>`, `card-*` attributes, failure and
   cancelling.
5. **DV-5 Builds, demo, docs:** both builds, the size check, a README with every property, class
   name and variable, and the browser tests. Then, **with your OK at each step**: the GitHub repo,
   then the first npm publish (`0.1.0`).
6. **DV-5b Search and filter (built 2026-10-15, branch `filter-search`):** the search and filter
   packages (`<lfdln-search>`, `<lfdln-filter>`, `<lfdln-filter-chips>`), columns marked `searchable`
   and `filterable`, browser-mode options and counts, `facets` for server mode, `in` and `f.<key>` in
   the address and the json adapter, `supports` on adapters (pammy: one exact value per column), and
   examples 9 and 10 on the sample page. Plan: `docs/plan-filter-search.md`.
7. **DV-6 The panel switches (separate, after you've used it):** `@panel/dataviewer` becomes a React
   wrapper (a React cell is drawn with `render` into a node). Studio records and the shop admin
   switch, and their e2e tests must pass unchanged.

## Open questions for momolig

- DV-Q1 npm: ANSWERED, her npm user is `lesfleursdelanuitdev`, so the package is `@lesfleursdelanuitdev/data-viewer`. (Old note:) publishing as `@lesfleursdelanuitdev/…` needs an npm account or organisation called
  `lesfleursdelanuit`. Do you have one? If not, you'd create it (free for public packages). I can't
  do it for you.
- DV-Q2 GitHub: ANSWERED, public repo `lesfleursdelanuitdev/data-viewer`.
- DV-Q3 Licence: ANSWERED, MIT.
- DV-Q4 Tag name: ANSWERED, `<lfdln-data-viewer>` (confirmed by momolig).
