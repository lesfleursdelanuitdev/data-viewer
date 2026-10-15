# Custom cards: your own card markup in `<lfdln-data-viewer>`

Status: BUILT 2026-10-15 on branch `custom-cards` (CC-1..CC-4), not merged. Deviations found while building are listed in the CC-2..CC-4 commit messages.

## Goal

Let a page or app design its own card and have the viewer reuse it for every row, while the viewer
keeps what is hard to get right: the card's list item, the grid, opening by click and keyboard, focus,
screen-reader names, menus and the confirm dialog.

Two audiences, one result:
- people writing plain HTML, with no script of their own (the same audience as `config="…"` and the
  `card-*` attributes);
- app developers, in plain JS, Lit, or React (and any other framework through the same hook).

Success: a plain HTML page can make a fully custom card with no JavaScript; a React app can render
its own React component as each card; both keep keyboard opening, menus and `dv-*` events working.

## Decisions

| # | Decision |
|---|----------|
| C1 | Both audiences: an HTML `<template>` and functions in code. |
| C2 | The viewer keeps the behaviour (option A): it owns the `<li>`, the grid, opening, focus and the accessible name; the template draws everything inside. |
| C3 | Fields go in with braces: `{{name}}`, in text and in attribute values. |
| C4 | React components can be cards, through a framework-neutral mount hook (`cardMount`); the React wrapper (DV-6) builds `renderCard` on it later. |
| C5 | Several lists can share one template by id (`card-template="plant-card"`). |
| C6 | A row's menu items still come only from `cardOf(row).menu` (there is no list-wide menu). Menu items written in HTML are out of scope. |

## API

### 1. HTML template

A `<template card>` child of the list, or any `<template id="…">` on the page named by
`card-template`:

```html
<lfdln-data-viewer label="Plants" adapter="json" src="plants.json">
  <lfdln-dv-column key="name" label="Plant"></lfdln-dv-column>
  <lfdln-dv-column key="price" label="Price" type="money" currency="EUR"></lfdln-dv-column>
  <template card>
    <img src="{{picture}}" alt="" data-if="picture">
    <h3 data-open>{{name}}</h3>
    <span class="badge" data-if="light">{{light}}</span>
    <p class="price">{{price}}</p>
    <button type="button" data-action="aside">Put one aside</button>
    <dv-menu></dv-menu>
  </template>
</lfdln-data-viewer>

<!-- shared: -->
<template id="plant-card">…</template>
<lfdln-data-viewer card-template="plant-card" …></lfdln-data-viewer>
<lfdln-data-viewer card-template="plant-card" …></lfdln-data-viewer>
```

If both are present, `card-template` wins over the child.

### 2. `cardTemplate` (Lit or plain JS)

```ts
list.cardTemplate = (row, pieces) => html`
  <h3 data-open>${row.name}</h3>
  <p>${row.price}</p>
  ${pieces.actions}${pieces.menu}`;
// or return a DOM element built by hand
```

Type: `cardTemplate?: (row: T, pieces: CardPieces<Content>) => Content`. `pieces.menu` and
`pieces.actions` are Lit content (render nothing when the row has no menu items). `pieces.text(key)`
returns a field formatted like its column (the same text `{{key}}` gives).

### 3. `cardMount` (React and any framework)

```ts
list.cardMount = (el, row, pieces) => {
  const root = createRoot(el);
  root.render(<PlantCard plant={row} menu={pieces.menu} />);
  return () => root.unmount();
};
```

Type: `cardMount?: (el: HTMLElement, row: T, pieces: CardPieces<HTMLElement>) => void | (() => void)`.
Here `pieces.menu` and `pieces.actions` are DOM elements the viewer keeps up to date; the app appends
them where it wants (in React: a ref and `appendChild` in an effect). `el` is an empty
`<div class="dv-card-mount">` inside the card's `<li>`.

### Precedence

`cardMount` > `cardTemplate` > `card-template` / `<template card>` > `cardOf` / `card-*` > the
default card. The table view does not change: it keeps using `cardOf` / `card-*` / columns.

`configure()` and setup files accept `cardTemplate` and `cardMount`; `defineList<Row>` types both
(row typed as `Row`).

## Markers (all three forms)

