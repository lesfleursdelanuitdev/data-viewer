import { LfdlnDataViewer, define } from '../src/index.ts';
import { applyQuery } from '../src/core/list.ts';
import { filterSections } from '../src/core/filters.ts';
import type { Column, Query } from '../src/core/types.ts';

// The pammy adapter for #pammy (the ES module registers it on import).
import '../src/adapters/pammy.ts';

type Plant = {
  name: string; owner: string; notes: string; status: string | null; tags: string[] | string;
  price: number | string | null; planted: string | null; organic: boolean | null;
};
// Messy on purpose: prices as text, missing values, tags as a list or a comma string.
const plants: Plant[] = [
  { name: 'Rose', owner: 'Ana', notes: 'Climbs the wall', status: 'growing', tags: ['flower', 'sun'], price: 12.5, planted: '1950', organic: true },
  { name: 'Fern', owner: 'Rose Smith', notes: '', status: 'growing', tags: 'shade', price: '8', planted: '1999-06-01', organic: false },
  { name: 'Mint', owner: 'Ana', notes: 'Smells of rose', status: 'sold', tags: 'herb, sun', price: '3.50', planted: '2021-04-02', organic: true },
  { name: 'Basil', owner: 'Jo', notes: '', status: 'growing', tags: ['herb'], price: 4, planted: '2022', organic: null },
  { name: 'Ivy', owner: 'Jo', notes: 'Everywhere', status: 'sold', tags: ['shade'], price: null, planted: null, organic: false },
  { name: 'Tulip', owner: 'Ana', notes: '', status: 'resting', tags: ['flower'], price: 2, planted: '2020-10', organic: true },
  { name: 'Lily', owner: 'Mei', notes: '', status: 'growing', tags: ['flower'], price: 6, planted: '2019', organic: false },
  { name: 'Sage', owner: 'Mei', notes: 'Grey leaves', status: 'growing', tags: ['herb', 'sun'], price: 5, planted: '2018', organic: true },
  { name: 'Moss', owner: 'Jo', notes: '', status: '', tags: [], price: '', planted: '1950-05', organic: null },
  { name: 'Thyme', owner: 'Ana', notes: '', status: 'growing', tags: ['herb'], price: 3, planted: '2023', organic: true },
  { name: 'Oak', owner: 'Mei', notes: 'Old', status: 'resting', tags: ['tree'], price: 120, planted: '1900', organic: false },
  { name: 'Rosemary', owner: 'Jo', notes: '', status: 'growing', tags: ['herb'], price: 4.5, planted: '2017', organic: true },
];
const plantColumns: Column<Plant>[] = [
  { key: 'name', label: 'Name', searchable: true, sortable: true },
  { key: 'owner', label: 'Owner', filterable: true },
  { key: 'notes', label: 'Notes', searchable: true },
  { key: 'status', label: 'Status', type: 'badge', filterable: true },
  { key: 'tags', label: 'Tags', type: 'tags', filterable: true },
  { key: 'price', label: 'Price', type: 'money', filterable: true, format: { currency: 'EUR', locale: 'en-IE' } },
  { key: 'planted', label: 'Planted', type: 'date', filterable: true, ranges: [{ label: '1900s', from: '1900', to: '1999' }, { label: 'Recent', from: '2020' }] },
  { key: 'organic', label: 'Organic', type: 'bool', filterable: true },
];

const el = <T>(id: string) => document.querySelector(`#${id}`) as LfdlnDataViewer<T>;
const events: { on: string; q: Query }[] = [];
(window as unknown as { events: typeof events }).events = events;
document.addEventListener('dv-query', (e) => events.push({ on: (e.target as Element).id, q: (e as CustomEvent<Query>).detail }));

for (const id of ['plants', 'quiet']) {
  el<Plant>(id).columns = plantColumns;
  el<Plant>(id).rows = plants;
}

// Server mode: the page plays a server that answers with facets for status (only).
type Order = { name: string; status: string; owner: string; kind: string };
const orders: Order[] = Array.from({ length: 30 }, (_, i) => ({
  name: `Order ${i + 1}`, status: ['paid', 'due', 'refunded'][i % 3]!, owner: ['Ana', 'Jo'][i % 2]!, kind: i % 4 ? 'A' : 'B',
}));
const orderColumns: Column<Order>[] = [
  { key: 'name', label: 'Name', searchable: true },
  { key: 'status', label: 'Status', filterable: true },
  { key: 'owner', label: 'Owner', filterable: true }, // no facets, no options: left out of the filter
  { key: 'kind', label: 'Kind', filterable: true, options: ['A', 'B'] }, // options, no counts
];
const os = el<Order>('orders');
os.columns = orderColumns;
const answer = (q: Query) => {
  const out = applyQuery(orders, orderColumns, q, { pageSize: q.size });
  const status = filterSections(orderColumns, { rows: orders, q }).find((s) => s.key === 'status')!;
  os.facets = { status: status.kind === 'choice' ? status.options.map((o) => ({ ...o, label: o.value[0]!.toUpperCase() + o.value.slice(1) })) : [] };
  os.rows = out.rows;
  os.total = out.total;
};
answer({ page: 1, search: '', sort: '', dir: 'asc', view: '', size: 20 });
os.addEventListener('dv-query', (e) => answer(e.detail));

define();
