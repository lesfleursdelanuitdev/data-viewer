import { LfdlnDataViewer, define, registerAdapter, registerFilterStyle } from '../src/index.ts';
import { jsonAdapter } from '../src/adapters/json.ts';
import { applyQuery } from '../src/core/list.ts';
import type { Column, Query } from '../src/core/types.ts';
import { viewsStore } from '../src/element/views-store.ts';

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

for (const id of ['plants', 'test', 'missing', 'panel', 'rail', 'side', 'bar2', 'vprobe', 'vprobe-page', 'views', 'views-page']) {
  const list = document.querySelector(`#${id}`) as LfdlnDataViewer<Plant>;
  list.columns = columns;
  list.rows = plants;
}

// #columns: the same plants, every column sortable, so a header's text sorts and its funnel filters.
const cols = document.querySelector('#columns') as LfdlnDataViewer<Plant>;
cols.columns = columns.map((c) => ({ ...c, sortable: true }));
cols.rows = plants;

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
// "equals" loads as json does, but says it can only filter by equality, so each choice is single,
// and that it can't search one column ("Search in").
registerAdapter('equals', { load: jsonAdapter.load, supports: { filters: 'equals', searchIn: false } });
for (const id of ['server', 'recipes', 'counting', 'panel-equals', 'panel-server', 'search-server', 'vprobe-server']) (document.querySelector(`#${id}`) as LfdlnDataViewer<Recipe>).columns = recipeColumns;
// #search-equals: Name and Cuisine searchable, so "Search in" would have two fields to offer.
(document.querySelector('#search-equals') as LfdlnDataViewer<Recipe>).columns = recipeColumns.map((c) => (c.key === 'cuisine' ? { ...c, searchable: true } : c));

// #search: the plants, each cared for by one of four people; Name and Owner are searchable.
const searchList = document.querySelector('#search') as LfdlnDataViewer<Plant & { owner: string }>;
searchList.columns = [columns[0]!, { key: 'owner', label: 'Owner', searchable: true }, ...columns.slice(1)];
searchList.rows = plants.map((p, i) => ({ ...p, owner: ['Ana', 'Dev', 'Farah', 'Gus'][i % 4]! }));
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

// #vprobe-page: page views, one with a count of its own (99, shown as set even in browser mode).
(document.querySelector('#vprobe-page') as LfdlnDataViewer<Plant>).views = [
  { key: '', label: 'All plants' },
  { key: 'sun', label: 'Sunny', where: (p) => p.light === 'Sun' },
  { key: 'cheap', label: 'Cheap', count: 99, where: (p) => p.price < 5 },
];

// #views-page: page views (filter-style="views" adds no "All" then).
(document.querySelector('#views-page') as LfdlnDataViewer<Plant>).views = [
  { key: '', label: 'All' },
  { key: 'sun-herbs', label: 'Herbs for sun', where: (p) => p.kind === 'Herb' && p.light === 'Sun' },
];

// #vprobe, #vprobe-page, #vprobe-server: a test style for the saved views store (drawsViews,
// above, previewsDraft, the store attached). It prints each tab as <li data-key data-count
// data-current data-user> with a button that picks it, and on a user tab "rename" (to the list's
// data-rename, else "Leafy"), "delete" and a ⋯ menu (kit.menu) with Delete; the undo toast as
// <p role="status" class="vprobe-undo">; "draft" opens the draft and sets it as #test's probe
// does; "save" saves it as the list's data-label (else "Herbs"); "close" closes the draft.
const hostOf = (e: Event) => (e.target as HTMLElement).closest('lfdln-data-viewer') as HTMLElement;
registerFilterStyle('vprobe', {
  name: 'vprobe',
  instant: false,
  showsApplied: false,
  above: true,
  drawsViews: true,
  previewsDraft: true,
  store: viewsStore,
  styles() {},
  empty: () => 'Nothing in this view.',
  render: (view, on, kit) => kit.html`<div class="vprobe" data-renaming=${view.views?.renaming ?? ''}>
    <ul>${(view.views?.tabs ?? []).map((t, i) => kit.html`<li data-key=${t.key} data-count=${String(t.count)}
      data-current=${String(t.current)} data-user=${String(t.user)}><button type="button" class="vprobe-pick"
      @click=${() => on.onView?.(t.key)}>${t.label}</button>${t.user ? kit.html`<button type="button" class="vprobe-rename"
      @click=${(e: Event) => on.onRename?.(t.key, hostOf(e).dataset.rename ?? 'Leafy')}>rename</button><button type="button"
      class="vprobe-delete" @click=${() => on.onDeleteView?.(t.key)}>delete</button>${kit.menu?.([{ id: 'delete', label: 'Delete' }],
      `${view.uid}-vm${i}`, `More for ${t.label}`, (id) => id === 'delete' && on.onDeleteView?.(t.key))}` : kit.nothing}</li>`)}</ul>
    ${view.views?.undo ? kit.html`<p role="status" class="vprobe-undo"><span>${view.views.undo.label}</span> <button type="button"
      class="vprobe-undo-button" @click=${() => on.onUndoDelete?.()}>undo</button></p>` : kit.nothing}
    <p class="probe" data-count=${String(view.countFor)}>${view.countFor}</p>
    <button type="button" class="probe-draft" @click=${(e: Event) => {
      const host = hostOf(e);
      if (!view.open) on.onOpen();
      on.onDraft(host.dataset.draft ? JSON.parse(host.dataset.draft) : { kind: ['Herb'] });
    }}>draft</button>
    <button type="button" class="vprobe-save" @click=${(e: Event) => on.onSaveView?.(hostOf(e).dataset.label ?? 'Herbs')}>save</button>
    <button type="button" class="probe-close" @click=${() => on.onClose()}>close</button></div>`,
});
