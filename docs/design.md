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

- **header:** title (two lines at most, the whole of it on hover), badge, and the ⋯ menu at the
  upper right;
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
6. **DV-6 The panel switches (separate, after you've used it):** `@panel/dataviewer` becomes a React
   wrapper (a React cell is drawn with `render` into a node). Studio records and the shop admin
   switch, and their e2e tests must pass unchanged.

## Open questions for momolig

- DV-Q1 npm: ANSWERED, her npm user is `lesfleursdelanuitdev`, so the package is `@lesfleursdelanuitdev/data-viewer`. (Old note:) publishing as `@lesfleursdelanuitdev/…` needs an npm account or organisation called
  `lesfleursdelanuit`. Do you have one? If not, you'd create it (free for public packages). I can't
  do it for you.
- DV-Q2 GitHub: ANSWERED, public repo `lesfleursdelanuitdev/data-viewer`.
- DV-Q3 Licence: ANSWERED, MIT.
- DV-Q4 Tag name: ANSWERED, `<lfdln-data-viewer>` (confirmed by momolig).
