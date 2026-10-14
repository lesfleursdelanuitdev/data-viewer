# data-viewer

`<lfdln-data-viewer>` shows a list of rows as a table or as cards. It has search, sorting, views,
pages, a ⋯ menu per row, and a phone layout. It is a [Lit](https://lit.dev) web component, so it
works on a plain HTML page and in any framework.

- It draws into the page itself (no shadow root), so your CSS reaches every part of it.
- Its own look is plain and finished, in light and dark, with no CSS from you.
- It never fetches anything unless you load an adapter (see [Adapters](#adapters)).

## Install

```sh
npm install @lesfleursdelanuitdev/data-viewer lit
```

Lit is a peer dependency (`lit@^3.3.3`), so your app and the viewer share one copy.

## Two ways to load it

| File | For | Registers the tags |
|---|---|---|
| `@lesfleursdelanuitdev/data-viewer` (`dist/data-viewer.js`) | apps with a bundler; Lit is left out | No: you call `define()` |
| `dist/data-viewer.standalone.js` | plain pages; Lit is inside (about 17 KB gzipped) | Yes, on load |

### In an app

Importing the package registers nothing. Call `define()` once, before the tag is used:

```ts
import { define } from '@lesfleursdelanuitdev/data-viewer';

define(); // <lfdln-data-viewer> and <lfdln-dv-column>
```

`define(name, columnName)` registers the tags under other names, for a page where
`lfdln-data-viewer` is taken. A name that is already registered is left alone, so calling
`define()` twice is safe.

### On a plain page

```html
<script type="module" src="/js/data-viewer.standalone.js"></script>
```

Copy `dist/data-viewer.standalone.js` from the package to your site, or load it from a CDN that
serves npm packages, for example
`https://cdn.jsdelivr.net/npm/@lesfleursdelanuitdev/data-viewer@0.1.0/dist/data-viewer.standalone.js`.
It registers both tags when it loads. It also exports everything the package exports, so a page
script can do `import { registerAdapter } from '/js/data-viewer.standalone.js'`.

## A first list

```html
<lfdln-data-viewer id="recipes" label="Recipes"></lfdln-data-viewer>
<script type="module">
  const list = document.querySelector('#recipes');
  list.columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'minutes', label: 'Minutes', type: 'number', sortable: true },
    { key: 'updated', label: 'Changed', type: 'date' },
  ];
  list.rows = [
    { id: 1, name: 'Rose jam', minutes: 45, updated: '2026-10-01' },
    { id: 2, name: 'Lemon tart', minutes: 90, updated: '2026-10-12' },
  ];
  list.addEventListener('open', (e) => console.log('open', e.detail.row));
</script>
```

## Rows: two modes

**In the browser.** Set `rows` to all the rows and leave `total` unset. The viewer searches,
sorts, filters by view and pages them itself.

**From a server.** Set `rows` to one page and `total` to the number of rows on the server. Every
change (page, search, sort, view) fires a `query` event with `{ page, search, sort, dir, view }`.
Load that page, then set `rows` and `total` again. Until you do, the list is busy
(`aria-busy="true"` on `.dv-root`, and the `busy` attribute on the element). Set `rows` or
`total` even when the answer is the same, so the busy state clears. You may answer inside the
`query` listener or later.

The search box waits 300 ms after the last key before the query goes out.

## In React

Set the properties and listen to the events through a `ref`:

```tsx
import { useEffect, useRef } from 'react';
import {
  define, type LfdlnDataViewer, type Column, type Query,
} from '@lesfleursdelanuitdev/data-viewer';

define();

type Order = { id: number; customer: string; total: number; placed: string };

const columns: Column<Order>[] = [
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'total', label: 'Total', type: 'money', format: { currency: 'EUR' }, sortable: true },
  { key: 'placed', label: 'Placed', type: 'date', sortable: true },
];

export function Orders({ rows, total, onQuery, onOpen }: {
  rows: Order[];
  total: number;
  onQuery: (q: Query) => void;
  onOpen: (o: Order) => void;
}) {
  const ref = useRef<LfdlnDataViewer<Order>>(null);

  // Properties: set them whenever they change.
  useEffect(() => {
    const el = ref.current!;
    el.columns = columns;
    el.cardOf = (o) => ({
      title: o.customer,
      meta: new Date(o.placed).toLocaleDateString(),
      value: `€${o.total.toFixed(2)}`,
      menu: [{ id: 'refund', label: 'Refund', danger: true }],
    });
    el.rows = rows;
    el.total = total;
  }, [rows, total]);

  // Events: add the listeners once, remove them on the way out.
  useEffect(() => {
    const el = ref.current!;
    const query = (e: Event) => onQuery((e as CustomEvent<Query>).detail);
    const open = (e: Event) => onOpen((e as CustomEvent<{ row: Order }>).detail.row);
    el.addEventListener('query', query);
    el.addEventListener('open', open);
    return () => {
      el.removeEventListener('query', query);
      el.removeEventListener('open', open);
    };
  }, [onQuery, onOpen]);

  return <lfdln-data-viewer ref={ref} label="Orders" url-state="orders" />;
}
```

TypeScript needs to know the tag once in your app:

```ts
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'lfdln-data-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        label?: string; 'url-state'?: string; layout?: 'table' | 'cards'; 'remember-as'?: string;
      };
    }
  }
}
```

## In Lit

```ts
import { LitElement, html } from 'lit';
import { define, type Column, type Query } from '@lesfleursdelanuitdev/data-viewer';

define();

type Recipe = { id: number; name: string; minutes: number };
const columns: Column<Recipe>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'minutes', label: 'Minutes', type: 'number', sortable: true },
];

class RecipePage extends LitElement {
  static properties = { rows: { state: true }, total: { state: true } };
  declare rows: Recipe[];
  declare total: number;

  constructor() {
    super();
    this.rows = [];
    this.total = 0;
  }

  render() {
    return html`<lfdln-data-viewer label="Recipes"
      .columns=${columns} .rows=${this.rows} .total=${this.total}
      .cardOf=${(r: Recipe) => ({ title: r.name, facts: [`${r.minutes} min`] })}
      @query=${(e: CustomEvent<Query>) => this.load(e.detail)}
      @action=${(e: CustomEvent<{ id: string; row: Recipe }>) => console.log(e.detail)}
    ></lfdln-data-viewer>`;
  }

  // The first page; after that, each query event asks for the next one.
  firstUpdated() {
    void this.load({ page: 1, search: '', sort: '', dir: 'asc', view: '' });
  }

  async load(q: Query) {
    const res = await fetch(`/api/recipes?page=${q.page}&search=${encodeURIComponent(q.search)}`);
    ({ rows: this.rows, total: this.total } = await res.json());
  }
}
customElements.define('recipe-page', RecipePage);
```

## HTML only

With an adapter, a page needs no script of its own. Columns are `<lfdln-dv-column>` children, and
the cards come from `card-*` attributes:

```html
<script type="module" src="/js/data-viewer.standalone.js"></script>
<script type="module" src="/js/data-viewer-pammy.js"></script>

<lfdln-data-viewer label="Recipes" adapter="pammy" src="/_pammy/api/data/postgres/recipes/recipes"
    url-state="r" page-size="20"
    card-title="name" card-picture="photo" card-facts="cuisine,minutes" card-meta="updated_at">
  <lfdln-dv-column key="name" label="Name" sortable></lfdln-dv-column>
  <lfdln-dv-column key="minutes" label="Minutes" type="number" sortable></lfdln-dv-column>
  <lfdln-dv-column key="updated_at" label="Changed" type="date"></lfdln-dv-column>
</lfdln-data-viewer>
```

The viewer reads the columns before it first draws, then replaces its children with the list.
Columns set with the `columns` property win over `<lfdln-dv-column>` children.

## Properties and attributes

| Property | Attribute | Type | Default | What it does |
|---|---|---|---|---|
| `label` | `label` | string | `''` | What the list is called, for screen readers (on the table and the card list). |
| `columns` | (children) | `Column[]` | `[]` | The columns. See [Columns](#columns). |
| `rows` | none | `T[]` | `[]` | All rows (browser mode) or one page (server mode). |
| `total` | `total` | number | unset | Set it for server mode: how many rows the server has. |
| `cardOf` | none | `(row) => CardParts` | unset | Each row's card. See [Cards](#cards). |
| `views` | none | `View[]` | unset | Tabs such as All / Quick: `{ key, label, count?, where? }`. In browser mode `where(row)` filters. The list starts on view `''` (no filter), so give an "All" view the key `''`. |
| `pageSize` | `page-size` | number | `20` | Rows per page. |
| `layout` | `layout` (reflected) | `'table'` or `'cards'` | table, or cards on a phone | How the rows are drawn. |
| `rememberAs` | `remember-as` | string | unset | Keeps the table-or-cards choice in `localStorage` under this key, and shows the switch. Without it there is no switch. |
| `compact` | `compact` | boolean | `false` | No bar and no pages, for a short list inside another card. |
| `words` | none | `Partial<Words>` | `{}` | Replaces any of the text. See [Words](#words). |
| `state` | none | `Partial<Query>` | unset | Hands it page, search, sort, dir and view from outside (a router, say). |
| `searchKeys` | none | `string[]` | every column | The row keys search looks at. A key need not be a column. |
| `busy` | `busy` (reflected) | boolean | `false` | Waiting for rows. Set by the viewer; you can set it too. |
| `urlState` | `url-state` | string | unset | Keeps the state in the address under this prefix. See [Address](#address). |
| `adapter` | `adapter` | string | unset | The name of a registered adapter, such as `json` or `pammy`. |
| `src` | `src` | string | unset | The address the adapter loads from. |
| `cardTitle` | `card-title` | string | first column | Row key for the card's title. |
| `cardPicture` | `card-picture` | string | none | Row key for the card's picture address (web or relative addresses only). |
| `cardFacts` | `card-facts` | string | none | Comma list of row keys for the card's facts (two at most). |
| `cardMeta` | `card-meta` | string | none | Row key for the footer's left side (a time, say). |
| `cardValue` | `card-value` | string | none | Row key for the footer's right side (money, say). |
| `cardHref` | `card-href` | string | none | Row key for the address the card opens. |
| `text` | none (read only) | `Words` | | The words in use: the defaults with yours on top. |

`lang` on the element (or `format.locale` on a column) sets the locale for numbers, money and
dates. Without it the browser's own locale is used.

The `card-*` attributes are used only when `cardOf` is not set. A `card-*` key that is also a
column is formatted the way that column is.

### `<lfdln-dv-column>` attributes

| Attribute | What it does |
|---|---|
| `key` | The row key, and what sorting by this column is called. |
| `label` | The header text. Defaults to the key. |
| `type` | One of the [column types](#column-types). Anything else is `text`. |
| `sortable` | Present: the header is a sorting button. |
| `align` | `left` or `right`. |
| `currency` | For `type="money"`, such as `EUR`. Defaults to `USD`. |

## Columns

```ts
type Column<T> = {
  key: string;                  // also what sorting by it is called
  label: string;
  type?: 'text' | 'number' | 'money' | 'date' | 'badge' | 'image' | 'link' | 'tags' | 'bool';
  value?: (row: T) => unknown;  // default: row[key]
  render?: (row: T) => string | Node | TemplateResult;  // replaces the type's drawing
  sortable?: boolean;
  align?: 'left' | 'right';     // numbers and money default to right
  format?: { currency?: string; locale?: string; date?: Intl.DateTimeFormatOptions };
};
```

### Column types

| Type | Shows |
|---|---|
| `text` | The value as text. Objects, `NaN` and `Infinity` show as empty. |
| `number` | `Intl.NumberFormat`, right-aligned. |
| `money` | `Intl.NumberFormat` with `format.currency` (default `USD`), right-aligned. |
| `date` | `Intl.DateTimeFormat` with `format.date` (default `{ dateStyle: 'medium' }`). Takes a `Date`, a date string or a time in ms. |
| `badge` | The text in a `.dv-badge` pill. |
| `image` | An `<img>` (lazy-loaded). |
| `link` | An `<a>` with the value as both address and text. |
| `tags` | An array, joined with commas. |
| `bool` | `Yes` or `No`. |

Search and sorting use the values: dates sort as dates, numbers and money as numbers. Missing
values sort last in both directions.

Row text is always escaped. Only `render` returning a `Node` or a Lit `TemplateResult` can add
markup. Links and pictures from rows are kept only when they are `http:`, `https:`, `mailto:`,
`tel:` or relative addresses; anything else (`javascript:`, `data:`) is dropped.

## The table

- It is a real `<table>`. Sortable headers are buttons, and the sorted column has `aria-sort`.
- The first column is each row's header (`<th scope="row">`). It is the way in: a link when the
  row's card has `href`, otherwise a button that fires `open`. When the card has a `picture`, a
  small square of it sits beside the first cell. A `link` column or a column with `render` keeps
  its own content there, so nothing nests.
- The last column is the row's ⋯ menu. Its header is hidden text ("What you can do").
- A wide table scrolls inside its own box (`.dv-table-wrap`), never the page.

## Cards

`cardOf(row)` returns the card's parts:

```ts
type CardParts = {
  title: string;
  href?: string;
  badge?: Content;
  picture?: Content;
  facts?: Content[];
  meta?: Content;
  value?: Content;
  action?: { id: string; label: string; href?: string };
  menu?: MenuItem[];
};
type Content = string | Node | TemplateResult;
```

The card rules:

- **Header:** the title, two lines at most (the whole title shows on hover), a badge, and the ⋯
  menu at the upper right.
- **Body:** a picture, the same 4:3 shape on every card, and two facts at most. Extra facts are
  dropped. Nothing in the body can be pressed.
- **Footer:** `meta` (a time, say) on the left, `value` (money, say) on the right, and at most one
  button (`action`). An action with `href` is a link; without it, pressing it fires `action`.
- **The whole card opens the thing:** a click anywhere follows `href`, or fires `open` when there
  is no `href`. The ⋯ menu and the footer button stay separate buttons.

Without `cardOf`, the `card-*` attributes make the card. Without those either, the first column is
the title and the next two columns are the facts.

The same `CardParts` drive the table: `href` and `picture` for the first cell, `menu` for the last.

## The ⋯ menu

```ts
type MenuItem = {
  id: string;
  label: string;
  href?: string;     // a link instead of an action
  danger?: boolean;  // shown last, after a line, in --dv-danger
  disabled?: boolean;
  why?: string;      // shown under a disabled item's label
  confirm?: string;  // asked in a built-in dialog before action fires
};
```

- Pressing an item without `href` fires `action` with `{ id, row }`.
- Danger items come last, after a line. The others keep your order.
- A disabled item can't be pressed, and says why when you give `why`.
- The viewer never deletes anything. Ask for confirmation in your `action` listener, or give the
  item `confirm: 'Delete this recipe?'` and the viewer asks in a `<dialog>` first. Its OK button
  carries the item's label. Cancel or Escape fires nothing.
- The keyboard: Enter, Space or ↓ opens it on the first item, ↑ on the last. ↑ ↓ Home End move,
  Escape and Tab close it, and focus goes back to the ⋯ button. A click outside closes it too.
- It opens in the top layer (`popover`), so a scrolling box never clips it.

## Events

All events bubble and are `composed`.

| Event | `detail` | When |
|---|---|---|
| `query` | `{ page, search, sort, dir, view }` | What to show changed, in both modes. `dir` is `'asc'` or `'desc'`. |
| `open` | `{ row }` | A card or a first cell was pressed and the row has no `href`. |
| `action` | `{ id, row }` | A menu item or the footer button was pressed (after its confirm, if any). |
| `layout` | `{ layout }` | The table-or-cards switch changed. |

## Address

`url-state="orders"` keeps the list's state in the address as `orders.page`, `orders.search`,
`orders.sort`, `orders.dir` and `orders.view`. Defaults are left out, so a fresh list has a clean
address. Two lists with different prefixes don't clash. Back, a reload and a bookmark come back to
the same list. A search replaces the address entry; other changes add one. Without `url-state` the
state lives in the element.

## Adapters

An adapter loads rows for a list with `adapter` and `src`, so an HTML page needs no script. An
answer with a total puts the list in server mode (each change loads again). An answer without one
is every row, and the list pages it in the browser.

| Import (apps) | Script (plain pages) | `adapter=` |
|---|---|---|
| `@lesfleursdelanuitdev/data-viewer/adapters/json` | `dist/data-viewer-json.js` | `json` |
| `@lesfleursdelanuitdev/data-viewer/adapters/pammy` | `dist/data-viewer-pammy.js` | `pammy` |

Importing an adapter registers it. Load order doesn't matter: a list waits for its adapter's
script. The page's cookies are sent (`credentials: 'same-origin'`), so a signed-in visitor sees
what they may see.

### json

`GET src` with `page`, `search`, `sort`, `dir` and `view` added (only the ones that differ from
the defaults, so the first load asks for `src` as written). The answer is either an array (every
row) or `{ rows, total }` (one page). `{ rows }` without a total is every row too.

### pammy

The data API of a pammy panel ("Where programs ask"). `src` is the list's address:
`/_pammy/api/data/<engine>/<name>/<resource>`, for example
`/_pammy/api/data/postgres/recipes/recipes`. Filters written into `src`
(`?where.published=true`) are kept. It sends `page`, `per`, `search`, `sort` and `dir`. The API
pages and searches on the server, so the list is in server mode. Its limits:

- **`per` is 100 at most.** Keep `page-size` at 100 or less.
- **Only columns the catalog marks sortable sort.** Sorting by any other column quietly falls back
  to the table's key order, so mark only those columns `sortable`.
- It has no views, so `view` is not sent.

### Your own adapter

```ts
import { registerAdapter, type Adapter } from '@lesfleursdelanuitdev/data-viewer';

const mine: Adapter = {
  async load(q, { signal, src, pageSize }) {
    const res = await fetch(`${src}?p=${q.page}&q=${encodeURIComponent(q.search)}`, { signal });
    if (!res.ok) throw new Error(`Couldn't load ${src}: ${res.status}`);
    const body = await res.json();
    return { rows: body.items, total: body.count }; // leave total out for "every row"
  },
};
registerAdapter('mine', mine);
```

A newer query aborts `signal` for the one still running. Only the latest answer is used, even
from an adapter that ignores the signal. A thrown error shows "Couldn't load this list." with a
Try again button, keeps the last rows, and logs the error to the console.

The registry lives on `globalThis.__lfdlnDataViewerAdapters`, so the standalone viewer and the
standalone adapter scripts share it.

## Words

Every piece of text, with its English default. Set any of them through `words`:

```js
list.words = { search: 'Chercher', showing: (from, to, total) => `${from}–${to} sur ${total}` };
```

| Key | Default |
|---|---|
| `search` | `Search` (the box's label and placeholder) |
| `views` | `Views` (the views' label) |
| `pages` | `Pages` (the page buttons' label) |
| `previous` | `Previous` |
| `next` | `Next` |
| `showTable` | `Show a table` |
| `showCards` | `Show cards` |
| `actions` | `What you can do` (the menu column's hidden header) |
| `empty` | `Nothing to show.` |
| `loadFailed` | `Couldn't load this list.` |
| `tryAgain` | `Try again` |
| `cancel` | `Cancel` (the confirm dialog) |
| `ok` | `OK` (the confirm dialog, when the item has no label) |
| `menuFor(title)` | `What you can do with ${title}` (each ⋯ button's name) |
| `showing(from, to, total)` | `Showing ${from}–${to} of ${total}` |
| `pageOf(page, pages)` | `Page ${page} of ${pages}` |

The numbers handed to `showing` and `pageOf` are already formatted for the locale.
`defaultWords` is exported.

## Styling

The viewer adds one `<style id="lfdln-dv-style">` as the first child of `<head>`. Every rule in it
sits inside `:where()`, which has no specificity, so any rule of yours wins. Two rules can't be
inside `:where()`, because pseudo-elements can't: `.dv-card-link::after` (the layer that makes
the whole card open it) and `.dv-confirm::backdrop`. To change those, use a selector with at least
one class, such as `.dv-card .dv-card-link::after`.

### Variables

Each has a default for light and for `prefers-color-scheme: dark`. Set them on `:root` or on the
element:

| Variable | Light | Dark | Used for |
|---|---|---|---|
| `--dv-bg` | `#ffffff` | `#17171a` | The list's background, inputs, the menu, the dialog |
| `--dv-surface` | `#f6f6f7` | `#222226` | Cards, buttons, table headers |
| `--dv-text` | `#1d1d20` | `#ececf0` | Text |
| `--dv-muted` | `#5e5e66` | `#a3a3ad` | Quieter text, the menu's border |
| `--dv-border` | `#d9d9de` | `#3a3a41` | Lines and borders |
| `--dv-accent` | `#2f5bd3` | `#8aa9ff` | Links, the focus ring, the chosen layout |
| `--dv-danger` | `#b42318` | `#ff8a80` | Danger items, the error box |
| `--dv-radius` | `8px` | `8px` | Corners |
| `--dv-font` | `system-ui, -apple-system, "Segoe UI", sans-serif` | same | The font |

```css
lfdln-data-viewer { --dv-accent: #8a3ffc; --dv-radius: 4px; }
.dv-card { box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); }
```

### Class names

These are the styling interface.

| Class | Part |
|---|---|
| `dv-root` | The whole list (has `aria-busy`) |
| `dv-bar` | The bar above the list: search, views, layout switch |
| `dv-search` | The search box |
| `dv-views` | The views (`<nav>` of links; the current one has `aria-current="true"`) |
| `dv-count` | A view's count |
| `dv-layout` | The table-or-cards switch (buttons with `aria-pressed`) |
| `dv-table-wrap` | The box the table scrolls in |
| `dv-table` | The `<table>` |
| `dv-right` | A right-aligned cell |
| `dv-open` | The first cell's link or button |
| `dv-row-head` | The first cell's picture and way in, together |
| `dv-row-picture` | The first cell's small picture |
| `dv-row-menu` | The last cell, with the ⋯ menu |
| `dv-cards` | The card list (`<ul>`) |
| `dv-card` | One card (`<li>`) |
| `dv-card-head` | The card's header |
| `dv-card-link` | The title's link or button (its `::after` covers the card) |
| `dv-card-title` | The title text |
| `dv-badge` | A badge (cards and `badge` columns) |
| `dv-card-body` | The card's body |
| `dv-card-picture` | The card's picture box |
| `dv-fact` | One fact |
| `dv-card-foot` | The card's footer |
| `dv-card-meta` | The footer's left side |
| `dv-card-value` | The footer's right side |
| `dv-card-action` | The footer's button or link |
| `dv-menu-wrap` | The ⋯ button and its menu, together |
| `dv-menu-button` | The ⋯ button |
| `dv-menu` | The menu (a popover) |
| `dv-menu-item` | One menu item |
| `dv-menu-label` | An item's label |
| `dv-menu-why` | Why an item is disabled |
| `dv-danger` | A danger item, or the confirm dialog's danger button |
| `dv-confirm` | The confirm `<dialog>` |
| `dv-confirm-buttons` | The dialog's buttons |
| `dv-pages` | The pages bar (`<nav>`) |
| `dv-page` | "Page 2 of 3" |
| `dv-empty` | "Nothing to show." |
| `dv-error` | The error box with Try again |
| `dv-sr` | Text for screen readers only |

### Phones

At 640 px wide or less:

- The list starts as cards, unless `layout` is set or a remembered choice exists.
- Buttons, inputs, view links and menu items are at least 44 px tall.
- The page never scrolls sideways. A table scrolls inside its own box.

## Accessibility

- Focus is always visible: a 2 px ring in `--dv-accent`.
- "Showing 1–20 of 54" and the page number are in a polite live region.
- Each ⋯ button is named after its row ("What you can do with Rose jam") and says it opens a menu
  (`aria-haspopup`, `aria-expanded`).
- Every piece of text can be replaced through `words`, except the `bool` column's Yes and No.

## Browser support

Tested in Chromium. It uses `popover` for the menu, `:has()` for the card's focus ring and
`<dialog>` for the confirm, so it needs a browser from 2024 or later (Chrome 114, Safari 17,
Firefox 125).

## Licence

MIT. See [LICENSE](LICENSE).
