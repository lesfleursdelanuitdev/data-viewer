import { html } from 'lit';
import { configure, define, defineList, type LfdlnDataViewer, type ListColumn } from '../src/index.ts';
import type { MenuEntry } from '../src/core/types.ts';

define();

type Plant = { id: number; name: string; price: number };
const plants = (): Plant[] => [
  { id: 1, name: 'Rose', price: 6.5 },
  { id: 2, name: 'Fern', price: 4 },
  { id: 3, name: 'Throws', price: 3 },
  { id: 4, name: 'Moss', price: 2 },
  { id: 5, name: 'Basil', price: 1.5 },
];
const menu: MenuEntry[] = [
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete', danger: true, confirm: 'Delete this plant?' },
];
const columns: ListColumn<Plant>[] = [
  { key: 'name', label: 'Plant', sortable: true },
  { key: 'price', label: 'Price', type: 'money', format: { currency: 'EUR' } },
];

type Log = { events: { on: string; type: string; id?: string; row: number }[]; mounts: string[] };
const log: Log = { events: [], mounts: [] };
(window as unknown as { log: Log; plants: typeof plants }).log = log;
(window as unknown as { plants: typeof plants }).plants = plants;
const el = (id: string) => document.querySelector(`#${id}`) as LfdlnDataViewer<Plant>;
for (const id of ['lit', 'dom', 'mount', 'order']) {
  for (const type of ['dv-open', 'dv-action'] as const) {
    el(id).addEventListener(type, (e) => {
      const d = e.detail as { id?: string; row: Plant };
      log.events.push({ on: id, type, id: d.id, row: d.row.id });
    });
  }
}

// Lit: the app's own button with data-open, a data-action button, and the pieces.
void configure(el('lit'), defineList<Plant>({
  columns,
  cardOf: (p) => ({ title: p.name, menu }),
  cardTemplate: (p, pieces) => html`<button type="button" data-open>${p.name}</button>
    <p class="price">${pieces.text('price')}</p>
    <button type="button" data-action="water">Water it</button>
    ${pieces.menu}${pieces.actions}`,
  rows: plants().slice(0, 3),
}));

// A plain element, built by hand; a link that opens the plant's page.
void configure(el('dom'), defineList<Plant>({
  columns,
  cardTemplate: (p, pieces) => {
    const card = document.createElement('div');
    const a = Object.assign(document.createElement('a'), { href: `#plant-${p.id}`, textContent: p.name });
    a.setAttribute('data-open', '');
    const price = Object.assign(document.createElement('p'), { className: 'price', textContent: pieces.text('price') });
    card.append(a, price);
    return card;
  },
  rows: plants().slice(0, 2),
}));

// cardMount, as React would use it: something mounted into el, cleaned up later. Row 3 throws.
// The control comes a moment after the mount (as with React's createRoot().render()).
void configure(el('mount'), defineList<Plant>({
  columns,
  cardOf: (p) => ({ title: p.name, menu }),
  cardMount: (box, p, pieces) => {
    if (p.name === 'Throws') throw new Error('this card fails to mount');
    log.mounts.push(`mount ${p.id}`);
    const button = Object.assign(document.createElement('button'), { type: 'button', textContent: p.name });
    button.setAttribute('data-open', '');
    const timer = setTimeout(() => box.append(button, pieces.menu));
    return () => {
      clearTimeout(timer);
      box.replaceChildren();
      log.mounts.push(`cleanup ${p.id}`);
    };
  },
  rows: plants(),
}));

// All three forms at once: cardMount wins.
const order = el('order');
order.innerHTML = '<template card><h3>{{name}} from the template</h3></template>';
void configure(order, defineList<Plant>({
  columns,
  cardTemplate: (p) => html`<p>${p.name} from cardTemplate</p>`,
  cardMount: (box, p) => void box.append(`${p.name} from cardMount`),
  rows: plants().slice(0, 1),
}));
