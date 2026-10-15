import { LfdlnDataViewer, define } from '../src/index.ts';
import { applyQuery } from '../src/core/list.ts';
import type { Column, Query } from '../src/core/types.ts';

// The json adapter for #ad (the ES module registers it on import).
import '../src/adapters/json.ts';

type Row = { id: number; name: string; n: number };
const all: Row[] = Array.from({ length: 120 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}`, n: i + 1 }));
const columns: Column<Row>[] = [
  { key: 'name', label: 'Name' },
  { key: 'n', label: 'Number', type: 'number', sortable: true },
];
const el = (id: string) => document.querySelector(`#${id}`) as LfdlnDataViewer<Row>;

for (const id of ['np', 'one', 'simple', 'bad', 'icons', 'both', 'custom', 'none', 'odd']) {
  el(id).columns = columns;
  el(id).rows = id === 'one' ? all.slice(0, 5) : all;
}

// Server mode: the page plays the server and keeps every query it was asked.
const sp = el('sp');
const queries: Query[] = [];
(window as unknown as { queries: Query[] }).queries = queries;
sp.columns = columns;
const answer = (q: Query) => {
  const out = applyQuery(all, columns, q, { pageSize: q.size });
  sp.rows = out.rows;
  sp.total = out.total;
};
answer({ page: 1, search: '', sort: '', dir: 'asc', view: '', size: 10 });
let latest = 0;
sp.addEventListener('dv-query', (e) => {
  const q = e.detail;
  queries.push(q);
  const n = ++latest;
  setTimeout(() => { if (n === latest) answer(q); }, 100);
});

// Custom icons: a string must show as text, and one Node used for both buttons must show in both.
const dot = document.createElement('i');
dot.className = 'my-icon';
dot.textContent = '●';
(el('custom') as unknown as { layoutIcons: unknown }).layoutIcons = { table: '<b>T</b>', cards: dot };

// Registered last, so the host is listening before a viewer reads its address and asks.
define();
