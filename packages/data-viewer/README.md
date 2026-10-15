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
| `dist/data-viewer.standalone.js` | plain pages; Lit, the menu, the pager, the card, the search box and the filter are inside (about 40 KB gzipped) | Yes, on load: all eight tags |

### In an app

Importing the package registers nothing. Call `define()` once, before the tag is used:

```ts
import { define } from '@lesfleursdelanuitdev/data-viewer';

define(); // <lfdln-data-viewer> and <lfdln-dv-column>
```

`define(name, columnName)` registers the tags under other names, for a page where
`lfdln-data-viewer` is taken. A name that is already registered is left alone, so calling
`define()` twice is safe. The viewer needs no other tag: it draws its menus, pages and cards
itself. To use `<lfdln-menu>`, `<lfdln-pagination>` or `<lfdln-card>` on their own in an app,
call `define()` from those packages.

### On a plain page

```html
<script type="module" src="/js/data-viewer.standalone.js"></script>
```

Copy `dist/data-viewer.standalone.js` from the package to your site, or load it from a CDN that
serves npm packages, for example
`https://cdn.jsdelivr.net/npm/@lesfleursdelanuitdev/data-viewer@0.1.0/dist/data-viewer.standalone.js`.
It registers `<lfdln-data-viewer>`, `<lfdln-dv-column>`, `<lfdln-menu>`, `<lfdln-pagination>`
and `<lfdln-card>` when it loads, each only if no other script registered that name first, so it
can share a page with the menu, pagination and card standalone scripts. It also exports everything
the package exports (plus `LfdlnMenu`, `LfdlnPagination` and `LfdlnCard`), so a page script can do
`import { registerAdapter } from '/js/data-viewer.standalone.js'`.

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
| `views` | none | `View[]` | unset | Tabs such as All / Quick: `{ key, label, count?, where? }`. In browser mode `where(row)` filters. The list starts on view `''` (no filter), so give an "All" view the key `''`. |
| `pageSize` | `page-size` | number | `20` | Rows per page. With `page-sizes`, the starting choice. |
| `pageSizes` | `page-sizes` | `number[]` (attribute: `"10,20,50"`) | unset | Shows a "Rows per page" picker beside the paging status. See [Pages](#pages). |
| `pager` | `pager` | `'simple'` or `'numbers'` | `'simple'` | `simple`: Previous and Next. `numbers`: numbered page buttons between them. See [Pages](#pages). |
| `layout` | `layout` (reflected) | `'table'` or `'cards'` | table, or cards on a phone | How the rows are drawn. |
| `rememberAs` | `remember-as` | string | unset | Keeps the visitor's table-or-cards choice in `localStorage` under this key (and a picked page size under `<key>.size`). It doesn't decide whether the switch shows; `layout-switch` does. |
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
| `filterLabel` | `filter-label` | string | `words.filter` (`Filter`) | The filter button's words when nothing is applied. |
| `filterChips` | `filter-chips` | `'on'` or `'off'` | `'on'` | The applied filters as chips under the bar. |
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
| `dv-action` | `{ id, row }` | A menu item or the footer button was pressed (after its confirm, if any). |
| `dv-layout` | `{ layout }` | The table-or-cards switch changed. |

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
`defaultWords` is exported.

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
