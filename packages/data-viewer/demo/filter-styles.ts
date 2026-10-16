import { LfdlnDataViewer, define, registerAdapter, registerFilterStyle } from '../src/index.ts';
import { jsonAdapter } from '../src/adapters/json.ts';
import { applyQuery } from '../src/core/list.ts';
import type { Column, Query } from '../src/core/types.ts';

// The 12 plants of filter-search.ts, tidied, with a kind, the light they like and whether any
// are in stock.
type Plant = { name: string; kind: string; light: string; price: number; stock: boolean };
const plants: Plant[] = [
  { name: 'Rose', kind: 'Flower', light: 'Sun', price: 12.5, stock: true },
  { name: 'Fern', kind: 'Foliage', light: 'Shade', price: 8, stock: true },
  { name: 'Mint', kind: 'Herb', light: 'Sun', price: 3.5, stock: false },
  { name: 'Basil', kind: 'Herb', light: 'Sun', price: 4, stock: true },
  { name: 'Ivy', kind: 'Foliage', light: 'Shade', price: 6.5, stock: false },
  { name: 'Tulip', kind: 'Flower', light: 'Sun', price: 2, stock: true },
  { name: 'Lily', kind: 'Flower', light: 'Part shade', price: 6, stock: true },
  { name: 'Sage', kind: 'Herb', light: 'Sun', price: 5, stock: true },
  { name: 'Moss', kind: 'Foliage', light: 'Shade', price: 1.5, stock: false },
  { name: 'Thyme', kind: 'Herb', light: 'Sun', price: 3, stock: true },
  { name: 'Oak', kind: 'Tree', light: 'Sun', price: 120, stock: true },
  { name: 'Rosemary', kind: 'Herb', light: 'Part shade', price: 4.5, stock: true },
];
const columns: Column<Plant>[] = [
  { key: 'name', label: 'Name', searchable: true, sortable: true },
  { key: 'kind', label: 'Kind', filterable: true },
  { key: 'light', label: 'Light', filterable: true },
  {
    key: 'price', label: 'Price', type: 'money', filterable: true, format: { currency: 'EUR', locale: 'en-IE' },
    ranges: [{ label: 'Under €5', to: '5' }, { label: '€5–€10', from: '5', to: '10' }, { label: 'Over €10', from: '10' }],
  },
  { key: 'stock', label: 'In stock', type: 'bool', filterable: true, hint: 'Hide plants that are sold out' },
];

for (const id of ['plants', 'test', 'missing', 'panel', 'rail', 'side']) {
  const list = document.querySelector(`#${id}`) as LfdlnDataViewer<Plant>;
  list.columns = columns;
  list.rows = plants;
}

// #bar: the same plants, each cared for by someone, with 30 people to choose from (18 care for
// none, so they count 0). window.barQueries keeps every dv-query #bar fires.
const firsts = ['Rose', 'Ana', 'Chloé', 'Dev', 'Emeka', 'Farah', 'Gus', 'Hana', 'Ivo', 'Jun'];
const owners = ['Smith-Montgomery', 'Okafor', 'Café'].flatMap((last) => firsts.map((first) => `${first} ${last}`));
const bar = document.querySelector('#bar') as LfdlnDataViewer<Plant & { owner: string }>;
bar.columns = [...columns, { key: 'owner', label: 'Cared for by', filterable: true, options: owners }];
bar.rows = plants.map((p, i) => ({ ...p, owner: owners[i]! }));
const barQueries: unknown[] = [];
(window as unknown as { barQueries: unknown[] }).barQueries = barQueries;
bar.addEventListener('dv-query', (e) => barQueries.push(e.detail));

// #served: the page plays a server for the same plants (server mode, no adapter). Kind has
// options, since a server-mode filter needs options or facets to have a section.
const servedColumns = columns.map((c) => (c.key === 'kind' ? { ...c, options: ['Flower', 'Foliage', 'Herb', 'Tree'] } : c));
const served = document.querySelector('#served') as LfdlnDataViewer<Plant>;
served.columns = servedColumns;
const answer = (q: Query) => {
  const out = applyQuery(plants, servedColumns, q, { pageSize: q.size });
  served.rows = out.rows;
  served.total = out.total;
};
answer({ page: 1, search: '', sort: '', dir: 'asc', view: '', size: 20 });
served.addEventListener('dv-query', (e) => answer(e.detail));

// #server, #recipes (today's dialog), #counting, #panel-equals and #panel-server: 45 recipes from the fake API, filtered by cuisine on the server.
// "counting" loads as json does but counts every draft as 999 (adapter.count wins over load).
type Recipe = { id: number; name: string; cuisine: string; minutes: number };
const recipeColumns: Column<Recipe>[] = [
  { key: 'name', label: 'Name', searchable: true },
  { key: 'cuisine', label: 'Cuisine', filterable: true, options: ['Persian', 'Indian', 'French', 'Turkish'] },
  { key: 'minutes', label: 'Minutes', type: 'number' },
];
registerAdapter('counting', { load: jsonAdapter.load, count: async () => 999 });
// "equals" loads as json does, but says it can only filter by equality, so each choice is single.
registerAdapter('equals', { load: jsonAdapter.load, supports: { filters: 'equals' } });
for (const id of ['server', 'recipes', 'counting', 'panel-equals', 'panel-server']) (document.querySelector(`#${id}`) as LfdlnDataViewer<Recipe>).columns = recipeColumns;
define();

// Test scaffolding: a style that shows its draft count (and results and total in data-*), registered after the lists have drawn
// (as an add-on script that loads late would be). Its "draft" button opens the draft (once)
// and sets it to the list's data-draft (JSON; { kind: ['Herb'] } without one); "close" closes it.
setTimeout(() => registerFilterStyle('probe', {
  name: 'probe',
  instant: false,
  showsApplied: true,
  styles() {},
  render: (view, on, kit) => kit.html`<p class="probe" data-count=${String(view.countFor)} data-results=${String(view.results)}
    data-total=${String(view.total)}>${view.countFor}</p>
    <button type="button" class="probe-draft" @click=${(e: Event) => {
      const host = (e.target as HTMLElement).closest('lfdln-data-viewer') as HTMLElement;
      if (!view.open) on.onOpen();
      on.onDraft(host.dataset.draft ? JSON.parse(host.dataset.draft) : { kind: ['Herb'] });
    }}>draft</button>
    <button type="button" class="probe-close" @click=${() => on.onClose()}>close</button>`,
}), 200);

// #side: a test style drawn in a column of its own (side) that leaves the applied filters to the
// viewer's chips row (showsApplied false): it draws one button, "side".
registerFilterStyle('probe-side', {
  name: 'probe-side',
  instant: true,
  showsApplied: false,
  side: true,
  styles() {},
  render: (_view, _on, kit) => kit.html`<button type="button" class="probe-side">side</button>`,
});
