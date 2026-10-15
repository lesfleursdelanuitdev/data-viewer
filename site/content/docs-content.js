// The docs pages' content and live-demo wiring, from monadelanuit's design handoff.
// site/build.mjs reads it in Node to write each page's text and code; site/src/docs.js imports it
// in the browser (as /js/docs-content.js) to mount the demos. The demos load the components from
// /js/ on this site, nothing from another one.

export const PLANTS = [
  ['Foxglove', 'Digitalis purpurea', 'Perennial', 'Part shade', 120, 6.5, 14, '2026-03-02'],
  ['Lavender', 'Lavandula angustifolia', 'Shrub', 'Sun', 60, 8, 22, '2026-02-14'],
  ["Hart's-tongue fern", 'Asplenium scolopendrium', 'Fern', 'Shade', 45, 9.5, 6, '2026-03-20'],
  ['Rosemary', 'Salvia rosmarinus', 'Herb', 'Sun', 90, 5.5, 18, '2026-01-30'],
  ['Hosta', 'Hosta sieboldiana', 'Perennial', 'Shade', 70, 11, 0, '2026-04-04'],
  ['Thyme', 'Thymus vulgaris', 'Herb', 'Sun', 25, 3.5, 40, '2026-02-02'],
  ["Lady's mantle", 'Alchemilla mollis', 'Perennial', 'Part shade', 40, 6, 12, '2026-03-11'],
  ['Box', 'Buxus sempervirens', 'Shrub', 'Part shade', 100, 14, 9, '2026-01-12'],
  ['Mint', 'Mentha spicata', 'Herb', 'Part shade', 50, 3, 33, '2026-04-18'],
  ['Hellebore', 'Helleborus niger', 'Perennial', 'Shade', 35, 12.5, 4, '2026-01-22'],
  ['Sage', 'Salvia officinalis', 'Herb', 'Sun', 60, 4.5, 0, '2026-03-27'],
  ['Hydrangea', 'Hydrangea macrophylla', 'Shrub', 'Part shade', 150, 18, 7, '2026-02-25'],
  ['Sweet woodruff', 'Galium odoratum', 'Perennial', 'Shade', 20, 4, 15, '2026-04-09'],
  ['Chives', 'Allium schoenoprasum', 'Herb', 'Sun', 30, 2.5, 27, '2026-03-05'],
  ['Maidenhair fern', 'Adiantum pedatum', 'Fern', 'Shade', 40, 10, 3, '2026-02-08'],
  ['Camellia', 'Camellia japonica', 'Shrub', 'Part shade', 180, 22, 5, '2026-01-05'],
  ['Oregano', 'Origanum vulgare', 'Herb', 'Sun', 45, 3.5, 19, '2026-04-21'],
  ['Bleeding heart', 'Lamprocapnos spectabilis', 'Perennial', 'Part shade', 75, 9, 8, '2026-03-15'],
].map(([name, latin, kind, light, height, price, stock, added]) => ({ name, latin, kind, light, height, price, stock, added }));

const CUSTOMERS = ['Ana Ruiz', 'Café Lune', 'Jane Smith', 'Tomás Ferreira', 'Mei Lin', 'Olu Adeyemi', 'Greta Holm', 'Sam Okafor', 'Léa Martin', 'Priya Nair', 'Jonas Berg', 'Hana Sato'];
const STATUSES = ['Placed', 'Packed', 'Shipped', 'Delivered', 'Delivered', 'Returned'];
export const ORDERS = Array.from({ length: 137 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 0, 3) + ((i * 37) % 280) * 86400000);
  return { number: `#${1001 + i}`, customer: CUSTOMERS[(i * 7) % CUSTOMERS.length], placed: d.toISOString().slice(0, 10),
    status: STATUSES[(i * 5) % STATUSES.length], total: Math.round(((i * 53) % 190 + 9.5) * 100) / 100 };
});

