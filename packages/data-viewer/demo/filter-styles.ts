import { LfdlnDataViewer, define, registerFilterStyle } from '../src/index.ts';
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

for (const id of ['plants', 'test', 'missing']) {
  const list = document.querySelector(`#${id}`) as LfdlnDataViewer<Plant>;
  list.columns = columns;
  list.rows = plants;
}

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
define();

// Test scaffolding: a style that shows its draft count (and results and total in data-*), registered after the lists have drawn
// (as an add-on script that loads late would be).
setTimeout(() => registerFilterStyle('probe', {
  name: 'probe',
  instant: false,
  showsApplied: true,
  styles() {},
  render: (view, _on, kit) => kit.html`<p class="probe" data-results=${String(view.results)}
    data-total=${String(view.total)}>${view.countFor}</p>`,
}), 200);
