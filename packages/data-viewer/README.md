# data-viewer

`<lfdln-data-viewer>` shows a list of rows as a table or as cards. It has search (with an optional
"Search in" picker), a filter with chips, sorting, views, pages, a ⋯ menu per row, and a phone layout. It is a [Lit](https://lit.dev) web component, so it
works on a plain HTML page and in any framework.

- It draws into the page itself (no shadow root), so your CSS reaches every part of it.
- Its own look is plain and finished, in light and dark (following your page's `color-scheme`), with no CSS from you.
- It never fetches anything unless you load an adapter (see [Adapters](#adapters)).

Its ⋯ menus, its pages, its cards, its search box and its filter are five packages of their own,
which work on any page without the viewer: [`@lesfleursdelanuitdev/menu`](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/menu#readme) (`<lfdln-menu>`),
[`@lesfleursdelanuitdev/pagination`](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/pagination#readme) (`<lfdln-pagination>`),
[`@lesfleursdelanuitdev/card`](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/card#readme) (`<lfdln-card>`),
[`@lesfleursdelanuitdev/search`](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/search#readme) (`<lfdln-search>`) and
[`@lesfleursdelanuitdev/filter`](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/filter#readme) (`<lfdln-filter>`, `<lfdln-filter-chips>`). The viewer draws with their
code, so it installs them with it; nothing about the viewer's own attributes or events changes.
`filter-style="search"` draws with a sixth,
[`@lesfleursdelanuitdev/search-filter`](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/search-filter#readme)
(`<lfdln-search-filter>`, the search and the filter in one field). `filter-style="views"` and
`filter-style="sentence"` draw with the filter package's styles (saved views as tabs, and the
filter as a sentence).

## Install

```sh
npm install @lesfleursdelanuitdev/data-viewer lit
```

Lit is a peer dependency (`lit@^3.3.3`), so your app and the viewer share one copy. The menu,
pagination, card, search and filter packages come with it (exact versions, 0.1.0).

## Two ways to load it

| File | For | Registers the tags |
|---|---|---|
| `@lesfleursdelanuitdev/data-viewer` (`dist/data-viewer.js`) | apps with a bundler; Lit is left out | No: you call `define()` |
| `dist/data-viewer.standalone.js` | plain pages; Lit, the menu, the pager, the card, the search box and the filter are inside (about 42 KB gzipped) | Yes, on load: all eight tags |

### In an app

Importing the package registers nothing: until you call `define()`, the browser treats
`<lfdln-data-viewer>` as an unknown, empty tag. Call it once, before the tag is used (see
[define, configure and defineList](#define-configure-and-definelist)).

### On a plain page

```html
<script type="module" src="/js/data-viewer.standalone.js"></script>
```

Copy `dist/data-viewer.standalone.js` from the package to your site, or load it from a CDN that
serves npm packages, for example
`https://cdn.jsdelivr.net/npm/@lesfleursdelanuitdev/data-viewer@0.1.0/dist/data-viewer.standalone.js`.
It registers all eight tags when it loads (`<lfdln-data-viewer>`, `<lfdln-dv-column>`,
`<lfdln-menu>`, `<lfdln-pagination>`, `<lfdln-card>`, `<lfdln-search>`, `<lfdln-filter>` and
`<lfdln-filter-chips>`), each only if no other script registered that name first, so it can share
a page with the parts' own standalone scripts. You don't call `define()` on a plain page. It also exports everything
the package exports (plus `LfdlnMenu`, `LfdlnPagination` and `LfdlnCard`), so a page script can do
`import { registerAdapter } from '/js/data-viewer.standalone.js'`.

## define, configure and defineList

Three functions, each for one job. Only `define()` is needed in every app; the other two are for
keeping a list's setup in its own file.

### `define()`: make the tags work

Tells the browser that `<lfdln-data-viewer>` and `<lfdln-dv-column>` are this package's
elements. Before it runs they are empty, unknown tags; after it, every one on the page (and every
one added later) starts working.

```ts
// main.ts, once, before any list is shown
import { define } from '@lesfleursdelanuitdev/data-viewer';

define();
```

```html
<!-- anywhere in your HTML or templates -->
<lfdln-data-viewer label="Plants"></lfdln-data-viewer>
```

- `define(name, columnName)` registers the tags under other names, for a page where
  `lfdln-data-viewer` is taken: `define('plant-list', 'plant-column')`.
- A name that is already registered is left alone, so calling `define()` twice is safe.
- The viewer draws its menus, pages, cards, search box and filter itself, so it needs no other
  tag. To use `<lfdln-menu>`, `<lfdln-card>` and the rest on their own in an app, call the
  `define()` from that part's package.

### `configure(list, setup)`: hand a list its setup

Gives one list its columns, rows, cards and event handlers in one go, from an object. It is what
the `config="./plants-list.js"` attribute does on a plain page, for apps where your bundler
imports the file.

```ts
import { configure } from '@lesfleursdelanuitdev/data-viewer';
import plants from './plants-list.js';

const list = document.querySelector('lfdln-data-viewer');
await configure(list, plants); // resolves once the columns are set and the rows are loaded
```

```ts
// plants-list.js: the setup object
export default {
  columns: [
    { key: 'name', label: 'Plant', sortable: true },
    { key: 'price', label: 'Price', type: 'money', format: { currency: 'EUR' } },
  ],
  load: async () => (await fetch('/plants.json')).json(),
  on: { 'dv-open': (e) => console.log('opened', e.detail.row.name) },
};
```

- Calling it again replaces the old setup, including its `on` handlers.
- `list.configure(setup)` is the same thing as a method.
- In React, call it in an effect: `useEffect(() => { void configure(ref.current!, plants); }, [])`.

### `defineList<Row>(setup)`: let TypeScript check the setup

Does nothing when the page runs: it returns the setup unchanged. Wrap your setup in it, in
TypeScript, and the editor checks every column `key` against your row type and knows what's in
each event.

```ts
// plants-list.ts
import { defineList } from '@lesfleursdelanuitdev/data-viewer';

type Plant = { id: number; name: string; price: number };

export default defineList<Plant>({
  columns: [
    { key: 'name', label: 'Plant' },
    { key: 'prize', label: 'Price' }, // error: 'prize' is not a key of Plant
  ],
  on: { 'dv-open': (e) => e.detail.row.price }, // row is a Plant
});
```

In plain JavaScript, leave it out and export the object as it is.

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
  list.addEventListener('dv-open', (e) => console.log('open', e.detail.row));
</script>
```

## Setup in its own file

A list's setup (columns, views, cards, rows, event handlers) can live in a module of its own
instead of an inline script:

```html
<lfdln-data-viewer config="./plants-list.js"></lfdln-data-viewer>
```

```js
// plants-list.js
export default {
  label: 'Plants',
  columns: [
    { key: 'name', label: 'Plant', sortable: true },
    { key: 'price', label: 'Price', type: 'money', format: { currency: 'EUR' } },
  ],
  cardOf: (p) => ({ title: p.name, menu: [{ id: 'aside', label: 'Put one aside' }] }),
  load: async () => (await fetch('/plants.json')).json(), // or rows: [...]
  on: {
    'dv-action': (e) => console.log(e.detail.id, e.detail.row),
  },
};
```

- `config` is read against the page's address (`document.baseURI`), not the viewer script's, and
  loaded with `import()`.
- The default export is an object, or a function `(list) => …` that gets the element and may
  return the object (or a promise of it).
- The object may set any public property (`columns`, `views`, `cardOf`, `rows`, `total`,
  `pageSize`, `pageSizes`, `pager`, `layoutSwitch`, `words`, `adapter`, `src`, …), plus:
  - `on`: `{ 'dv-action': fn, … }`, added with `addEventListener`. A new config takes the old
    one's handlers off first, and they are never added twice (also after the element is moved).
  - `load`: `async (list) => rows`. Its answer becomes `rows`. The list is busy until then, and a
    failure shows the usual error box with Try again.
  Unknown keys are ignored, with one console warning per key per page.
- While the module loads, the list is `busy`. If it can't be loaded, the error box says
  "Couldn't load this list's setup from ./plants-list.js." and the reason goes to the console.
- Changing `config` applies the new module.
- **Order:** attributes in the HTML first, then the config when it arrives, then anything your
  page sets afterwards. A property set after the config has loaded wins; one set before it may be
  replaced by the config.

**With a bundler, or React,** import the same file and hand it over with `configure()`.
`defineList()` returns its argument; it is there so TypeScript knows the row type (column keys
are checked against it unless the column has `value` or `render`, and `on` handlers get typed
events):

```ts
// plants-list.ts
import { defineList } from '@lesfleursdelanuitdev/data-viewer';
type Plant = { id: number; name: string; price: number };
export default defineList<Plant>({
  columns: [{ key: 'name', label: 'Plant' }, { key: 'price', label: 'Price', type: 'money' }],
  on: { 'dv-open': (e) => console.log(e.detail.row.name) },
});

// in a component
import { configure } from '@lesfleursdelanuitdev/data-viewer';
import plants from './plants-list';
useEffect(() => { void configure(ref.current!, plants); }, []);
```

`configure(el, config)` resolves once the setup (and `load`) is done. `el.configure(config)` is
the same thing as a method.

## Rows: two modes

**In the browser.** Set `rows` to all the rows and leave `total` unset. The viewer searches,
filters, sorts, filters by view and pages them itself.

**From a server.** Set `rows` to one page and `total` to the number of rows on the server. Every
change (page, search, "Search in", filters, sort, view, rows per page) fires a `dv-query` event with
`{ page, search, sort, dir, view, size }`, plus `searchIn` and `filters` when they are set (see
[Search and filter](#search-and-filter)).
Load that page, then set `rows` and `total` again. Until you do, the list is busy
(`aria-busy="true"` on `.dv-root`, and the `busy` attribute on the element). Set `rows` or
`total` even when the answer is the same, so the busy state clears. You may answer inside the
`dv-query` listener or later.

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
    el.addEventListener('dv-query', query);
    el.addEventListener('dv-open', open);
    return () => {
      el.removeEventListener('dv-query', query);
      el.removeEventListener('dv-open', open);
    };
  }, [onQuery, onOpen]);

  return <lfdln-data-viewer ref={ref} label="Orders" url-state="orders" />;
}
```

To keep the columns and handlers out of the component, put them in a module and use
`configure(ref.current, plants)` instead (see [Setup in its own file](#setup-in-its-own-file)).

TypeScript needs to know the tag once in your app:

```ts
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'lfdln-data-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        label?: string; 'url-state'?: string; layout?: 'table' | 'cards'; 'remember-as'?: string;
        'page-size'?: number; 'page-sizes'?: string; pager?: 'simple' | 'numbers';
        'layout-switch'?: 'none' | 'text' | 'icons' | 'both'; 'table-label'?: string; 'cards-label'?: string;
        config?: string;
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
      @dv-query=${(e: CustomEvent<Query>) => this.load(e.detail)}
      @dv-action=${(e: CustomEvent<{ id: string; row: Recipe }>) => console.log(e.detail)}
    ></lfdln-data-viewer>`;
  }

  // The first page; after that, each dv-query event asks for the next one.
  firstUpdated() {
    void this.load({ page: 1, search: '', sort: '', dir: 'asc', view: '', size: 20 });
  }

  async load(q: Query) {
    const res = await fetch(`/api/recipes?page=${q.page}&per=${q.size}&search=${encodeURIComponent(q.search)}`);
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

A page with no script has nobody to hear `dv-open`, so with columns written in HTML a row
without a `card-href` address is plain text: its first cell and card title can't be pressed. If
your page does listen for `dv-open`, add `open-event` to the element to get the buttons back.

## Properties and attributes

| Property | Attribute | Type | Default | What it does |
|---|---|---|---|---|
| `label` | `label` | string | `''` | What the list is called, for screen readers (on the table and the card list). |
| `columns` | (children) | `Column[]` | `[]` | The columns. See [Columns](#columns). |
| `rows` | none | `T[]` | `[]` | All rows (browser mode) or one page (server mode). |
| `total` | `total` | number | unset | Set it for server mode: how many rows the server has. |
| `cardOf` | none | `(row) => CardParts` | unset | Each row's card. See [Cards](#cards). |
| `cardTemplate` | none | `(row, pieces) => Content` | unset | Your own card for each row, drawn with Lit (or an element). See [Your own cards](#your-own-cards). |
| `cardMount` | none | `(el, row, pieces) => void \| (() => void)` | unset | Your own card mounted into an empty element, for React and other frameworks; may return a cleanup. See [Your own cards](#your-own-cards). |
| `cardTemplateId` | `card-template` | string | unset | The `id` of a `<template>` on the page to draw every card from (several lists can share one). A `<template card>` child does the same for one list. See [Your own cards](#your-own-cards). |
| `views` | none | `View[]` | unset | Tabs such as All / Quick: `{ key, label, count?, where? }`. In browser mode `where(row)` filters. The list starts on view `''` (no filter), so give an "All" view the key `''`. |
| `pageSize` | `page-size` | number | `20` | Rows per page. With `page-sizes`, the starting choice. |
| `pageSizes` | `page-sizes` | `number[]` (attribute: `"10,20,50"`) | unset | Shows a "Rows per page" picker beside the paging status. See [Pages](#pages). |
| `pager` | `pager` | `'simple'` or `'numbers'` | `'simple'` | `simple`: Previous and Next. `numbers`: numbered page buttons between them. See [Pages](#pages). |
| `layout` | `layout` (reflected) | `'table'` or `'cards'` | table, or cards on a phone | How the rows are drawn. |
| `rememberAs` | `remember-as` | string | unset | Keeps the visitor's table-or-cards choice in `localStorage` under this key (and a picked page size under `<key>.size`). It doesn't decide whether the switch shows; `layout-switch` does. With `filter-style="views"` it also keeps the visitor's saved views under `<key>.views`. See [Saved views](#saved-views). |
| `layoutSwitch` | `layout-switch` | `'none'`, `'text'`, `'icons'` or `'both'` | `'text'` | The table-or-cards switch: words, icons only, an icon before the words, or no switch. Anything else is `'text'`. See [The layout switch](#the-layout-switch). |
| `tableLabel` | `table-label` | string | `words.showTable` | What the table button says (its name and, with icons only, its `title`). |
| `cardsLabel` | `cards-label` | string | `words.showCards` | What the cards button says. |
| `layoutIcons` | none | `{ table?: Content; cards?: Content }` | built-in icons | Your own icons for the switch. A string is shown as text, never HTML. A `Node` is copied for each drawing. |
| `compact` | `compact` | boolean | `false` | No bar and no pages, for a short list inside another card. |
| `words` | none | `Partial<Words>` | `{}` | Replaces any of the text. See [Words](#words). |
| `state` | none | `Partial<Query>` | unset | Hands it page, search, sort, dir, view, `searchIn` and `filters` from outside (a router, say). |
| `searchKeys` | none | `string[]` | every column | The row keys search looks at. A key need not be a column. Columns marked `searchable` win over it. |
| `searchIn` | `search-in` | boolean | `false` | Shows the "Search in" picker beside the search box (with two or more searchable columns). See [Search and filter](#search-and-filter). |
| `searchSubmitLabel` | `search-submit-label` | string | unset | A button after the search box with these words; then typing alone doesn't search, only Enter or the button. |
| `filterLabel` | `filter-label` | string | `words.filter` (`Filter`) | The filter button's words when nothing is applied. With `filter-style="search"` it names the field's search landmark and its suggestions' popover instead. |
| `filterChips` | `filter-chips` | `'on'` or `'off'` | `'on'` | The applied filters as chips under the bar. |
| `filterStyle` | `filter-style` | `'dialog'`, `'panel'`, `'bar'`, `'rail'`, `'columns'`, `'search'`, `'views'` or `'sentence'` | `'dialog'` | How the filter looks. Each style but `dialog` needs its own file. See [Filter styles](#filter-styles). |
| `savedViews` | none | `SavedView[]` | unset | With `filter-style="views"`: the saved views, kept by your page (on your server, say). Set, it turns the browser's copy off. See [Saved views](#saved-views). |
| `facets` | none | `Record<key, FilterOption[]>` | unset | Server mode: each filterable column's options with counts. Set it with `rows` and `total`. |
| `busy` | `busy` (reflected) | boolean | `false` | Waiting for rows. Set by the viewer; you can set it too. |
| `urlState` | `url-state` | string | unset | Keeps the state in the address under this prefix. See [Address](#address). |
| `config` | `config` | string | unset | A module whose default export sets the list up. See [Setup in its own file](#setup-in-its-own-file). |
| `adapter` | `adapter` | string | unset | The name of a registered adapter, such as `json` or `pammy`. |
| `src` | `src` | string | unset | The address the adapter loads from. `json` and `pammy` need it; your own adapter may not. |
| `openEvent` | `open-event` | boolean | `false` | With columns written in HTML, rows without `href` fire `dv-open` (as buttons) only when this is set. With columns set from script they always do. |
| `cardActions` | `card-actions` | `'menu'`, `'wrap'` or `'row'` (`'footer'` is `'wrap'`) | `'menu'` | Where a card's menu items go: a ⋯ menu in its head, buttons in its footer that wrap, or one row of buttons that never wraps. See [Cards](#cards). Tables always use the ⋯ column. |
| `cardActionsMax` | `card-actions-max` | number | `3` | With `wrap` or `row`: how many items are buttons at most; the rest go into a menu at the end of the footer. |
| `cardMoreLabel` | `card-more-label` | string | `words.more` (`More`) | With `row`: the words on the More button. |
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
| `searchable` | Present: search looks at this column. |
| `filterable` | Present: the filter has a part for this column. |
| `options` | A choice's options, `options="Sun,Part shade,Shade"`, in that order. |
| `ranges` | A range's quick ranges, `ranges="1900s:1900..1999,Recent:2020.."` (label, colon, `from..to`; either end may be empty). |
| `hint` | For a yes/no column: a line under its switch in the `panel` and `rail` [filter styles](#filter-styles), such as `hint="Hide plants that are sold out"`. |
| `phrase` | How the column reads in the `sentence` [filter style](#filter-styles) when it is set, `{values}` standing for what is picked: `phrase="for {values}"` ("for shade"). Unset: `Label: {values}`. |
| `phrase-any` | How it reads when nothing is picked: `phrase-any="in any light"`. Unset: `Label: any`. |
| `plural` | A choice's values as the sentence says them, `plural="Perennial:perennials,Fern:ferns"` (value, colon, words; the last colon splits). A value not listed reads as its label in lower case. |
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
  searchable?: boolean;         // search looks at it (none marked: every column)
  filterable?: boolean;         // the filter has a part for it
  options?: (string | FilterOption)[];                      // a choice's options, in order
  ranges?: { label: string; from?: string; to?: string }[]; // a range's quick ranges
  hint?: string;                // a yes/no filter's helper line (panel and rail styles)
  phrase?: string;              // the sentence style, when set: 'for {values}'
  phraseAny?: string;           // the sentence style, when not set: 'in any light'
  plural?: Record<string, string>; // the sentence style: { Fern: 'ferns' }
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

## Search and filter

**Search** looks at the columns marked `searchable`. With none marked it looks at `searchKeys`, and
without those at every column, as before. `search-in` adds a "Search in" picker ("All fields", then
each searchable column) when there are two or more. `search-submit-label="Search"` adds a button
and stops search-as-you-type. A search goes back to page 1.

**The filter** has one part for each `filterable` column, after the filter on the Gonsalves family
albums: a funnel button in the bar that sums up what is applied, a popover with the parts on the
left and the picked one on the right (a bottom sheet on phones), changes held in a draft until
Apply, and the applied filters as chips under the bar. Its kind follows the column type:

| Column type | Filter | Value |
|---|---|---|
| `text`, `badge`, `link`, `tags` | A choice: tick any of the values | `['Sun', 'Shade']` |
| `number`, `money`, `date` | A range: From and To, and the column's `ranges` as quick picks | `{ from: '10', to: '50' }` |
| `bool` | Any, Yes or No | `true` / `false` |
| `image` | Never filterable | |

- **In the browser** a choice lists the values in the view's rows, sorted (a column's `options`
  first, in their order), and counts each over the rows the view, the search and the other filters
  leave, so the counts say what you would get. A tags cell counts each tag; empty and missing values
  are never options.
- **Matching:** every set filter must match (AND); a choice matches any of its ticked values (OR,
  any tag of a tags cell); a range compares numbers (`"12.50"` is 12.5) or dates by period (`1950`
  is the whole year, `1950-06` the month). A cell with no value never matches a set filter, and a
  value that is no longer an option (an old bookmark) matches nothing, while its chip still shows
  so it can be removed.
- **From a server** the list can't count, so it uses `facets` (`{ status: [{ value, label?, count }] }`),
  set with `rows` and `total` or returned by an adapter. Without facets a choice uses the column's
  `options` without counts; with neither it is left out. `dv-query` then carries `searchIn` and
  `filters` (`{ status: ['paid'], price: { from: '10' }, organic: true }`). Both are left out when
  unset, so a query without them looks as it always did.
- A filter change goes back to page 1.

```js
list.columns = [
  { key: 'name', label: 'Plant', searchable: true },
  { key: 'kind', label: 'Kind', type: 'badge', searchable: true, filterable: true },
  { key: 'price', label: 'Price', type: 'money', format: { currency: 'EUR' }, filterable: true,
    ranges: [{ label: 'Under €5', to: '5' }, { label: 'Over €10', from: '10' }] },
  { key: 'added', label: 'Added', type: 'date', filterable: true },
];
```

## Filter styles

`filter-style` picks how the filter looks. Today's dialog is the default, so a list without the
attribute doesn't change. Each other style is a file of its own, and only pages that use it load it.

| `filter-style` | What it is | Applies | Shows what is applied |
|---|---|---|---|
| `dialog` (default) | The funnel button and the two-column dialog (a bottom sheet on phones) | A draft, then Apply | The chips row under the bar |
| `panel` | A Filter button that opens one 400 px panel with every section (a bottom sheet on phones) | A draft, then "Show 12 results" | A count badge and chips beside the button; a chip's × applies at once |
| `bar` | One pill per section in the bar. A pill opens a 240 px menu (a bottom sheet on phones); a yes/no pill just toggles | At once | In the pills, and a "Clear all" at the end |
| `rail` | A 190 px column beside the list with every section open | At once | "12 results" and chips above the list |
| `columns` | A funnel button in each filterable column's header. It opens a 220 px menu | At once | A dot on the header, accent-coloured cells, and "5 of 12 · 1 column filtered" with "Clear all" above the table |
| `search` | One field for the search and the filters, in the search box's place. Typing suggests filters (a bottom sheet below 480 px) | At once | As tokens in the field: "Any column has mint", "Kind is Herb" |
| `views` | Saved views first: tabs with counts above the bar, "+ New view" opens a builder, a saved tab has a ⋯ menu with Rename and Delete | A view's filters and search when its tab is picked; a new view's draft on Save | The current tab, and the chips row under the bar |
| `sentence` | The filter written out above the bar: "Show perennials and ferns for shade, at any price, including sold out." Each underlined part opens a 220 px menu (a bottom sheet below 480 px) | At once | In the sentence, and "Start over" under it |

With `panel`, `bar`, `rail`, `columns`, `search` and `sentence` the viewer's own chips row is
off, even with `filter-chips="on"`: the style shows what is applied itself. `views` keeps the
chips row, because a bookmark or a deleted view can leave filters that no tab matches, and the
chips are how you see and clear them.

### Which file to add

| `filter-style` | Plain page (after `data-viewer.standalone.js`) | npm (import once, before the list draws) |
|---|---|---|
| `panel` | `dist/data-viewer-filter-panel.js` | `@lesfleursdelanuitdev/data-viewer/filter-styles/panel` |
| `bar` | `dist/data-viewer-filter-bar.js` | `@lesfleursdelanuitdev/data-viewer/filter-styles/bar` |
| `rail` | `dist/data-viewer-filter-rail.js` (holds `panel` too) | `@lesfleursdelanuitdev/data-viewer/filter-styles/rail` |
| `columns` | `dist/data-viewer-filter-columns.js` (holds `panel` too) | `@lesfleursdelanuitdev/data-viewer/filter-styles/columns` |
| `search` | `dist/data-viewer-filter-search.js` (holds `panel` too) | `@lesfleursdelanuitdev/data-viewer/filter-styles/search` |
| `views` | `dist/data-viewer-filter-views.js` | `@lesfleursdelanuitdev/data-viewer/filter-styles/views` |
| `sentence` | `dist/data-viewer-filter-sentence.js` | `@lesfleursdelanuitdev/data-viewer/filter-styles/sentence` |

```html
<script type="module" src="/js/data-viewer.standalone.js"></script>
<script type="module" src="/js/data-viewer-json.js"></script>
<script type="module" src="/js/data-viewer-filter-bar.js"></script>

<lfdln-data-viewer label="Plants" filter-style="bar" adapter="json" src="plants.json">
  <lfdln-dv-column key="name" label="Plant" searchable></lfdln-dv-column>
  <lfdln-dv-column key="kind" label="Kind" filterable></lfdln-dv-column>
  <lfdln-dv-column key="price" label="Price" type="money" currency="EUR" filterable
    ranges="Under €5:..5,€5–€10:5..10,Over €10:10.."></lfdln-dv-column>
  <lfdln-dv-column key="stock" label="In stock" type="bool" filterable
    hint="Hide plants that are sold out"></lfdln-dv-column>
</lfdln-data-viewer>
```

```js
import { define } from '@lesfleursdelanuitdev/data-viewer';
import '@lesfleursdelanuitdev/data-viewer/filter-styles/bar'; // registers filter-style="bar"

define();
```

The add-on files hold no Lit: they draw with the viewer's own copy. Each one registers its style
when it loads, and the order doesn't matter. A list draws the style as soon as its file has
loaded. Each file is 6 to 11 KB gzipped (`views` and `sentence` about 7.5 KB). To show a filter style without the viewer, see the filter package's
[filter styles on their own](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/filter#filter-styles-on-their-own).

### Fallbacks

- **A style that isn't loaded** (or a name that doesn't exist) shows today's dialog. The console
  gets one warning, once the page has loaded, naming the file to add:
  `lfdln-data-viewer: filter-style="bar" is not loaded, so it shows the dialog. Add data-viewer-filter-bar.js.`
  If the file loads later, the list switches to the style.
- **`rail`** shows `panel` while the list itself is narrower than 720 px (it watches the list's
  width, not the window's). So on phones the rail is always the panel.
- **`columns`** shows `panel` in cards view, which has no headers.
- **`search`** has no fallback: below 480 px of list width (it watches the list, as the rail
  does), and on phones, its suggestions open as a bottom sheet instead.
- **`sentence`** has no fallback either: below 480 px of list width, and on phones, it stays a
  sentence and its menus open as the bottom sheet.
- **`views`** has none: on phones the tabs row scrolls sideways inside itself and the builder's
  rows stack.
- The name is read in lower case. Changing `filter-style`, or a fallback taking over, closes an
  open filter and drops its draft.

### How each style behaves

- **Counts.** Every option shows how many rows you'd get if you picked it, counted over what the
  other sections leave. An option that would leave nothing dims to 0.45 but stays clickable. A
  range's quick ranges show counts too, in browser mode.
- **`panel`:**
  - A choice is a set of chips. A single choice with 5 options or fewer is a segmented control
    ("Any" and its options).
  - A range shows its `ranges` as chips, or From and To boxes when it has none. A `number` or
    `money` range also gets a 12-bar histogram of the rows the other sections leave, in browser
    mode only, when at least 2 values differ. Bars inside the drafted range are accent-coloured.
  - A yes/no section is a switch, with the column's `hint` under it.
  - The title is `words.heading` ("Filter"). The button at the bottom counts the draft: "Show 12 results", "Nothing matches" at 0, or
    "Show results" while the count isn't known. Reset empties the draft. Cancel, Esc and a click
    outside drop it. While the panel is open, the list behind it dims.
- **`bar`:** a pill reads its section's key and what it is set to ("Herb", "Herb +1", "Under €5").
  Its menu has an option search when the section has more than 8 options, and "Clear kind" once
  something is set. Only one menu is open on the page at a time. A long summary is cut off with
  an ellipsis; the pill's name for screen readers has all of it.
- **`rail`:** "Filters" with a "Clear" button, then each section with an 11 px uppercase label.
  Single choices and named ranges are radios (arrow keys move and pick). Yes/no is a switch.
- **`columns`:** the header text still sorts. The funnel is a second button in the same header,
  named "Filter by Kind". Its menu is "Show kind" with the options, the ranges as one-at-a-time
  rows (or From and To boxes), or Yes and No for a yes/no column, and "Clear this column" once it
  is set. The menu is right-aligned for the last two columns, opens above the header near the
  window's bottom edge, and follows the header when the page scrolls. With no rows left, the
  headers stay, so you can undo the pick.

- **`search`:** one field takes the place of the search box (there is no separate search box,
  "Search in" picker or Filter button). The search is the field's first token, "Any column has
  mint"; it reads "Plant has mint" when one column is `searchable`, or "Owner has mint" with
  that column picked in "Search in". The filters follow as tokens: "Kind is Herb",
  "Price · Under €5", "In stock · Yes".
  - Typing lists "Search for “q”", then, with `search-in` and two or more searchable columns, a
    "Plant has “q”" row for each (picking one sets "Search in"; with `supports.searchIn: false`
    there are none), then the filters the text finds, by section: options, named ranges,
    "≤ 7" / "≥ 7" for a number typed into a number or money column, and Yes / No. How many rows
    the text would leave shows on the row for the "Search in" already applied: "Search for"
    with none, else that column's row.
  - With nothing typed, no row is active and Enter does nothing until an arrow key moves.
    Once text is typed, Enter picks the active row: the first filter that leaves something (one
    at 0 dims to 0.45 and can be clicked, but Enter never picks it), else "Search for".
    Backspace in the empty field removes the last token, Esc closes, Done searches the typed text.
    Typed text that wasn't applied goes when Back, a new `state` or another filter style
    changes the list.
  - Every token added or removed applies at once, and the address keeps the same keys as
    before: `<prefix>.search`, `<prefix>.in` and `<prefix>.f.<key>`. So bookmarks made with the
    search box still work, and a value that has gone shows as a token you can remove.
  - Below 480 px of list width, or on a phone, the suggestions are a bottom sheet with its own
    copy of the field at the top; rows are 44 px. If the list widens past 480 px while the sheet
    is open, the suggestions move under the field and focus goes back to it, with the text kept.
  - With no filter sections (an adapter with `supports.filters: false`, or server mode before
    `facets` arrive), the list shows the plain search box until there are sections.
  - `dv-query` carries `search`, `searchIn` and `filters` as with the search box. To use the
    field without the viewer, see the
    [search-filter](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/search-filter#readme)
    package.

- **`views`:** a row of tabs above the bar takes the place of the bar's views. The page's own
  `views` come first; with none, an "All" tab (the view `''`) is added. The visitor's saved views
  follow, then "+ New view". See [Saved views](#saved-views) for where they are kept.
  - Each tab shows its count: in browser mode every tab (a page view's `count` if set, else
    counted with its `where`; a saved view counted with its filters and search); in server mode
    only page views with a `count`.
  - Picking a tab applies its whole state: a page view clears the filters and the search; a
    saved view sets its own filters and search. A saved tab is current while the list's filters
    and search are exactly its own. A page tab is current only while no filter and no search is
    applied, so "All" isn't marked while something narrows the list.
  - "+ New view" opens the builder, a card with one row per section (chips with counts, From and
    To boxes for a range without named ranges, Yes / No), filled with what is applied. In browser
    mode the list shows what the draft leaves as you change it; the address and `dv-query` wait
    for Save. In server mode the rows stay and only the Save button counts. The footer has the
    name box ("Name this view"; left empty, the view is "View 1", "View 2", …), Cancel and "Save · 5 results". With no
    filter and no search there is nothing to save: Save says why and does nothing. Esc or Cancel
    closes the builder and drops the draft.
  - A saved tab's ⋯ menu ("More for Herbs") has Rename and Delete. Rename turns the label into a
    text box: Enter or leaving it saves, Esc cancels, an empty name keeps the old one. Delete
    removes the tab at once and shows "Deleted “Herbs” · Undo" for 5 seconds; Undo puts it back
    where it was. Focus goes to Undo, then back to the current tab (or the first tab). The
    view's filters stay applied, with their chips. Page views have no ⋯.
  - On phones the tabs, ⋯, "+ New view", the chips and the builder's buttons are 44 px tall, and
    the tabs row scrolls sideways inside itself, never the page.
- **`sentence`:** the filter reads as one sentence above the bar: "Show" and one phrase per
  filterable column, written by its `phrase`, `phrase-any` and `plural`
  ([column attributes](#lfdln-dv-column-attributes)).
  - A set column reads its `phrase` with `{values}` replaced by what is picked ("for **shade**").
    Only the values are the underlined button; the rest is plain text. An unset column's whole
    `phrase-any` is the button ("**at any price**"). Values join as "perennials", "perennials
    and ferns", "perennials, shrubs and ferns"; a choice's value reads from `plural`, else as its
    label in lower case, a range as its summary ("under €5"), yes/no as the column's `phrase`
    when yes and "In stock: no" when no.
  - Phrases join as "Show" + the first phrase + the second, then ", " before each one after
    that, and "." at the end: "Show perennials and ferns for shade, at any price, including sold
    out." A column with no phrase reads "Owner: any" or "Owner: ana and dev".
  - Each phrase opens the 220 px menu the `columns` style uses: "Show kind", the option search
    for long lists, the options with counts (ranges and Yes / No one at a time, or From and To
    boxes), and, once set, a last button that clears it, named by the unset phrase ("At any
    price", "All plants", "Owner: any"). Every tick applies at once. Esc and the clear button
    close it and put focus back on the phrase; a click outside closes it too.
  - "Start over" under the sentence clears every filter. It keeps the search, which the sentence
    doesn't show. With a filter set and no rows left, the list says "No plants match that
    sentence. Change one of the underlined parts." (`words.things` names the rows).
  - Below 480 px of list width, or on a phone, the menus are the bottom sheet, the text is 18 px,
    and each line of a phrase is a 44 px target; long phrases wrap with the text around them.

### Saved views

With `filter-style="views"` a visitor can save the filters and the search they have applied as a
view of their own, a tab they can come back to. Where the views are kept:

- **With `remember-as`:** in this browser's `localStorage`, under `<remember-as>.views`
  (`plants.views` for `remember-as="plants"`), as a JSON array of views. Reading and writing it
  never breaks the list. If storage is blocked or full, the views last until the page is
  reloaded. Stored views that can't be read (not JSON, or not a view) are left out, with one
  console warning.
- **Without `remember-as`:** in the list only, until the page is reloaded.
- **With `savedViews`:** in your page. Set `savedViews` to the views (from your server, say) and
  the list never reads or writes `localStorage` for them. It keeps its own copy, changes it as the
  visitor saves, renames and deletes, and tells you each time with `views-change`. Set
  `savedViews` to a new array to replace its copy.

Each change (a save, a rename, a delete, an undo) fires `views-change` with the whole list of
views in `detail.views`, whichever of the three keeps them. It bubbles and is `composed`.

```ts
type SavedView = { key: string; label: string; filter: FilterValue; search?: string };
// { key: 'u-m2x9k1', label: 'Herbs for sun', filter: { kind: ['Herb'], light: ['Sun'] } }
```

What a view saves: the filters (tidied: empty ones dropped) and the search, left out when empty.
Not the sort, the page size, the layout or "Search in". A new view's key is `u-` and the time in
base 36 (`-2`, `-3` on a clash). A value a saved view names that the list no longer has shows a
count of 0; picking the view applies it, and its chip clears it.

Keeping views on a server:

```html
<lfdln-data-viewer id="plants" label="Plants" filter-style="views" adapter="json" src="/api/plants">
  …
</lfdln-data-viewer>

<script type="module">
  const list = document.querySelector('#plants');
  list.savedViews = await (await fetch('/api/me/views')).json();
  list.addEventListener('views-change', async (e) => {
    if (e.target !== list) return; // lists inside cards fire it too
    await fetch('/api/me/views', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(e.detail.views),
    });
  });
</script>
```

In server mode, picking a saved view sends `dv-query` with `view: ''` and the view's `filters` and
`search`, as if the visitor had set them; your server needs nothing new. Picking a page view sends
its `view` key with no filters and no search.

### Counts from a server

In server mode the list can't count a draft itself, so the panel's "Show 12 results" asks the
server. It asks 300 ms after the draft last changed, and cancels the request before it. An
older answer never replaces a newer one.

- If the adapter has `count(q, { signal, src })`, the list calls it. It returns a number.
- Otherwise the list calls `load` for a page of 1 row and reads its `total`.
- While the answer is coming, if it fails, or when the page serves its own rows with no adapter,
  the button says "Show results" with no number. A failed count shows no error.
- Today's dialog never asks: it shows no count.
- `search` counts the typed text the same way for its "Search for" row: at once in browser
  mode, 300 ms after typing stops in server mode (the text as the search, with the applied
  filters and "Search in"). Enter doesn't wait for it.

```ts
const mine: Adapter = {
  load: async (q, { signal, src }) => { /* … as in Your own adapter */ },
  // Optional: a cheaper way to count a draft's rows.
  async count(q, { signal, src }) {
    const res = await fetch(`${src}/count?${toParams(q)}`, { signal });
    return (await res.json()).count;
  },
};
```

### Words for the styles

These join the list's [words](#words) and are set the same way, through `words`:

| Key | Default |
|---|---|
| `showResults(n)` | `Show ${n} results` (`Show 1 result`) |
| `showResultsUnknown` | `Show results` |
| `noResults` | `Nothing matches` (the panel's button at 0) |
| `resultsCount(n)` | `${n} results` (`1 result`; the rail and columns) |
| `resultsOf(n, m)` | `${n} of ${m}` (columns) |
| `allResults(m)` | `All ${m} results` (columns, with nothing filtered) |
| `columnsFiltered(k)` | `${k} columns filtered` (`1 column filtered`) |
| `filterBy(label)` | `Filter by ${label}` (each funnel's name) |
| `showColumn(label)` | `Show ${label.toLowerCase()}` (a column's menu) |
| `clearSection(label)` | `Clear ${label.toLowerCase()}` (a bar menu) |
| `clearColumn` | `Clear this column` |
| `filters` | `Filters` (the rail's title, unless `filter-label`) |
| `reset` | `Reset` (the panel) |

`search` adds its own words (`searchOrFilter`, `addFilter`, `searchFor(q)`, `anyColumn`, `has`,
`is`, `atMost(n)`, `atLeast(n)`, `noSuggestions`, `done`, `enterHint`, `suggestions`), set the
same way; see the search-filter package's
[words](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/search-filter#words).

`views` adds these (and uses `views`, `Views`, as the tabs row's name):

| Key | Default |
|---|---|
| `allViews` | `All` (the tab added when the page sets no `views`) |
| `newView` | `New view` (the "+" tab and the builder's name) |
| `viewName(n)` | `View ${n}` (a view saved with no name) |
| `nameView` | `Name this view` (the name box's label and placeholder) |
| `saveView(n)`, `saveViewUnknown` | `Save · ${n} results` (`Save · 1 result`), `Save` (while the count isn't known) |
| `nothingToSave` | `Pick a filter or search for something first.` |
| `viewMenu(label)` | `More for ${label}` (a saved tab's ⋯) |
| `rename`, `delete` | `Rename`, `Delete` |
| `renameView(label)` | `Rename ${label}` (the rename box's label) |
| `viewDeleted(label)`, `undo` | `Deleted “${label}”`, `Undo` |

`sentence` adds these:

| Key | Default |
|---|---|
| `sentenceStart` | `Show` |
| `and` | `and` (before the last value in a phrase) |
| `comma` | `,` (between other values, and before each phrase after the second except the last; that one is `listComma`) |
| `listComma` | `,` (before the last phrase; `''` leaves a space) |
| `sentenceEnd` | `.` |
| `anyValue` | `any` (`Owner: any`, for a column with no `phrase-any`) |
| `startOver` | `Start over` |
| `things` | `results` (what the rows are, for `sentenceNone`) |
| `sentenceNone(things)` | `No ${things} match that sentence. Change one of the underlined parts.` |

To make them say "plants":

```js
document.querySelector('#plants').words = {
  heading: 'Filter plants',
  showResults: (n) => `Show ${n} ${n === 1 ? 'plant' : 'plants'}`,
  showResultsUnknown: 'Show plants',
  noResults: 'No plants match',
  resultsCount: (n) => `${n} ${n === 1 ? 'plant' : 'plants'}`,
  resultsOf: (n, m) => `${n} of ${m} plants`,
  allResults: (m) => `All ${m} plants`,
  saveView: (n) => `Save · ${n} ${n === 1 ? 'plant' : 'plants'}`,
  things: 'plants', // "No plants match that sentence. …"
};
```

### Styling the styles

The styles use the filter package's `--filter-*` variables, plus `--filter-accent-soft` (the
"on" chip's background) and `--filter-accent-text` (its text, counts and keys). See the filter
package's [styling](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/filter#styling).
The viewer adds these hooks:

| Hook | Where |
|---|---|
| `.dv-root[data-filter-open]` | While the panel's draft is open (the list dims) |
| `.dv-root[data-filter-side]`, `.dv-side`, `.dv-main` | With `rail`: the rail's column and the list's column |
| `.dv-filtered` | With `columns`: a filtered column's header and body cells |
| `.dv-search.dv-search-filter` | With `search`: the bar's box that holds the field (the search box's place) |
| `.dv-above` | With `views` and `sentence`: the box above `.dv-bar` the style draws in (full width) |

## The table

- It is a real `<table>`. Sortable headers are buttons, and the sorted column has `aria-sort`.
- The first column is each row's header (`<th scope="row">`). It is the way in: a link when the
  row's card has `href`, otherwise a button that fires `dv-open`. When the card has a `picture`, a
  small square of it sits beside the first cell. A `link` column or a column with `render` keeps
  its own content there, so nothing nests.
- The last column is the row's ⋯ menu. Its header is hidden text ("What you can do").
- A wide table scrolls inside its own box (`.dv-table-wrap`), never the page.

## Pages

`pager="numbers"` adds numbered buttons between Previous and Next:
`‹ Previous  1 … 4 [5] 6 … 12  Next ›`. They show the first page, the last, and the current one
with its neighbours, with "…" for gaps (a gap that would hide one page shows that page). The
current page has `aria-current="page"` and is not a button. Each other number is a button named
"Page 4". The numbers are a group named "Page numbers". The status ("Showing 41–50 of 120 · Page 5
of 12") stays a polite live region. On a phone (640 px or less) the numbers give way to
"Page 5 of 12" between Previous and Next. A list with one page shows no numbers.

`page-sizes="10,20,50"` (or `list.pageSizes = [10, 20, 50]`) shows a "Rows per page" select
next to the status. `page-size` is the starting choice; when it isn't in the list it is added in
order. The list is cleaned first: junk, values below 1 and repeats are dropped, decimals are
rounded down, and the rest is sorted. When fewer than two sizes are left there is no picker, and
`page-size` stays fixed as it is without `page-sizes`.

When the visitor picks a size, the first row they were looking at stays on screen: the new page is
`floor(firstIndex / newSize) + 1`. Both modes fire `dv-query` with the new `size`. In server mode
the host answers it with rows of that size, as for any query. With `url-state` the size goes in
the address (see [Address](#address)); with `remember-as` it is kept in `localStorage` under
`<remember-as>.size`, next to the layout choice. The address wins over what is stored.

## The layout switch

Every list (except a `compact` one) has a switch between the table and the cards, unless
`layout-switch="none"`: then `layout` (or the phone default) decides, and a choice saved under
`remember-as` still applies. `remember-as` only decides whether the visitor's choice is kept in
`localStorage`; without it the choice lasts until the page closes. The buttons say "Show a table" and
"Show cards" (`words.showTable` and `words.showCards`), or what `table-label` and `cards-label`
say. `layout-switch="icons"` shows built-in icons (a table and a grid of cards, drawn in
`currentColor`) instead: the words stay as each button's name for screen readers, in hidden text,
and as its `title`. `layout-switch="both"` shows the icon before the words. The buttons say which
one is chosen with `aria-pressed` in every form, and are at least 44 px square on a phone.

```js
list.layoutIcons = { table: '▤', cards: myCardsSvg }; // a Node is copied for each drawing
```

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
  menu?: MenuEntry[]; // see Menus
  actionsAt?: 'menu' | 'wrap' | 'row' | 'footer'; // this card's own placement, over card-actions
};
type Content = string | Node | TemplateResult;
```

The card rules:

- **Header:** the title, two lines at most (the whole title shows on hover), a badge, and the ⋯
  menu at the upper right.
- **Body:** a picture, the same 4:3 shape on every card, and two facts at most. Extra facts are
  dropped. Nothing in the body can be pressed.
- **Footer:** `meta` (a time, say) on the left, `value` (money, say) on the right, and at most one
  button (`dv-action`). An action with `href` is a link; without it, pressing it fires `dv-action`.
- **Its menu items:** with `card-actions="menu"` (the default) they are the ⋯ menu in the head.
  With `card-actions="wrap"` they are buttons in the footer (`.lfdln-card-actions`), after
  the `action` button: with their icons, danger items in `--dv-danger` and still last, lines and
  headings left out. A disabled item stays, with `aria-disabled` and its `why` as `title` and
  description. `confirm` still asks first, and `href` items are links. After `card-actions-max`
  items (default 3) the rest go into a ⋯ menu at the end (`.lfdln-card-actions-more`). The
  buttons wrap onto more lines when the card is narrow. `card-actions="footer"` is the same as
  `wrap` (its name before 2026-10-15; it keeps working).
  With `card-actions="row"` the buttons stay on one line that never wraps
  (`.lfdln-card-actions-row`): as many as fit the card's width (measured, and measured again
  when the card changes size), at most `card-actions-max`, and the rest in the row's own More
  button at its end (`.lfdln-card-more`; its words are `card-more-label`, default "More"). When
  space is short, danger items are the first to go into More. More is always there when
  something doesn't fit, and is never pushed out.
  A card's own `actionsAt` (`menu`, `wrap`, `row` or `footer`) wins over the attribute. Either
  way the items fire the same `dv-action` with `{ id, row }`. The footer buttons always show
  their labels, and are 44 px tall on a phone.
- **The whole card opens the thing:** a click anywhere follows `href`, or fires `dv-open` when there
  is no `href` (with columns written in HTML, only with `open-event`; see [HTML only](#html-only)). The ⋯ menu and the footer button stay separate buttons.

Without `cardOf`, the `card-*` attributes make the card. Without those either, the first column is
the title and the next two columns are the facts.

The same `CardParts` drive the table: `href` and `picture` for the first cell, `menu` for the last.

## Your own cards

When `cardOf` and the `card-*` attributes don't give the card you want, draw it yourself. The
viewer keeps the hard parts: the list item and the grid, opening the card by click and keyboard,
focus, the card's name for screen readers, the menus and the confirm dialog. You draw what is
inside the card.

There are three ways, for three kinds of page:

| Way | For | What you write |
|---|---|---|
| An HTML `<template>` | plain pages, no script | `<template card>` inside the list, or `card-template="id"` |
| `cardTemplate` | Lit, or plain JS | ``(row, pieces) => html`…` `` (or a DOM element) |
| `cardMount` | React, and any other framework | `(el, row, pieces) => cleanup` |

When more than one is set, the first in this order wins: `cardMount`, `cardTemplate`, a template
(`card-template` before a `<template card>` child), then `cardOf` / `card-*`, then the built-in
card. The table doesn't change: it still uses `cardOf`, the `card-*` attributes and the columns.

### An HTML template

Put a `<template card>` inside the list, next to the columns. The viewer copies it for each row
and fills in the fields:

```html
<lfdln-data-viewer label="Plants" adapter="json" src="plants.json" open-event>
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
```

Several lists can share one template: give it an `id` anywhere on the page and name it in
`card-template`. It wins over a `<template card>` child. If no `<template>` has that id, the list
uses the built-in card and the console says so once.

```html
<template id="plant-card">…</template>
<lfdln-data-viewer card-template="plant-card" …></lfdln-data-viewer>
<lfdln-data-viewer card-template="plant-card" …></lfdln-data-viewer>
```

The template is read once, when the list first draws (like the columns), and again when
`card-template` changes. Each card is made once per row and kept, so redrawing the list (a menu
opening, a busy state) doesn't rebuild it, and focus stays where it was. A card is made again
only for a new row object or a new template.

### Markers

| Marker | What it does |
|---|---|
| `{{key}}` | The row's field, as text, in text or in an attribute value. A column's key is formatted like that column (`{{price}}` gives `€6.50`); any other key gives the plain value, and a list gives its items joined with commas. `{{shop.name}}` reads a nested field. A missing field gives nothing. Template only. |
| `data-if="key"` | The element is left out when the field is empty: missing, `null`, `''` or an empty list. `0` and `false` are not empty. Template only. |
| `data-open` | This element opens the card (see below). Without it, the first heading (`h1`–`h6`) does. |
| `data-action="id"` | A click fires `dv-action` with `{ id, item: { id, label }, row }`, where `label` is the element's text. Like a menu item, but with no confirm. |
| `<dv-menu>` | The row's ⋯ menu, from `cardOf(row).menu`, with confirm for `confirm` items. Nothing when the row has no items. |
| `<dv-actions>` | The row's menu items as buttons, laid out by `card-actions` (`wrap`, the default here, or `row`) and `card-actions-max`, the rest in a More menu. |

Menu items still come only from `cardOf(row).menu`, so a list with `<dv-menu>` or `<dv-actions>`
sets `cardOf` from a script or a [setup file](#setup-in-its-own-file). After filling, `data-if` is
gone from the card; `data-open` and `data-action` stay, so your CSS can use them.

### Opening the card

In a template, the viewer puts the open control's contents into a link (when `cardOf(row).href`
or `card-href` gives an address) or a button that fires `dv-open`, with the class the built-in
card uses (`lfdln-card-link`, and `dv-card-open`). Its `::after` covers the whole card, so a click
anywhere opens it; the card's other buttons, links and menus sit above that layer and keep their
own clicks. The `<li>` is named by that control (`aria-labelledby`), so a screen reader hears
"Rose", not the whole card. The usual rules apply: with columns written in HTML, a card without an
address fires `dv-open` only with `open-event`. A template with no `data-open` and no heading makes
cards that can't be opened, and the console says so once.

With `cardTemplate` and `cardMount` the viewer doesn't change your markup. Put `data-open` on your
own `<a href>` or `<button>`: the viewer stretches it over the card, a click on a `[data-open]`
button fires `dv-open`, and the `<li>` is named by it.

### `cardTemplate`: Lit or plain JS

```js
import { html } from 'lit';

list.cardTemplate = (row, pieces) => html`
  <button type="button" data-open>${row.name}</button>
  <p class="price">${pieces.text('price')}</p>
  <button type="button" data-action="aside">Put one aside</button>
  ${pieces.menu}${pieces.actions}`;
```

It may also return a DOM element built by hand (a new one on every call replaces the old one, so
keep it if focus matters). `pieces`:

- `pieces.menu`: the row's ⋯ menu (what `<dv-menu>` shows), or nothing.
- `pieces.actions`: the row's menu items as buttons (what `<dv-actions>` shows), or nothing.
- `pieces.text(key)`: the field as `{{key}}` would give it, formatted like its column.

The function runs on every drawing of the list; Lit only changes what changed.

### `cardMount`: React and other frameworks

`cardMount(el, row, pieces)` gets an empty `<div class="dv-card-mount">` inside the card's `<li>`
and draws into it however it likes. It may return a cleanup function. With React:

```jsx
import { createRoot } from 'react-dom/client';
import { useEffect, useRef } from 'react';

function PlantCard({ plant, menu }) {
  const spot = useRef(null);
  useEffect(() => { spot.current.append(menu); }, [menu]);
  return (
    <>
      <button type="button" data-open>{plant.name}</button>
      <p>{plant.latin}</p>
      <span ref={spot} />
    </>
  );
}

list.cardMount = (el, row, pieces) => {
  const root = createRoot(el);
  root.render(<PlantCard plant={row} menu={pieces.menu} />);
  return () => root.unmount();
};
```

Here `pieces.menu` and `pieces.actions` are elements (`<dv-menu>` and `<dv-actions>`) that the
viewer keeps up to date; put them where you want them in your card. `pieces.text(key)` is as above.

The viewer calls `cardMount` after it draws, for each card that is new on the screen, and the
cleanup for each card that left: another page, a search, a filter, a sort, new `rows`, the switch
to the table, or the list leaving the page (it mounts them again when the list comes back). A
`cardMount` that throws leaves its own card empty and logs the error; the other cards are drawn.

`configure()` and setup files take `cardTemplate` and `cardMount` too, and `defineList<Row>`
types their `row` as `Row`.

### Safety

- Fields go in as text (`textContent` and `setAttribute`), never as HTML, so `<b>` in a name shows
  as `<b>`.
- In `href`, `src`, `srcset`, `action`, `formaction`, `poster` and `xlink:href`, a value with a
  `{{field}}` must be a web, mail or phone address (or relative); anything else (`javascript:`, say)
  removes the attribute. In `srcset` every address is checked.
- A `{{field}}` in an `on…` attribute, in `style` or in `srcdoc` is refused: the attribute is
  dropped and the console says so once per template. Fields inside `<style>` are left alone.
- The template itself is your own markup and is used as written, except that `<script>` elements
  in it are taken out: they never run.

### Starter CSS

A custom card's `<li>` has the class `dv-card-custom` and none of the built-in card's look, so it
starts bare. This gives it the built-in card's frame:

```css
.dv-card-custom {
  display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem;
  background: var(--dv-surface); border: 1px solid var(--dv-border); border-radius: var(--dv-radius);
}
.dv-card-custom:hover { border-color: var(--dv-muted); }
.dv-card-custom h3 { margin: 0; font-size: 1rem; }
.dv-card-custom p { margin: 0; }
.dv-card-custom img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 4px; }
.dv-card-custom dv-menu { position: absolute; top: 0.5rem; right: 0.5rem; }
```

The built-in pieces keep their own classes and look (`lfdln-menu-*` for `<dv-menu>`,
`lfdln-card-actions*` for `<dv-actions>`).

## Menus

### The ⋯ menu on each row

A card's `menu` (from `cardOf`) is a list of items, lines and headings:

```ts
type MenuItem = {
  id: string;
  label: string;        // the item's name; always text
  icon?: Content;       // before the label, in a fixed-width slot; a string is text (an emoji works)
  description?: string; // a quieter second line, always shown
  href?: string;        // a link instead of an action
  danger?: boolean;     // shown last, after a line, in --dv-danger
  disabled?: boolean;
  why?: string;         // shown in place of the description, only when the item is disabled
  confirm?: string;     // asked in a built-in dialog before action fires
};
type MenuEntry = MenuItem | { separator: true } | { heading: string };
```

```js
menu: [
  { id: 'rename', label: 'Rename', icon: '✏️', description: 'Give it a new name' },
  { heading: 'Share' },
  { id: 'mail', label: 'By email', icon: mailSvg },
  { separator: true },
  { id: 'delete', label: 'Delete', danger: true, confirm: 'Delete this file?' },
]
```

- Pressing an item without `href` fires `dv-action` with `{ id, row }`.
- Danger items come last, after a line of their own. The rest keep your order. A heading names
  the items after it (up to the next line or heading) as a group; a heading with no items under it,
  and extra lines, are left out.
- An item's name is its label; its description (or why) is its `aria-describedby`. Icons are
  hidden from screen readers. A `Node` icon is copied for each menu, so one node can serve every row.
- A disabled item can't be pressed, and says why when you give `why`.
- The viewer never deletes anything. Ask for confirmation in your `dv-action` listener, or give the
  item `confirm: 'Delete this recipe?'` and the viewer asks in a `<dialog>` first. Its OK button
  carries the item's label. Cancel or Escape fires nothing.
- The keyboard: Enter, Space or ↓ opens it on the first item, ↑ on the last. ↑ ↓ Home End move
  (skipping lines and headings), Escape and Tab close it, and focus goes back to the ⋯ button. A
  click outside closes it too, and that click doesn't open the card under it.
- It opens in the top layer (`popover`), so a scrolling box never clips it. It sits under its
  button, right edges lined up, and stays on screen.

### A menu on its own

The same menu works anywhere on a page as `<lfdln-menu>`, from the
[menu package](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/menu#readme). The standalone viewer script registers it. (It was
`<lfdln-dv-menu>` before the split; its event is now `menu-action`.)

## Events

All events bubble and are `composed`, so a viewer inside another viewer's card reaches the outer
host's listeners too: check `e.target === el` when lists nest. In TypeScript,
`addEventListener('dv-query', …)` gets a typed `e.detail` (the package adds the events to
`HTMLElementEventMap`; `DataViewerEventMap<Row>` types them for your own row type).

| Event | `detail` | When |
|---|---|---|
| `dv-query` | `{ page, search, sort, dir, view, size, searchIn?, filters? }` | What to show changed, in both modes. `dir` is `'asc'` or `'desc'`. `size` is the rows per page in use: the visitor's pick when there is a picker, otherwise `page-size`. `searchIn` (the "Search in" column) and `filters` are there only when set. |
| `dv-open` | `{ row }` | A card or a first cell was pressed and the row has no `href`. |
| `dv-action` | `{ id, row }` (and `item`) | A menu item or the footer button was pressed (after its confirm, if any). From a `data-action` element in [your own card](#your-own-cards), `detail` also has `item: { id, label }`. |
| `dv-layout` | `{ layout }` | The table-or-cards switch changed. |
| `views-change` | `{ views }` | With `filter-style="views"`: a view was saved, renamed, deleted or put back by Undo. `views` is every saved view, `SavedView[]`. See [Saved views](#saved-views). |

## Address

`url-state="orders"` keeps the list's state in the address as `orders.page`, `orders.search`,
`orders.sort`, `orders.dir`, `orders.view`, with a page-size picker `orders.size`, and `orders.in`
("Search in") and one `orders.f.<key>` per filter: a choice `orders.f.status=shipped,pending` (each
value URL-encoded, so a comma inside one is `%2C`), a range `orders.f.price=10..50` (either end may
be empty: `10..`, `..50`), yes or no `orders.f.organic=yes`. Defaults are
left out (the size when it is the starting `page-size`), so a fresh list has a clean
address. Two lists with different prefixes don't clash. Back, a reload and a bookmark come back to
the same list. A search replaces the address entry; other changes add one. Without `url-state` the
state lives in the element.

`orders.size` is used only when it is one of the picker's sizes; anything else is ignored. On load
the address's size wins; without one, a size kept by `remember-as` is used and put in the address
(replacing the entry, so Back from a later entry returns to the same rows). Back and Forward
restore the size each entry has, and an entry without one shows the starting size.

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

`GET src` with `page`, `search`, `sort`, `dir`, `view` and `size` (rows per page) added, only the
ones that differ from the defaults (page 1, ascending, size 20). So with the default page size the
first load asks for `src` as written; with `page-size="10"` every request says `size=10`. It adds
`in` for "Search in" and `f.<key>` for each filter, written as the [address](#address) writes them:
read a choice by splitting on the commas, then decoding each value. The answer is either an array
(every row) or `{ rows, total, facets? }` (one page, with the options and counts for the filter).
`{ rows }` without a total is every row too.

### pammy

The data API of a pammy panel ("Where programs ask"). `src` is the list's address:
`/_pammy/api/data/<engine>/<name>/<resource>`, for example
`/_pammy/api/data/postgres/recipes/recipes`. Filters written into `src`
(`?where.published=true`) are kept. It sends `page`, `per` (the query's `size`), `search`, `sort` and `dir`. The API
pages and searches on the server, so the list is in server mode. Its limits:

- **`per` is 100 at most.** Keep `page-size` and every `page-sizes` value at 100 or less. A larger
  size asks for 100 rows, and the list's pages no longer line up with the server's.
- **Only columns the catalog marks sortable sort.** Sorting by any other column quietly falls back
  to the table's key order, so mark only those columns `sortable`.
- It has no views, so `view` is not sent.
- **One exact value per column.** Its only filter is `where.<column>=value`, so it says
  `supports: { filters: 'equals', searchIn: false, facets: false }`: the list offers single choices
  only (from the columns' `options`), no ranges, no yes / no and no "Search in" picker, and sends a
  choice as `where.<key>`.

### Your own adapter

```ts
import { registerAdapter, type Adapter } from '@lesfleursdelanuitdev/data-viewer';

const mine: Adapter = {
  async load(q, { signal, src, pageSize }) {
    const res = await fetch(`${src}?p=${q.page}&n=${q.size}&q=${encodeURIComponent(q.search)}`, { signal });
    if (!res.ok) throw new Error(`Couldn't load ${src}: ${res.status}`);
    const body = await res.json();
    return { rows: body.items, total: body.count }; // leave total out for "every row"
  },
};
registerAdapter('mine', mine);
```

An adapter may say what its server can do with `supports: { filters?: 'all' | 'equals', searchIn?:
boolean, facets?: boolean }`; without it the list offers everything. It may return `facets` with the
rows.

An adapter may also have `count(q, { signal, src })`, which returns how many rows `q` would give.
The `panel` filter style uses it for "Show 12 results"; without it the list loads one row and reads
the total. See [Counts from a server](#counts-from-a-server).

`q` is the same query `dv-query` carries, `size` included (`pageSize` is the same number, kept
for older adapters). `src` is the element's `src`, trimmed, or `''` when it has none, so an adapter that knows where
its rows are (`adapter="mine"` alone) needs no `src`. A newer query aborts `signal` for the one
still running. Only the latest answer is used, even
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
| `moreFor(title)` | `More for ${title}` (the footer's ⋯ or More button, past `card-actions-max`) |
| `more` | `More` (the words on a `row` footer's More button, unless `card-more-label`) |
| `showing(from, to, total)` | `Showing ${from}–${to} of ${total}` |
| `pageOf(page, pages)` | `Page ${page} of ${pages}` |
| `pageNumbers` | `Page numbers` (the numbered buttons' group) |
| `pageNumber(page)` | `Page ${page}` (each number's name) |
| `rowsPerPage` | `Rows per page` (the page-size picker's label) |
| `configFailed(file)` | `Couldn't load this list's setup from ${file}.` |
| `searchIn`, `allFields`, `clear` | `Search in`, `All fields`, `Clear` (the search box) |
| `filter`, `heading` | `Filter`, `Filter` (the filter button, the filter's title) |
| `apply`, `clearAll`, `none`, `nothingMatches` | `Apply filter`, `Clear all`, `No filters yet`, `Nothing matches` |
| `any`, `yes`, `no`, `from`, `to`, `upTo`, `back`, `close` | `Any`, `Yes`, `No`, `From`, `To`, `Up to`, `Back`, `Close` |
| `selected(n)`, `searchOptions(label)`, `remove(label)` | `${n} selected`, `Search ${label.toLowerCase()}`, `Remove ${label}` |

`table-label` and `cards-label` win over `showTable` and `showCards`. The pager's words
(`pages` to `rowsPerPage`, and `empty`) are the pagination package's `PaginationWords`, the search
box's the search package's `SearchWords` and the filter's the filter package's `FilterWords`.
The numbers handed to `showing`, `pageOf` and `pageNumber` are already formatted for the locale.
`defaultWords` is exported. The filter styles add their own words, set the same way (`views`'
`newView`, `sentence`'s `things`: `words = { things: 'plants' }`): see
[Words for the styles](#words-for-the-styles).

## Styling

The viewer adds one `<style id="lfdln-dv-style">` as the first child of `<head>`, and the menu,
pagination, card, search and filter packages add theirs (`lfdln-menu-style`,
`lfdln-pagination-style`, `lfdln-card-style`, `lfdln-search-style`, `lfdln-filter-style`, the
card's always after the menu's), each once per page. Inside a list, their `--search-*` and
`--filter-*` variables are set from the list's `--dv-*` ones. Every rule in them
sits inside `:where()`, which has no specificity, so any rule of yours wins. Two rules can't be
inside `:where()`, because pseudo-elements can't: `.lfdln-card-link::after` (the layer that makes
the whole card open it), `.lfdln-menu-confirm::backdrop` and `.lfdln-filter-sheet::backdrop`. To change those, use a selector with at least
one class, such as `.lfdln-card .lfdln-card-link::after`.

Because your rules win, page-wide ones reach inside the viewer too: an `a { … }` rule restyles its
view switch, links and card titles, and a `:focus-visible { … }` rule replaces its focus ring. If
you don't want that, keep the viewer out of those rules, for example
`a:not(lfdln-data-viewer a) { … }`, or restyle it on purpose with the classes below.

### Variables

Each has a light and a dark default, chosen with `light-dark()` by the page's own `color-scheme`.
A page that says nothing (or `color-scheme: light`) gets the light colours, even on a dark
system, so the list never turns dark on a light-only site. To follow the system, say so on your
page: `<meta name="color-scheme" content="light dark">` or `:root { color-scheme: light dark; }`.
Set the variables on `:root` or on the element:

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

Inside a list, the menus', the pager's and the cards' own variables (`--menu-*`,
`--pagination-*`, `--card-*`) are set from these, so `--dv-*` themes all of it. Set
`--dv-*`, not those, on a list.

```css
lfdln-data-viewer { --dv-accent: #8a3ffc; --dv-radius: 4px; }
.dv-cards .lfdln-card { box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); }
```

### Class names

These are the styling interface.

| Class | Part |
|---|---|
| `dv-root` | The whole list (has `aria-busy`) |
| `dv-bar` | The bar above the list: search, filter, views, layout switch |
| `dv-search` | Holds the search box (`lfdln-search-root`, `lfdln-search-input`, `lfdln-search-in`, `lfdln-search-clear`, `lfdln-search-submit`: see the [search package](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/search#class-names)) |
| `dv-filter` | Holds the filter button and its dialog (`lfdln-filter-*`: see the [filter package](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/filter#class-names)) |
| `lfdln-filter-chips`, `lfdln-filter-chip` | The applied filters, under the bar |
| `dv-views` | The views (`<nav>` of links; the current one has `aria-current="true"`) |
| `dv-count` | A view's count |
| `dv-layout` | The table-or-cards switch (buttons with `aria-pressed`) |
| `dv-layout-icon` | A switch button's icon (`layout-switch="icons"` or `"both"`) |
| `dv-layout-text` | A switch button's words (hidden text with `layout-switch="icons"`) |
| `dv-table-wrap` | The box the table scrolls in |
| `dv-table` | The `<table>` |
| `dv-right` | A right-aligned cell |
| `dv-open` | The first cell's link or button |
| `dv-row-head` | The first cell's picture and way in, together |
| `dv-row-picture` | The first cell's small picture |
| `dv-row-menu` | The last cell, with the ⋯ menu |
| `dv-cards` | The card list (`<ul>`); each card is an `<li class="lfdln-card">` |
| `dv-card-custom` | A card you draw yourself (see [Your own cards](#your-own-cards)); it also has `dv-card` |
| `dv-card-open` | The link or button the viewer puts in a template card's open control (it also has `lfdln-card-link`) |
| `dv-card-mount` | The empty element `cardMount` draws into |
| `dv-badge` | A `badge` column's pill |
| `lfdln-card`, `lfdln-card-head`, `lfdln-card-link`, `lfdln-card-title`, `lfdln-card-badge`, `lfdln-card-body`, `lfdln-card-picture`, `lfdln-card-fact`, `lfdln-card-foot`, `lfdln-card-meta`, `lfdln-card-value`, `lfdln-card-action`, `lfdln-card-actions`, `lfdln-card-actions-row`, `lfdln-card-actions-more`, `lfdln-card-more`, `lfdln-card-danger` | A card's parts: see the [card package](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/card#class-names) (they were `dv-card-*` before the split) |
| `lfdln-menu-wrap`, `lfdln-menu-button`, `lfdln-menu-list`, `lfdln-menu-item`, `lfdln-menu-label`, `lfdln-menu-icon`, `lfdln-menu-desc`, `lfdln-menu-why`, `lfdln-menu-heading`, `lfdln-menu-group`, `lfdln-menu-danger`, `lfdln-menu-confirm` | The ⋯ menus and the confirm dialog: see the [menu package](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/menu#class-names) (they were `dv-menu-*` and `dv-confirm`) |
| `lfdln-pagination-nav`, `lfdln-pagination-status`, `lfdln-pagination-page`, `lfdln-pagination-info`, `lfdln-pagination-size`, `lfdln-pagination-pager`, `lfdln-pagination-numbers`, `lfdln-pagination-current`, `lfdln-pagination-gap`, `lfdln-pagination-now` | The pages bar: see the [pagination package](https://github.com/lesfleursdelanuitdev/data-viewer/tree/main/packages/pagination#class-names) (they were `dv-pages`, `dv-numbers`, …) |
| `dv-empty` | "Nothing to show." |
| `dv-error` | The error box with Try again |
| `dv-sr` | Text for screen readers only (the pager has its own, `lfdln-pagination-sr`) |

### Phones

At 640 px wide or less:

- The list starts as cards, unless `layout` is set or a remembered choice exists.
- The "Search in" picker goes under the search box, and the filter opens as a bottom sheet
  (639 px or less).
- Buttons, inputs, the page-size picker, view links and menu items are at least 44 px tall; the ⋯
  buttons and the layout switch's buttons are at least 44 px wide too.
- Numbered pages give way to "Page 5 of 12" between Previous and Next.
- The page never scrolls sideways. A table scrolls inside its own box.

## Accessibility

- Focus is always visible: a 2 px ring in `--dv-accent`.
- "Showing 1–20 of 54" and the page number are in a polite live region.
- Numbered pages: the current one has `aria-current="page"`; the others are buttons named
  "Page 4". After pressing a number, focus moves to the current page, so it isn't lost (nor left
  on a button that now shows another number).
- The page-size picker is a `<select>` labelled "Rows per page".
- An icon-only layout switch keeps its words as each button's name and `title`.
- Each ⋯ button is named after its row ("What you can do with Rose jam") and says it opens a menu
  (`aria-haspopup`, `aria-expanded`).
- Every piece of text can be replaced through `words`, except the `bool` column's Yes and No.

## Browser support

Tested in Chromium. It uses `popover` for the menu, `:has()` for the card's focus ring and
`<dialog>` for the confirm, and `light-dark()` for its colours, so it needs a browser from 2024
or later (Chrome 123, Safari 17.5, Firefox 125).

## Licence

MIT. See [LICENSE](LICENSE).
