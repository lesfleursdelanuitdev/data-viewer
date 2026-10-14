import { LfdlnDataViewer, define } from '../src/index.ts';
import { applyQuery } from '../src/core/list.ts';
import type { Column, Query } from '../src/core/types.ts';

// The ES module registers nothing on import; a page (or the standalone script) calls define().
define();
(window as unknown as { dv: { define: typeof define } }).dv = { define };

type Recipe = { id: number; name: string; cuisine: string; minutes: number; veg: boolean; price: number; updated: string };

// 60 recipes: three words times twenty dishes, so a search for "rose" finds exactly 20.
const words = ['Spiced', 'Rose', 'Lemon'];
const dishes = ['tea', 'cake', 'rice', 'soup', 'salad', 'curry', 'bread', 'tart', 'noodles', 'stew',
  'pie', 'jam', 'lassi', 'pudding', 'pilaf', 'biscuits', 'sorbet', 'dal', 'buns', 'kulfi'];
const cuisines = ['Persian', 'Indian', 'French', 'Turkish'];
const recipes: Recipe[] = [];
for (const w of words) {
  for (const d of dishes) {
    const i = recipes.length;
    recipes.push({
      id: i + 1, name: `${w} ${d}`, cuisine: cuisines[i % 4]!, minutes: 10 + ((i * 7) % 80),
      veg: i % 3 !== 0, price: 3 + (i % 9) * 1.25, updated: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    });
  }
}
// A row that tries to inject markup: it must show as text.
recipes[59]!.name = '<img src=x onerror=alert(1)>';

const columns: Column<Recipe>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'cuisine', label: 'Cuisine', sortable: true },
  { key: 'minutes', label: 'Minutes', type: 'number', sortable: true },
  { key: 'price', label: 'Price', type: 'money', sortable: true },
  { key: 'updated', label: 'Changed', type: 'date', sortable: true },
];

const local = document.querySelector('#local') as LfdlnDataViewer<Recipe>;
local.label = 'Recipes';
local.columns = columns;
local.rememberAs = 'demo-local-layout';
local.views = [
  { key: '', label: 'All' },
  { key: 'quick', label: 'Quick', where: (r) => r.minutes <= 30 },
  { key: 'veg', label: 'Vegetarian', where: (r) => r.veg },
];
local.cardOf = (r) => ({ title: r.name, facts: [r.cuisine, `${r.minutes} min`], meta: new Date(r.updated).toLocaleDateString() });
local.rows = recipes;

// Server mode: the demo plays the server, answering each query after a short wait.
const server = recipes.slice(0, 45);
const remote = document.querySelector('#remote') as LfdlnDataViewer<Recipe>;
const queries: Query[] = [];
(window as unknown as { queries: Query[] }).queries = queries;
remote.label = 'Recipes from a server';
remote.columns = columns;
const answer = (q: Query) => {
  const out = applyQuery(server, columns, q, { pageSize: remote.pageSize });
  remote.rows = out.rows;
  remote.total = out.total;
};
answer({ page: 1, search: '', sort: '', dir: 'asc', view: '' });
let latest = 0;
remote.addEventListener('query', (e) => {
  const q = (e as CustomEvent<Query>).detail;
  queries.push(q);
  const n = ++latest;
  setTimeout(() => { if (n === latest) answer(q); }, 600);
});

// Links that try to sneak in a script: none may become a javascript: link.
type Link = { name: string; url: string };
const links = document.querySelector('#links') as LfdlnDataViewer<Link>;
links.label = 'Links';
links.columns = [
  { key: 'name', label: 'Name' },
  { key: 'url', label: 'Link', type: 'link' },
];
links.cardOf = (r) => ({ title: r.name, href: r.url });
links.rows = [
  { name: 'Tab', url: 'java\tscript:alert(1)' },
  { name: 'Newline', url: 'java\nscript:alert(1)' },
  { name: 'Control', url: '\x01javascript:alert(1)' },
  { name: 'Plain', url: 'javascript:alert(1)' },
  { name: 'Data', url: 'data:text/html,<script>alert(1)</script>' },
  { name: 'Web', url: 'https://example.com/' },
  { name: 'Relative', url: '/recipes/1' },
];

// A host that answers inside its query listener, with no wait at all.
const sync = document.querySelector('#sync') as LfdlnDataViewer<Recipe>;
sync.label = 'Answered at once';
sync.columns = columns;
const answerSync = (q: Query) => {
  const out = applyQuery(server, columns, q, { pageSize: sync.pageSize });
  sync.rows = out.rows;
  sync.total = out.total;
};
answerSync({ page: 1, search: '', sort: '', dir: 'asc', view: '' });
sync.addEventListener('query', (e) => answerSync((e as CustomEvent<Query>).detail));
