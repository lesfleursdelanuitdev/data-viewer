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
- the whole card opens the thing (`href` or the `open` event). The menu and the footer's button
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
- **From a server:** set `rows` (one page) and `total`. Every change fires a `query` event:
  `{ page, search, sort, dir, view }`. The host loads that page and sets `rows`/`total` again. Until
  then the list shows it is busy (`aria-busy`). Typing in the search box waits 300ms before the
  query goes out, as today.

### Other properties

`label` (what the list is called, for screen readers), `views` (`{key, label, count?, where?}`; in
the browser `where(row)` filters), `pageSize` (default 20), `layout` (`table` | `cards`),
`rememberAs` (keeps table-or-cards in localStorage under this key; no switch without it),
`compact` (no bar and no pages, for a list inside another card), `words` (every piece of text,
English defaults), `state` (to hand it page, search, sort, dir and view from outside).

### Address

Opt-in: `url-state="orders"` keeps the state in the address as `orders.page`, `orders.search`, …, so
two lists on one page don't clash, and Back, a reload and a bookmark come back to the same list.
Without it the state is in the element. A React wrapper can drive it from the router through `state`
and the `query` event instead.

### Events

All of them bubble and are `composed`:

- `query`: what to show changed (both modes);
- `open`: `{ row }`, a card or first cell pressed when there is no `href`;
- `action`: `{ id, row }`, a menu item or the footer button;
- `layout`: `{ layout }`.

**Delete:** the list only offers it. The host asks for confirmation, as pages do today. For
HTML-only pages, a menu item with `confirm="Delete this recipe?"` gets a built-in `<dialog>`
confirmation before `action` fires.

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
  no CSS at all, light and dark (`prefers-color-scheme`).
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
3. **DV-3 Cards, menu, events:** the card parts, the ⋯ menu, `open`/`action`, and the built-in
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
