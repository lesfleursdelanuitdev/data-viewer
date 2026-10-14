import { html } from 'lit';
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

// Cards with every part, and the same rows as a table, for the menu and event tests.
type Thing = { id: number; name: string; kind: string };
const things = document.querySelector('#things') as LfdlnDataViewer<Thing>;
const thingsTable = document.querySelector('#things-table') as LfdlnDataViewer<Thing>;
const events: { type: string; id?: string; row?: number }[] = [];
(window as unknown as { events: typeof events }).events = events;
const pic = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="#c9a"/></svg>');
const thingRows: Thing[] = [
  { id: 1, name: 'A thing with a page', kind: 'New' },
  { id: 2, name: 'A thing with a very long name that goes on and on past two lines of a card', kind: 'Old' },
  { id: 3, name: 'A third thing', kind: 'Old' },
];
for (const el of [things, thingsTable]) {
  el.label = 'Things';
  el.columns = [{ key: 'name', label: 'Name' }, { key: 'kind', label: 'Kind', type: 'badge' }];
  el.cardOf = (r) => ({
    title: r.name,
    href: r.id === 1 ? '#thing-1' : undefined,
    badge: r.kind,
    picture: html`<img src=${pic} alt="" />`,
    facts: ['Fact one', 'Fact two', 'Fact three'],
    meta: '2 days ago',
    value: '€12.00',
    action: { id: 'again', label: 'Order again' },
    // Given out of order on purpose: danger items must still come last.
    menu: [
      { id: 'delete', label: 'Delete', danger: true, confirm: 'Delete this thing?' },
      { id: 'edit', label: 'Edit' },
      { id: 'remove', label: 'Remove from list', danger: true },
      { id: 'archive', label: 'Archive', disabled: true, why: 'Only the owner can archive it.' },
      { id: 'view', label: 'See its page', href: '#view' },
    ],
  });
  el.rows = thingRows;
  for (const type of ['open', 'action', 'layout']) {
    el.addEventListener(type, (e) => {
      const d = (e as CustomEvent<{ id?: string; row?: Thing }>).detail;
      events.push({ type, id: d.id, row: d.row?.id });
    });
  }
}