| Marker | Meaning |
|--------|---------|
| `{{key}}` | The row's field, as text. A column key is formatted like that column (`{{price}}` → `€6.50`); any other key gives the plain value. `{{a.b}}` reads nested fields. Missing → empty string. HTML template only. |
| `data-if="key"` | The element is removed when the field is empty (`undefined`, `null`, `''`, or an empty array). HTML template only. |
| `data-open` | This element becomes the card's open control (see Opening). |
| `data-action="id"` | A click fires `dv-action` with `{ id, item: { id, label }, row }` (label = the element's text). Same handling as a menu item, minus confirm. |
| `<dv-menu>` / `pieces.menu` | The row's ⋯ menu (from `cardOf(row).menu`), with confirm for `confirm` items. |
| `<dv-actions>` / `pieces.actions` | The row's menu items as footer buttons, laid out per `card-actions` (`wrap`/`row`, `card-actions-max`), overflow in a More menu. |

After filling, `data-if` is removed from the copy; `data-open` and `data-action` stay on their
elements (the viewer's CSS and its click listener find them by these attributes).

## Safety

- Field values are inserted as text (`textContent`, `setAttribute`), never parsed as HTML.
- In `href`, `src`, `srcset`, `action`, `formaction`, `poster` and `xlink:href`, a value with
  a placeholder goes through the viewer's existing `safeUrl()`; an unsafe result removes the attribute.
- A placeholder inside an `on…` attribute or `style` is refused: the attribute is dropped and the
  console warns once per template.
- The template itself is the page author's markup and is trusted as written (its own `<script>`s
  never run: template content is inert and copies are made with `importNode` into the list).

## How it works

**Reading.** The `<template card>` child is read at the same moment as the `<lfdln-dv-column>`
children (before the viewer replaces its children). `card-template` is looked up with
`document.getElementById` on first draw and again when the attribute changes; a missing id gives a
one-time console warning and the built-in card.

**Compiling.** One pass over the template content records a plan: paths to text nodes and attributes
with `{{…}}` (split into fixed and field parts), `data-if` elements, the `data-open` element (else the
first `h1`–`h6`), `data-action` elements, and `<dv-menu>` / `<dv-actions>` spots. The plan is cached
per template element (rebuilt when `card-template` changes or the child is replaced).

**Filling.** Per row: `importNode(content, true)`, fill by the recorded paths, remove `data-if`
elements whose field is empty, render the menu / actions with Lit into their spots.

**Keeping cards stable.** Built cards are cached in a `WeakMap` keyed by row object, together with the
plan they came from; Lit's `repeat` keys the `<li>`s by row object. A re-draw (menu opens, focus
moves, busy state) reuses the same nodes, so focus and scroll aren't lost. A card is rebuilt only when
its row object or the template changes. The menu/actions spots are re-rendered on every draw (cheap,
Lit diffing).

**Opening.** The open control is the `data-open` element, else the first heading. Its contents are
wrapped in an `<a href>` (when `cardOf(row).href` or `card-href` gives one) or a `<button>` that
fires `dv-open`, with the class the built-in card uses to stretch the hit area over the whole card
(`::after` covering the `<li>`); other buttons and links in the card sit above it and keep their own
clicks. The `<li>` gets `aria-labelledby` pointing at that control. No heading and no `data-open`: the
card can't be opened, and the console says so once. Opening follows the existing rules (`open-event`
on HTML-only pages, `_opens`).

**Opening in the function forms.** The viewer never changes markup it didn't copy itself (React
and Lit own theirs). So in `cardTemplate` and `cardMount`, `data-open` goes on the app's own
`<a href>` or `<button>`. The viewer's CSS stretches any `[data-open]` over its card, and one delegated
click listener on the list fires `dv-open` for a `[data-open]` that is not a link. The `<li>`'s
`aria-labelledby` is set after each viewer update when the control is there (and on first focus inside
the card otherwise). The same delegated listener handles `data-action` in all three forms.

**cardTemplate.** The function's result is rendered into the `<li>` with Lit.

**cardMount.** The `<li>` holds `<div class="dv-card-mount">`. After Lit commits (`updated()`), the
viewer calls `mount` for rows that are new on the page and the cleanup for rows that left (new page,
search, filter, sort, new `rows`, layout switched to table, element disconnected). A mount that throws
leaves that card empty with a `console.error`; other cards are unaffected.

**Styling.** The `<li>` keeps `.dv-card` sizing in the grid but none of the built-in card's inner
styles; it gets `.dv-card-custom`. Built-in pieces keep their classes (`.lfdln-menu…`,
`.lfdln-card-actions…`). README documents a starter CSS block.

## Size

Expected about +2 KB gzipped for the standalone viewer; the limit (45 KB) is raised to 48 KB only if
needed, with the measured number in the commit.

## Tests

Unit (node:test, existing core tests):
- compiling: text and attribute placeholders, several in one string, nested keys, `on…` / `style`
  refused, unsafe addresses dropped, `data-if` with empty values, first heading as open control;
- filling: column formatting, missing fields, arrays.

Browser (Playwright, viewer e2e):
- `<template card>` child; one `card-template` id shared by two lists;
- `cardTemplate` returning Lit, and returning a DOM element;
- `cardMount`: mount/cleanup counts across page change, search, new `rows`, switch to table, removal;
  a throwing mount empties only its card;
- opening by click, Enter and `href`; `data-action` → `dv-action` with the row; `<dv-menu>` and
  `<dv-actions>` including confirm;
- focus stays on a menu button when its menu opens (no card rebuild);
- accessible name of each `<li>`;
- missing `card-template` id → built-in card + one warning;
- no sideways scroll at 390px with a custom card.

## Docs

- README: "Your own cards" under Cards (three forms, markers table, safety, starter CSS, React example
  with `createRoot`); Properties table gains `cardTemplate`, `cardMount`, `card-template`.
- Site: new page **Custom cards** (`/docs/custom-cards/`) in "The list" group, after Setup file &
  row menus. Live demo of the HTML template card; code tabs HTML, Lit, React. Reference = the new
  README section (added to `site/reference-map.mjs`).

## Steps

| Step | What |
|------|------|
| CC-1 | Template compiler + filler (pure module, unit tests). |
| CC-2 | Viewer: `<template card>` / `card-template`, card cache, open control, `data-action`, `<dv-menu>` / `<dv-actions>`; e2e. |
| CC-3 | `cardTemplate` and `cardMount` (+ `configure` / `defineList` types); e2e. |
| CC-4 | README section, site page + reference map, size check, `npm run check`. |

Local commits per step on `custom-cards`; merge into main, push and redeploy only with momolig's OK.
The worktree needs one `npm install` (workspace links) before CC-1, run by momolig.

## Out of scope

The React wrapper (DV-6, which will offer `renderCard` on top of `cardMount`); templates for table
rows; menu items written in HTML; the standalone `<lfdln-card>`.