const euros = new Intl.NumberFormat('en', { style: 'currency', currency: 'EUR' });
const copy = (rows) => rows.map((r) => ({ ...r }));
const wait = (ms, signal) => new Promise((res, rej) => {
  const t = setTimeout(res, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Aborted', 'AbortError')); });
});


const PLANT_COLUMNS = [
  { key: 'name', label: 'Plant', sortable: true, searchable: true },
  { key: 'kind', label: 'Kind', type: 'badge', sortable: true, searchable: true, filterable: true },
  { key: 'light', label: 'Light', filterable: true },
  { key: 'price', label: 'Price', type: 'money', format: { currency: 'EUR' }, sortable: true, filterable: true,
    ranges: [{ label: 'Under €5', to: '5' }, { label: 'Over €10', from: '10' }] },
  { key: 'stock', label: 'In stock', type: 'number', sortable: true, filterable: true },
  { key: 'added', label: 'Added', type: 'date', sortable: true, filterable: true, ranges: [{ label: 'March', from: '2026-03', to: '2026-03' }] },
];
const PLANT_VIEWS = [
  { key: '', label: 'All' },
  { key: 'stock', label: 'In stock', where: (p) => p.stock > 0 },
  { key: 'shade', label: 'For shade', where: (p) => p.light !== 'Sun' },
];
const plantCard = (p) => ({
  title: p.name, badge: p.light, facts: [p.latin, `${p.height} cm tall`],
  meta: p.stock ? `${p.stock} in stock` : 'Sold out', value: euros.format(p.price),
  menu: [
    { id: 'aside', label: 'Put one aside', description: 'Kept for you for a day', disabled: !p.stock, why: 'None left' },
    { id: 'care', label: 'Care notes' },
    { id: 'share', label: 'Share' },
    { id: 'remove', label: 'Remove from the list', danger: true, confirm: `Remove ${p.name} from the list?` },
  ],
});

function catalogue(host, cardActions) {
  host.innerHTML = `<lfdln-data-viewer label="Plant catalogue" page-size="8" layout-switch="icons" search-in card-actions="${cardActions}"></lfdln-data-viewer>`;
  const list = host.querySelector('lfdln-data-viewer');
  Object.assign(list, { columns: PLANT_COLUMNS, views: PLANT_VIEWS, cardOf: plantCard });
  list.rows = copy(PLANTS);
  list.addEventListener('dv-action', (e) => {
    const { id, row } = e.detail;
    if (id === 'aside') { row.stock -= 1; list.rows = [...list.rows]; }
    if (id === 'remove') list.rows = list.rows.filter((p) => p !== row);
  });
  return list;
}

function registerAdapter(mod, name, adapter) {
  if (mod && typeof mod.registerAdapter === 'function') return mod.registerAdapter(name, adapter);
  const r = (globalThis.__lfdlnDataViewerAdapters ??= { adapters: new Map(), listeners: new Set() });
  r.adapters.set(name, adapter);
  for (const l of [...r.listeners]) l(name);
}

const MENU_ICON = {
  print: '<svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="16" stroke-linejoin="round"><path d="M64 80V40h128v40M64 176H32V88h192v88h-32"/><rect x="64" y="144" width="128" height="72"/></svg>',
  csv: '<svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"><path d="M128 40v136M80 128l48 48 48-48M40 216h176"/></svg>',
  link: '<svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round"><path d="M136 72l14-14a40 40 0 0 1 56 56l-28 28a40 40 0 0 1-56 0M120 184l-14 14a40 40 0 0 1-56-56l28-28a40 40 0 0 1 56 0"/></svg>',
  mail: '<svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="16" stroke-linejoin="round"><rect x="32" y="56" width="192" height="144" rx="8"/><path d="M32 64l96 72 96-72"/></svg>',
  reset: '<svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"><path d="M80 104H32V56"/><path d="M67 189a88 88 0 1 0 0-122L32 104"/></svg>',
};

const listStyle = 'margin:0;padding:0 0 0 1.6em;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:4px 20px;font-size:14px;line-height:1.7';

export const GROUPS = [
  { name: 'Get started', items: ['overview', 'install'] },
  { name: 'The list', items: ['basics', 'config', 'custom', 'server', 'scheme'] },
  { name: 'Parts', items: ['menu', 'pagination', 'card', 'search', 'filter'] },
  { name: 'Reference', items: ['styling'] },
];

export const PAGES = {
  overview: {
    nav: 'Overview', kicker: 'data-viewer', title: 'One tag for a list, as a table or as cards',
    intro: '`<lfdln-data-viewer>` shows rows with search, filters, sorting, pages and a ⋯ menu on each row. It runs on a plain HTML page or inside any framework.',
    features: [
      ['One tag', 'Load one script, write the tag, hand it rows.'],
      ['No framework', 'About 44 KB gzipped with Lit inside. No React, no build step.'],
      ['Parts on their own', 'Menu, pages, card, search and filter are tags of their own.'],
      ['Your CSS wins', 'No shadow DOM, zero-specificity rules, `--dv-*` colour variables.'],
      ['Phones and keyboards', 'Cards on small screens, 44 px targets, full keyboard use.'],
    ],
    tabs: [{ label: 'HTML', code: `<script type="module" src="/js/data-viewer.standalone.js"></script>

<lfdln-data-viewer label="Plant catalogue" page-size="8"
    layout-switch="icons" search-in config="./plants-list.js">
</lfdln-data-viewer>` }],
    notes: ['Everything on these pages is live. The plants and orders are made up.', 'Start with Basics for the HTML-only version, or Install to add it to a project.'],
    mount: (host) => catalogue(host, 'menu'),
  },

  install: {
    nav: 'Install', kicker: 'Get started', title: 'Install',
    intro: 'On a plain HTML page, add one script and you’re done. In an app with a bundler, install the package and call `define()` once.',
    tabs: [
      { label: 'Plain page', code: `<!-- 1. Copy dist/data-viewer.standalone.js to your site (Lit is inside) -->
<script type="module" src="/js/data-viewer.standalone.js"></script>

<!-- 2. Use the tags. Nothing else to call: the script makes them work. -->
<lfdln-data-viewer label="Plants" adapter="json" src="plants.json">
  <lfdln-dv-column key="name" label="Plant"></lfdln-dv-column>
</lfdln-data-viewer>

<!-- adapter="json" needs this one too -->
<script type="module" src="/js/data-viewer-json.js"></script>` },
      { label: 'App: install', code: `npm i @lesfleursdelanuitdev/data-viewer lit` },
      { label: 'define()', code: `// main.ts: once, before any list is shown
import { define } from '@lesfleursdelanuitdev/data-viewer';

define();
// From here on, every <lfdln-data-viewer> and <lfdln-dv-column>
// on the page works. Before it, they're unknown, empty tags.

// Name taken by something else? Pick your own:
// define('plant-list', 'plant-column');` },
      { label: 'configure()', code: `// Hand one list its whole setup from an object or a file
import { configure } from '@lesfleursdelanuitdev/data-viewer';
import plants from './plants-list.js';

const list = document.querySelector('lfdln-data-viewer');
await configure(list, plants);

// plants-list.js
export default {
  columns: [{ key: 'name', label: 'Plant', sortable: true }],
  load: async () => (await fetch('/plants.json')).json(),
  on: { 'dv-open': (e) => console.log(e.detail.row.name) },
};` },
      { label: 'defineList()', code: `// plants-list.ts: TypeScript only. It does nothing at run time;
// it tells the editor what a row looks like.
import { defineList } from '@lesfleursdelanuitdev/data-viewer';

type Plant = { id: number; name: string; price: number };

export default defineList<Plant>({
  columns: [
    { key: 'name', label: 'Plant' },
    { key: 'prize', label: 'Price' }, // error: not a key of Plant
  ],
  on: { 'dv-open': (e) => e.detail.row.price }, // row is a Plant
});` },
    ],
    notes: [
      '`define()` makes the tags work. Importing the package registers nothing until you call it. A plain page doesn’t need it: the standalone script calls it for you.',
      '`configure(list, setup)` gives one list its columns, rows and event handlers from an object. It’s the app version of the `config="./plants-list.js"` attribute.',
      '`defineList()` is for TypeScript only. It returns the setup unchanged, so the editor can check column keys against your row type.',
      'Lit is a peer dependency, so your app and the list share one copy. The standalone script has it inside.',
      'The standalone script registers every tag, the parts included. A page that needs only one part can load that package’s smaller script instead.',
      'Works in Chrome and Edge 123, Safari 17.5 and Firefox 125, or newer.',
    ],
  },

  basics: {
    nav: 'Basics', kicker: 'The list', title: 'HTML only',
    intro: 'Write the columns as `<lfdln-dv-column>` tags and point `src` at a JSON file. The `card-*` attributes choose what each card shows when the list switches to cards on phones.',
    tabs: [
      { label: 'HTML', code: `<script type="module" src="/js/data-viewer.standalone.js"></script>
<script type="module" src="/js/data-viewer-json.js"></script>

<lfdln-data-viewer label="Plants" adapter="json" src="plants.json" page-size="6"
    card-title="name" card-facts="latin,light" card-meta="kind" card-value="price">
  <lfdln-dv-column key="name" label="Plant" sortable></lfdln-dv-column>
  <lfdln-dv-column key="light" label="Light"></lfdln-dv-column>
  <lfdln-dv-column key="height" label="Height (cm)" type="number" sortable></lfdln-dv-column>
  <lfdln-dv-column key="price" label="Price" type="money" currency="EUR" sortable></lfdln-dv-column>
</lfdln-data-viewer>` },
      { label: 'plants.json', code: `[
  { "name": "Foxglove", "latin": "Digitalis purpurea", "light": "Part shade",
    "height": 120, "price": 6.5, "kind": "Perennial" },
  …
]` },
    ],
    notes: [
      'A file holding every row is searched, sorted and paged in the browser.',
      'To make each row a link, name the key that holds its address in `card-href`.',
    ],
    mount: (host) => {
      host.innerHTML = `<lfdln-data-viewer label="Plants" page-size="6" card-title="name" card-facts="latin,light" card-meta="kind" card-value="price">
        <lfdln-dv-column key="name" label="Plant" sortable></lfdln-dv-column>
        <lfdln-dv-column key="light" label="Light"></lfdln-dv-column>
        <lfdln-dv-column key="height" label="Height (cm)" type="number" sortable></lfdln-dv-column>
        <lfdln-dv-column key="price" label="Price" type="money" currency="EUR" sortable></lfdln-dv-column>
      </lfdln-data-viewer>`;
      host.querySelector('lfdln-data-viewer').rows = copy(PLANTS);
    },
  },

  config: {
    nav: 'Setup file & row menus', kicker: 'The list', title: 'Setup in its own file',
    intro: 'Keep `columns`, `views`, `cardOf`, the rows and the event handlers in one module and name it in `config`. Each row gets a ⋯ menu; open a row or pick an item and the event shows below.',
    controls: [{ key: 'cardActions', label: 'Card actions', options: [['menu', 'Menu'], ['wrap', 'Wrap'], ['row', 'Row']] }],
    tabs: [
      { label: 'HTML', code: `<lfdln-data-viewer label="Plant catalogue" page-size="8" remember-as="plants-layout"
    layout-switch="icons" search-in config="./plants-list.js"></lfdln-data-viewer>

<!-- Menu items as footer buttons that wrap: -->
<lfdln-data-viewer … card-actions="wrap"></lfdln-data-viewer>
<!-- Or one line that never wraps, the rest under More: -->
<lfdln-data-viewer … card-actions="row"></lfdln-data-viewer>` },
      { label: 'plants-list.js', code: `const euros = new Intl.NumberFormat('en', { style: 'currency', currency: 'EUR' });

export default {
  columns: [
    { key: 'name', label: 'Plant', sortable: true, searchable: true },
    { key: 'kind', label: 'Kind', type: 'badge', sortable: true, searchable: true, filterable: true },
    { key: 'light', label: 'Light', filterable: true },
    { key: 'price', label: 'Price', type: 'money', format: { currency: 'EUR' }, sortable: true,
      filterable: true, ranges: [{ label: 'Under €5', to: '5' }, { label: 'Over €10', from: '10' }] },
    { key: 'stock', label: 'In stock', type: 'number', sortable: true, filterable: true },
    { key: 'added', label: 'Added', type: 'date', sortable: true, filterable: true },
  ],
  views: [
    { key: '', label: 'All' },
    { key: 'stock', label: 'In stock', where: (p) => p.stock > 0 },
    { key: 'shade', label: 'For shade', where: (p) => p.light !== 'Sun' },
  ],
  cardOf: (p) => ({
    title: p.name,
    badge: p.light,
    facts: [p.latin, \`\${p.height} cm tall\`],
    meta: p.stock ? \`\${p.stock} in stock\` : 'Sold out',
    value: euros.format(p.price),
    menu: [
      { id: 'aside', label: 'Put one aside', description: 'Kept for you for a day',
        disabled: !p.stock, why: 'None left' },
      { id: 'care', label: 'Care notes' },
      { id: 'share', label: 'Share' },
      { id: 'remove', label: 'Remove from the list', danger: true,
        confirm: \`Remove \${p.name} from the list?\` },
    ],
  }),
  load: async () => (await fetch(new URL('plants.json', import.meta.url))).json(),
  on: {
    'dv-action': (e) => {
      const list = e.currentTarget;
      const { id, row } = e.detail;
      if (id === 'aside') { row.stock -= 1; list.rows = [...list.rows]; }
      if (id === 'remove') list.rows = list.rows.filter((p) => p !== row);
    },
  },
};` },
    ],
    notes: [
      '`config` resolves against the page address. The default export can also be a function that receives the list.',
      'Search covers columns marked `searchable` (all columns if none are); `search-in` adds a picker for one column.',
      'Each `filterable` column adds a filter part: a value list for text and badges, From and To for numbers, money and dates, Any/Yes/No for booleans. Changes wait for Apply filter.',
      '`layout-switch="icons"` draws the table-or-cards switch as two icons. `remember-as` keeps the choice in the browser.',
      'With `card-actions="row"` buttons stay on one line and overflow goes under More. Try Row, then narrow the window.',
      'The list never deletes anything itself. Your `dv-action` listener does.',
    ],
    mount: (host, ctx) => catalogue(host, ctx.controls.cardActions || 'menu'),
    onControl: (host, key, value) => { const l = host.querySelector('lfdln-data-viewer'); if (l) l.cardActions = value; },
  },

  custom: {
    nav: 'Custom cards', kicker: 'The list', title: 'Your own cards',
    intro: 'Draw each card yourself: a `<template>` on a plain page, `cardTemplate` with Lit, or `cardMount` for React. The list still opens the card by click and keyboard, names it for screen readers, and draws its ⋯ menu and confirm dialog.',
    tabs: [
      { label: 'HTML', code: `<lfdln-data-viewer id="plants" label="Plants" adapter="json" src="plants.json"
    layout="cards" page-size="6" open-event>
  <lfdln-dv-column key="name" label="Plant" sortable></lfdln-dv-column>
  <lfdln-dv-column key="price" label="Price" type="money" currency="EUR" sortable></lfdln-dv-column>
  <template card>
    <h3 data-open>{{name}}</h3>
    <p class="latin">{{latin}}</p>
    <p class="facts"><span class="badge">{{light}}</span> {{height}} cm · {{price}}</p>
    <button type="button" data-action="aside">Put one aside</button>
    <dv-menu></dv-menu>
  </template>
</lfdln-data-viewer>

<script type="module">
  // The ⋯ menu's items come from cardOf, as for the built-in card.
  document.querySelector('#plants').cardOf = (p) => ({
    title: p.name,
    menu: [
      { id: 'care', label: 'Care notes' },
      { id: 'remove', label: 'Remove from the list', danger: true, confirm: \`Remove \${p.name}?\` },
    ],
  });
</script>

<style>
  .dv-card-custom {
    display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem;
    background: var(--dv-surface); border: 1px solid var(--dv-border); border-radius: var(--dv-radius);
  }
  .dv-card-custom:hover { border-color: var(--dv-muted); }
  .dv-card-custom h3 { margin: 0 2.5rem 0 0; font-size: 1rem; }
  .dv-card-custom p { margin: 0; }
  .dv-card-custom dv-menu { position: absolute; top: 0.5rem; right: 0.5rem; }
</style>` },
      { label: 'Lit', code: `import { html } from 'lit';
import { configure, define } from '@lesfleursdelanuitdev/data-viewer';

define();
configure(document.querySelector('#plants'), {
  columns: [
    { key: 'name', label: 'Plant', sortable: true },
    { key: 'price', label: 'Price', type: 'money', format: { currency: 'EUR' } },
  ],
  cardOf: (p) => ({ title: p.name, menu: [{ id: 'care', label: 'Care notes' }] }),
  // Your own button opens the card: data-open stretches it over the whole card.
  cardTemplate: (p, pieces) => html\`
    <button type="button" data-open>\${p.name}</button>
    <p class="latin">\${p.latin}</p>
    <p class="facts">\${p.light} · \${pieces.text('price')}</p>
    <button type="button" data-action="aside">Put one aside</button>
    \${pieces.menu}\`,
  load: async () => (await fetch('plants.json')).json(),
});` },
      { label: 'React', code: `import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { configure, define } from '@lesfleursdelanuitdev/data-viewer';

define();

function PlantCard({ plant, pieces }) {
  const menu = useRef(null);
  // pieces.menu is an element the list keeps up to date: put it where you want it.
  useEffect(() => { menu.current.append(pieces.menu); }, [pieces]);
  return (
    <>
      <button type="button" data-open>{plant.name}</button>
      <p className="latin">{plant.latin}</p>
      <p className="facts">{plant.light} · {pieces.text('price')}</p>
      <span ref={menu} />
    </>
  );
}

export function Plants() {
  const list = useRef(null);
  useEffect(() => {
    configure(list.current, {
      columns: [
        { key: 'name', label: 'Plant', sortable: true },
        { key: 'price', label: 'Price', type: 'money', format: { currency: 'EUR' } },
      ],
      cardOf: (p) => ({ title: p.name, menu: [{ id: 'care', label: 'Care notes' }] }),
      cardMount: (el, plant, pieces) => {
        const root = createRoot(el);
        root.render(<PlantCard plant={plant} pieces={pieces} />);
        return () => root.unmount();
      },
      load: async () => (await fetch('plants.json')).json(),
    });
  }, []);
  return <lfdln-data-viewer ref={list} label="Plants" layout="cards" />;
}` },
    ],
    notes: [
      'A `<template card>` is read with the columns, before the list first draws. `card-template="id"` names a `<template>` elsewhere on the page, so several lists can share one.',
      '`{{key}}` gives a column’s key in that column’s format: `{{price}}` is `€6.50`. `data-if="key"` leaves an element out when the field is empty.',
      '`data-open` (or else the first heading) opens the card, and the whole card is its hit area. `data-action="id"` fires `dv-action`.',
      'Fields always go in as text. An address with a field is checked, and a field in `on…` or `style` drops the attribute.',
      'The ⋯ menu’s items still come from `cardOf`; `<dv-menu>` and `<dv-actions>` say where they go.',
    ],
    mount: (host) => {
      host.innerHTML = `<style>
          [data-host] .dv-card-custom {
            display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem;
            background: var(--dv-surface); border: 1px solid var(--dv-border); border-radius: var(--dv-radius);
          }
          [data-host] .dv-card-custom:hover { border-color: var(--dv-muted); }
          [data-host] .dv-card-custom h3 { margin: 0 2.5rem 0 0; font-size: 1rem; line-height: 1.3; }
          [data-host] .dv-card-custom p { margin: 0; }
          [data-host] .dv-card-custom .latin { font-style: italic; color: var(--dv-muted); }
          [data-host] .dv-card-custom .badge { display: inline-block; padding: 0 0.5rem; margin-right: 0.25rem; border: 1px solid var(--dv-border); border-radius: 999px; font-size: 0.85em; }
          [data-host] .dv-card-custom > button { align-self: start; margin-top: auto; padding: 0.35rem 0.75rem; color: inherit; background: var(--dv-bg); border: 1px solid var(--dv-border); border-radius: var(--dv-radius); cursor: pointer; }
          [data-host] .dv-card-custom dv-menu { position: absolute; top: 0.5rem; right: 0.5rem; }
        </style>
        <lfdln-data-viewer label="Plants" layout="cards" page-size="6" open-event>
          <lfdln-dv-column key="name" label="Plant" sortable></lfdln-dv-column>
          <lfdln-dv-column key="price" label="Price" type="money" currency="EUR" sortable></lfdln-dv-column>
          <template card>
            <h3 data-open>{{name}}</h3>
            <p class="latin">{{latin}}</p>
            <p class="facts"><span class="badge">{{light}}</span> {{height}} cm · {{price}}</p>
            <button type="button" data-action="aside">Put one aside</button>
            <dv-menu></dv-menu>
          </template>
        </lfdln-data-viewer>`;
      const list = host.querySelector('lfdln-data-viewer');
      list.cardOf = (p) => ({
        title: p.name,
        menu: [
          { id: 'care', label: 'Care notes' },
          { id: 'remove', label: 'Remove from the list', danger: true, confirm: `Remove ${p.name}?` },
        ],
      });
      list.rows = copy(PLANTS);
      list.addEventListener('dv-action', (e) => {
        if (e.detail.id === 'remove') list.rows = list.rows.filter((p) => p !== e.detail.row);
      });
    },
  },

  server: {
    nav: 'Server pages', kicker: 'The list', title: 'One page at a time, from a server',
    intro: 'For long lists the server searches, sorts and pages. Register an adapter that takes the query and returns one page of rows plus the total. This one pretends to be a server, so you can watch the list wait.',
    controls: [{ key: 'delay', label: 'Answer after', options: [['300', '0.3 s'], ['900', '0.9 s'], ['2500', '2.5 s']] }],
    toggles: [{ key: 'fail', label: 'Fail the next load' }],
    tabs: [
      { label: 'JavaScript', code: `import { registerAdapter } from '/js/data-viewer.standalone.js';

registerAdapter('pretend-orders', {
  async load(q, { signal }) {
    // q is { page, search, sort, dir, view, size }. A real adapter would fetch:
    // const res = await fetch(\`/api/orders?page=\${q.page}&per=\${q.size}\`, { signal });
    await wait(900, signal);
    let rows = orders.filter((o) => matches(o, q.search));
    if (q.sort) rows = sortBy(rows, q.sort, q.dir);
    const start = (q.page - 1) * q.size;
    return { rows: rows.slice(start, start + q.size), total: rows.length };
  },
});` },
      { label: 'HTML', code: `<lfdln-data-viewer label="Orders" adapter="pretend-orders" page-size="10"
    pager="numbers" page-sizes="10,20,50" url-state="orders">
  <lfdln-dv-column key="number" label="Order" sortable></lfdln-dv-column>
  <lfdln-dv-column key="customer" label="Customer" sortable></lfdln-dv-column>
  <lfdln-dv-column key="placed" label="Placed" type="date" sortable></lfdln-dv-column>
  <lfdln-dv-column key="status" label="Status" type="badge"></lfdln-dv-column>
  <lfdln-dv-column key="total" label="Total" type="money" currency="EUR" sortable></lfdln-dv-column>
</lfdln-data-viewer>` },
      { label: 'CSS', code: `/* The list has a busy attribute while it waits */
.demo:has(lfdln-data-viewer[busy]) .loading-note { visibility: visible; }` },
    ],
    notes: [
      '`pager="numbers"` adds numbered pages; on a phone they read “Page 2 of 14”. `page-sizes` adds the Rows per page picker.',
      'With `url-state` the page and size live in the address, so a reload or shared link shows the same rows.',
      'A newer query cancels the one still waiting; that is what `signal` is for.',
      'If the adapter throws, the list keeps its rows and offers Try again.',
      'If your server already speaks JSON, the ready-made `json` adapter sends `page`, `search`, `sort`, `dir` and `size` with no script.',
    ],
    mount: (host, ctx) => {
      registerAdapter(ctx.mod, 'pretend-orders', {
        async load(q, { signal } = {}) {
          ctx.log('load', { page: q.page, size: q.size, search: q.search || '', sort: q.sort || '', dir: q.dir || '' });
          await wait(Number(ctx.controls.delay || 900), signal);
          if (ctx.takeFail()) throw new Error('The pretend server failed, as asked.');
          const s = (q.search || '').toLowerCase();
          let rows = ORDERS.filter((o) => !s || Object.values(o).some((v) => String(v).toLowerCase().includes(s)));
          if (q.sort) rows = [...rows].sort((a, b) => (a[q.sort] > b[q.sort] ? 1 : a[q.sort] < b[q.sort] ? -1 : 0) * (q.dir === 'desc' ? -1 : 1));
          const start = (q.page - 1) * q.size;
          return { rows: rows.slice(start, start + q.size), total: rows.length };
        },
      });
      host.innerHTML = `<lfdln-data-viewer label="Orders" adapter="pretend-orders" page-size="10" pager="numbers" page-sizes="10,20,50">
        <lfdln-dv-column key="number" label="Order" sortable></lfdln-dv-column>
        <lfdln-dv-column key="customer" label="Customer" sortable></lfdln-dv-column>
        <lfdln-dv-column key="placed" label="Placed" type="date" sortable></lfdln-dv-column>
        <lfdln-dv-column key="status" label="Status" type="badge"></lfdln-dv-column>
        <lfdln-dv-column key="total" label="Total" type="money" currency="EUR" sortable></lfdln-dv-column>
      </lfdln-data-viewer>`;
      const list = host.querySelector('lfdln-data-viewer');
      new MutationObserver(() => ctx.setBusy(list.hasAttribute('busy'))).observe(list, { attributes: true, attributeFilter: ['busy'] });
    },
  },

  scheme: {
    nav: 'Light & dark', kicker: 'The list', title: 'Light and dark follow your page',
    intro: 'The built-in colours follow the page’s `color-scheme`, not the device. `light dark` follows the device; `light` or `dark` forces one, and the list goes along.',
    controls: [{ key: 'scheme', label: 'This box’s colours', options: [['light dark', 'Device'], ['light', 'Light'], ['dark', 'Dark']] }],
    tabs: [
      { label: 'CSS', code: `/* Follow the visitor's device */
:root { color-scheme: light dark; }

/* Or always light, or always dark */
:root { color-scheme: light; }` },
      { label: 'JavaScript', code: `// 'light', 'dark', or 'light dark' to follow the device
document.documentElement.style.colorScheme = 'dark';` },
    ],
    notes: [
      'A page with no `color-scheme` is treated as light, so the list stays light too.',
      'Write your own colours with `light-dark()` and they follow the same switch.',
    ],
    mount: (host, ctx) => {
      host.innerHTML = `<div data-scheme data-builtin style="color-scheme:${ctx.controls.scheme || 'dark'};background:Canvas;color:CanvasText;padding:14px;border-radius:8px">
        <lfdln-data-viewer label="Plants" page-size="5" card-title="name" card-facts="latin,light" card-value="price">
          <lfdln-dv-column key="name" label="Plant" sortable></lfdln-dv-column>
          <lfdln-dv-column key="light" label="Light"></lfdln-dv-column>
          <lfdln-dv-column key="price" label="Price" type="money" currency="EUR" sortable></lfdln-dv-column>
        </lfdln-data-viewer></div>`;
      host.querySelector('lfdln-data-viewer').rows = copy(PLANTS);
    },
    onControl: (host, key, value) => { const w = host.querySelector('[data-scheme]'); if (w) w.style.colorScheme = value; },
  },

  menu: {
    nav: 'Menu', mono: 'lfdln-menu', kicker: 'Parts', title: 'Menu',
    intro: '`<lfdln-menu>` is the list’s ⋯ menu, for anywhere on a page. Keyboard support, headings, disabled items that say why, and a built-in confirm.',
    tabs: [{ label: 'HTML', code: `<lfdln-menu label="More for the plant list" trigger-text="Plant list">
  <lfdln-menu-item value="print" description="A tidy page for paper">
    <svg …></svg> Print the list
  </lfdln-menu-item>
  <lfdln-menu-item value="csv" description="For a spreadsheet">
    <svg …></svg> Download as CSV
  </lfdln-menu-item>
  <lfdln-menu-heading>Share</lfdln-menu-heading>
  <lfdln-menu-item value="link"><svg …></svg> Copy a link</lfdln-menu-item>
  <lfdln-menu-item value="mail" disabled why="Email isn't set up on this page">
    <svg …></svg> Send by email
  </lfdln-menu-item>
  <lfdln-menu-separator></lfdln-menu-separator>
  <lfdln-menu-item value="reset" danger confirm="Put every plant back the way it was?">
    <svg …></svg> Start again
  </lfdln-menu-item>
</lfdln-menu>

<script>
  document.querySelector('lfdln-menu')
    .addEventListener('menu-action', (e) => console.log(e.detail.id));
</script>` }],
    notes: [
      'Items can come from script: `menu.items = [{ id, label, icon, description }, …]`.',
      '`icon="…"` on the tag replaces the ⋯; `trigger-text` shows words beside it.',
      'The row menus on the list take the same items, from `cardOf`’s `menu`.',
      'Package `@lesfleursdelanuitdev/menu`, script `menu.standalone.js`. The list’s script includes it.',
    ],
    mount: (host) => {
      host.innerHTML = `<div style="min-height:300px"><lfdln-menu label="More for the plant list" trigger-text="Plant list">
        <lfdln-menu-item value="print" description="A tidy page for paper">${MENU_ICON.print} Print the list</lfdln-menu-item>
        <lfdln-menu-item value="csv" description="For a spreadsheet">${MENU_ICON.csv} Download as CSV</lfdln-menu-item>
        <lfdln-menu-heading>Share</lfdln-menu-heading>
        <lfdln-menu-item value="link">${MENU_ICON.link} Copy a link</lfdln-menu-item>
        <lfdln-menu-item value="mail" disabled why="Email isn't set up on this page">${MENU_ICON.mail} Send by email</lfdln-menu-item>
        <lfdln-menu-separator></lfdln-menu-separator>
        <lfdln-menu-item value="reset" danger confirm="Put every plant back the way it was?">${MENU_ICON.reset} Start again</lfdln-menu-item>
      </lfdln-menu></div>`;
    },
  },

  pagination: {
    nav: 'Pagination', mono: 'lfdln-pagination', kicker: 'Parts', title: 'Pagination',
    intro: '`<lfdln-pagination>` is the list’s pages bar for any list of your own: an announced status, Previous and Next, numbered pages and Rows per page. It shows no rows; it tells you which page and size were picked.',
    tabs: [{ label: 'HTML', code: `<script type="module" src="/js/pagination.standalone.js"></script>

<ol id="plants"></ol>
<lfdln-pagination total="18" page-size="5" page-sizes="5,10,18" pager="numbers"
    label="Plant pages"></lfdln-pagination>

<script type="module">
  const plants = await (await fetch('/plants.json')).json();
  const show = (page, size) => {
    const list = document.querySelector('#plants');
    list.start = (page - 1) * size + 1;
    list.replaceChildren(...plants.slice((page - 1) * size, page * size).map((p) => {
      const li = document.createElement('li');
      li.textContent = p.name;
      return li;
    }));
  };
  document.querySelector('lfdln-pagination')
    .addEventListener('page-change', (e) => show(e.detail.page, e.detail.size));
  show(1, 5);
</script>` }],
    notes: [
      'It moves itself when pressed, then fires `page-change` with `{ page, size }`.',
      'A new size keeps the first visible row on screen.',
      'Set `total` or `page` from script when your list changes.',
      'Package `@lesfleursdelanuitdev/pagination`.',
    ],
    mount: (host) => {
      host.innerHTML = `<ol style="${listStyle};margin-bottom:16px"></ol>
        <lfdln-pagination total="${PLANTS.length}" page-size="5" page-sizes="5,10,${PLANTS.length}" pager="numbers" label="Plant pages"></lfdln-pagination>`;
      const ol = host.querySelector('ol');
      const show = (page, size) => {
        ol.start = (page - 1) * size + 1;
        ol.replaceChildren(...PLANTS.slice((page - 1) * size, page * size).map((p) => Object.assign(document.createElement('li'), { textContent: p.name })));
      };
      host.querySelector('lfdln-pagination').addEventListener('page-change', (e) => show(e.detail.page, e.detail.size));
      show(1, 5);
    },
  },

  card: {
    nav: 'Card', mono: 'lfdln-card', kicker: 'Parts', title: 'Card',
    intro: '`<lfdln-card>` is the list’s card, written in HTML: a title that opens the card, a badge, a picture, a header menu, any body, and footer actions. No script of your own.',
    tabs: [{ label: 'HTML', code: `<script type="module" src="/js/card.standalone.js"></script>

<lfdln-card href="/plants/foxglove">
  <lfdln-card-header badge="Part shade">
    <img src="foxglove.jpg" alt=""> Foxglove
    <lfdln-menu label="More for Foxglove">
      <lfdln-menu-item value="share">Share</lfdln-menu-item>
    </lfdln-menu>
  </lfdln-card-header>
  <lfdln-card-body><p>Tall spires of bells for part shade.</p></lfdln-card-body>
  <lfdln-card-footer meta="14 in stock" value="€6.50">
    <lfdln-menu-item value="buy" primary>Buy</lfdln-menu-item>
    <lfdln-menu-item value="aside">Put one aside</lfdln-menu-item>
    <lfdln-menu-item value="remove" danger confirm="Remove Foxglove?">Remove</lfdln-menu-item>
  </lfdln-card-footer>
</lfdln-card>

<!-- One line that never wraps, the rest under More: -->
<lfdln-card actions="row" more-label="More">…</lfdln-card>` }],
    notes: [
      'A leading `<img>` or `<svg>` in the header becomes the picture.',
      'Footer `<lfdln-menu-item>` tags take the menu’s attributes; `primary` marks the main button.',
      'Each fires `menu-action` with its `value` as `id`, after its `confirm`.',
      '`actions` is `wrap` (default), `row` or `menu`; `max` caps the buttons.',
    ],
    mount: (host) => {
      host.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;align-items:start">
        <lfdln-card clickable>
          <lfdln-card-header badge="Part shade">Foxglove
            <lfdln-menu label="More for Foxglove"><lfdln-menu-item value="share">Share</lfdln-menu-item><lfdln-menu-item value="report">Report</lfdln-menu-item></lfdln-menu>
          </lfdln-card-header>
          <lfdln-card-body><p style="margin:0">Tall spires of bells for part shade. Poisonous: keep it from pets.</p></lfdln-card-body>
          <lfdln-card-footer meta="14 in stock" value="€6.50">
            <lfdln-menu-item value="buy" primary>Buy</lfdln-menu-item>
            <lfdln-menu-item value="aside">Put one aside</lfdln-menu-item>
            <lfdln-menu-item value="care">Care notes</lfdln-menu-item>
            <lfdln-menu-item value="remove" danger confirm="Remove Foxglove?">Remove</lfdln-menu-item>
          </lfdln-card-footer>
        </lfdln-card>
        <lfdln-card actions="row" more-label="More" clickable>
          <lfdln-card-header>Hart's-tongue fern</lfdln-card-header>
          <lfdln-card-body><p style="margin:0">Glossy, strap-shaped leaves all year. This one keeps its actions on one line.</p></lfdln-card-body>
          <lfdln-card-footer>
            <lfdln-menu-item value="aside">Put one aside</lfdln-menu-item>
            <lfdln-menu-item value="care">Care notes</lfdln-menu-item>
            <lfdln-menu-item value="share">Share</lfdln-menu-item>
            <lfdln-menu-item value="remove" danger confirm="Remove the fern?">Remove</lfdln-menu-item>
          </lfdln-card-footer>
        </lfdln-card></div>`;
    },
  },

  search: {
    nav: 'Search', mono: 'lfdln-search', kicker: 'Parts', title: 'Search',
    intro: '`<lfdln-search>` is the list’s search box for any list of your own, with Search in to target one field. Here a Search button holds the query until it is pressed or Enter. It searches nothing itself; it tells you what was asked.',
    tabs: [{ label: 'HTML', code: `<script type="module" src="/js/search.standalone.js"></script>

<lfdln-search search-in submit-label="Search" placeholder="Search plants">
  <option value="name">Plant</option>
  <option value="latin">Latin name</option>
</lfdln-search>

<script type="module">
  document.querySelector('lfdln-search').addEventListener('search-change', (e) => {
    const { search, in: field } = e.detail; // field is '' for "All fields"
    showMatches(search, field);
  });
</script>` }],
    notes: [
      'Without `submit-label` it searches as you type, after `delay` (300 ms).',
      '`submit` alone gives a magnifier button instead of words.',
      'The × empties the box and searches again.',
      'Package `@lesfleursdelanuitdev/search`.',
    ],
    mount: (host) => {
      host.innerHTML = `<lfdln-search search-in submit-label="Search" placeholder="Search plants"><option value="name">Plant</option><option value="latin">Latin name</option></lfdln-search>
        <p data-count style="margin:16px 0 8px;font-size:13px;opacity:.7"></p><ul style="${listStyle};list-style:none;padding:0"></ul>`;
      const ul = host.querySelector('ul'), count = host.querySelector('[data-count]');
      const show = (q = '', field = '') => {
        const s = q.toLowerCase();
        const hits = PLANTS.filter((p) => !s || (field ? [p[field]] : [p.name, p.latin]).some((v) => v.toLowerCase().includes(s)));
        count.textContent = s ? `${hits.length} of ${PLANTS.length} plants match “${q}”` : `All ${PLANTS.length} plants`;
        ul.replaceChildren(...hits.map((p) => Object.assign(document.createElement('li'), { innerHTML: `${p.name} <span style="opacity:.55;font-style:italic">${p.latin}</span>` })));
      };
      host.querySelector('lfdln-search').addEventListener('search-change', (e) => show(e.detail.search, e.detail.in));
      show();
    },
  },

  filter: {
    nav: 'Filter', mono: 'lfdln-filter', kicker: 'Parts', title: 'Filter',
    intro: '`<lfdln-filter>` is the list’s filter: a button that sums up what is applied, opening the filter’s parts on the left and the chosen one on the right (a bottom sheet on phones). `<lfdln-filter-chips>` shows what is applied anywhere on the page.',
    tabs: [{ label: 'HTML', code: `<script type="module" src="/js/filter.standalone.js"></script>

<lfdln-filter id="plant-filter" heading="Filter plants"></lfdln-filter>
<lfdln-filter-chips for="plant-filter"></lfdln-filter-chips>

<script type="module">
  const filter = document.querySelector('#plant-filter');
  filter.sections = [
    { key: 'kind', label: 'Kind', kind: 'choice', options: [
      { value: 'Herb', count: 6 }, { value: 'Shrub', count: 4 },
    ] },
    { key: 'light', label: 'Light', kind: 'choice', single: true, options: [
      { value: 'Sun' }, { value: 'Part shade' }, { value: 'Shade' },
    ] },
    { key: 'price', label: 'Price', kind: 'range', type: 'money', format: { currency: 'EUR' },
      ranges: [{ label: 'Under €5', to: '5' }, { label: 'Over €10', from: '10' }] },
    { key: 'stock', label: 'In stock', kind: 'bool' },
  ];
  filter.addEventListener('filter-change', (e) => {
    showMatching(e.detail.value); // { kind: ['Herb'], price: { to: '5' }, stock: true }
  });
</script>` }],
    notes: [
      'Changes wait in a draft. Cancel, ×, Esc or a click outside drops them; Apply filter fires `filter-change` with `{ value }`.',
      'A chip’s × applies at once.',
      'A `range` keeps what was typed and swaps From and To if they are reversed.',
      'Package `@lesfleursdelanuitdev/filter`.',
    ],
    mount: (host) => {
      const counts = (k) => Object.entries(PLANTS.reduce((m, p) => ((m[p[k]] = (m[p[k]] || 0) + 1), m), {})).map(([value, count]) => ({ value, count }));
      host.innerHTML = `<div style="min-height:320px"><lfdln-filter id="plant-filter" heading="Filter plants"></lfdln-filter>
        <lfdln-filter-chips for="plant-filter" style="display:block;margin-block:12px"></lfdln-filter-chips>
        <p data-count style="margin:0;font-size:13px;opacity:.7"></p></div>`;
      const f = host.querySelector('lfdln-filter'), count = host.querySelector('[data-count]');
      f.sections = [
        { key: 'kind', label: 'Kind', kind: 'choice', options: counts('kind') },
        { key: 'light', label: 'Light', kind: 'choice', single: true, options: counts('light') },
        { key: 'price', label: 'Price', kind: 'range', type: 'money', format: { currency: 'EUR' }, ranges: [{ label: 'Under €5', to: '5' }, { label: 'Over €10', from: '10' }] },
        { key: 'stock', label: 'In stock', kind: 'bool' },
      ];
      const show = (v = {}) => {
        const hits = PLANTS.filter((p) => (!v.kind?.length || v.kind.includes(p.kind)) && (!v.light?.length || [].concat(v.light).includes(p.light))
          && (!v.price || ((v.price.from == null || p.price >= +v.price.from) && (v.price.to == null || p.price <= +v.price.to)))
          && (v.stock == null || (p.stock > 0) === v.stock));
        count.textContent = `${hits.length} of ${PLANTS.length} plants: ${hits.map((p) => p.name).join(', ') || 'none'}`;
      };
      f.addEventListener('filter-change', (e) => show(e.detail.value));
      show();
    },
  },

  styling: {
    nav: 'Styling', kicker: 'Reference', title: 'Styling',
    intro: 'The list draws into your page, so your CSS reaches every part. Set `--dv-*` variables on the tag or any parent and add rules for the documented classes. Your rules always win.',
    tabs: [{ label: 'CSS', code: `.greenhouse lfdln-data-viewer {
  --dv-bg:      light-dark(#f3f7ee, #10170f);
  --dv-surface: light-dark(#ffffff, #18221a);
  --dv-text:    light-dark(#1f2a1c, #e3eedc);
  --dv-muted:   light-dark(#4b5a45, #a5b89c);
  --dv-border:  light-dark(#c6d8ba, #2f4230);
  --dv-accent:  light-dark(#2f6b3a, #8fd19b);
  --dv-radius:  14px;
  --dv-font:    Georgia, "Times New Roman", serif;
}
.greenhouse .dv-root  { padding: 12px; border-radius: 18px; }
.greenhouse .lfdln-card { box-shadow: 0 1px 3px rgb(0 0 0 / 0.08); }
.greenhouse .lfdln-card-badge {
  background: var(--dv-accent); color: var(--dv-bg); border-color: transparent;
}` }],
    vars: [
      ['--dv-bg', 'Background, search box, menu'], ['--dv-surface', 'Cards, buttons, table headers'], ['--dv-text', 'Text'],
      ['--dv-muted', 'Quieter text'], ['--dv-border', 'Lines and borders'], ['--dv-accent', 'Links, focus ring, chosen layout'],
      ['--dv-danger', 'Delete items, the error box'], ['--dv-radius', 'Corners'], ['--dv-font', 'The font'],
    ],
    notes: [
      'Classes: `.dv-bar`, `.dv-table`, `.dv-cards`, `.dv-empty`, plus `.lfdln-card`, `.lfdln-card-title`, `.lfdln-card-badge`, `.lfdln-menu-list`, `.lfdln-pagination-nav`, `.lfdln-search-input`, `.lfdln-filter-button`, `.lfdln-filter-chip` and more.',
      'Inside a list the `--dv-*` variables colour the parts too. Used alone, each part reads its own prefix: `--menu-*`, `--card-*`, `--search-*` …',
      '`light-dark(a, b)` gives one rule for both schemes.',
      'The package READMEs on GitHub list every variable and class.',
    ],
    mount: (host) => {
      const cols = `<lfdln-dv-column key="name" label="Plant"></lfdln-dv-column><lfdln-dv-column key="price" label="Price" type="money" currency="EUR"></lfdln-dv-column>`;
      const attrs = `label="Plants" layout="cards" layout-switch="none" page-size="2" card-title="name" card-facts="latin" card-meta="light" card-value="price"`;
      host.innerHTML = `<style>
        .greenhouse lfdln-data-viewer { --dv-bg: light-dark(#f3f7ee,#10170f); --dv-surface: light-dark(#fff,#18221a); --dv-text: light-dark(#1f2a1c,#e3eedc);
          --dv-muted: light-dark(#4b5a45,#a5b89c); --dv-border: light-dark(#c6d8ba,#2f4230); --dv-accent: light-dark(#2f6b3a,#8fd19b); --dv-radius: 14px; --dv-font: Georgia,"Times New Roman",serif; }
        .greenhouse .dv-root { padding: 12px; border-radius: 18px; background: var(--dv-bg); }
        .greenhouse .lfdln-card-badge { background: var(--dv-accent); color: var(--dv-bg); border-color: transparent; }
      </style>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px">
        <figure style="margin:0;display:flex;flex-direction:column;gap:8px"><figcaption style="font-size:12px;opacity:.6">Built-in look</figcaption>
          <div data-builtin style="color-scheme:dark"><lfdln-data-viewer ${attrs}>${cols}</lfdln-data-viewer></div></figure>
        <figure class="greenhouse" style="margin:0;display:flex;flex-direction:column;gap:8px;color-scheme:dark"><figcaption style="font-size:12px;opacity:.6">Greenhouse look</figcaption>
          <div data-builtin><lfdln-data-viewer ${attrs}>${cols}</lfdln-data-viewer></div></figure>
      </div>`;
      for (const l of host.querySelectorAll('lfdln-data-viewer')) l.rows = copy(PLANTS);
    },
  },
};
