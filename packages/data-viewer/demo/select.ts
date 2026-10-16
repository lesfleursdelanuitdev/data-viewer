import { html } from 'lit';
import { LfdlnDataViewer, define, type MenuItem } from '../src/index.ts';
import { columns, items, type Item } from './select-rows.ts';

// The 54 rows in every list (#nokey: two of them and one with no id; #server loads 45 recipes
// through the json adapter). window.events collects { type, detail } for each dv-select, dv-open
// and dv-batch.
const events: { type: string; detail: unknown }[] = [];
(window as unknown as { events: typeof events }).events = events;
const list = (id: string) => document.querySelector(`#${id}`) as LfdlnDataViewer<Item>;
for (const id of ['table', 'cards', 'cardof', 'tpl', 'mount', 'compact', 'nokey']) {
  const el = list(id);
  el.columns = columns;
  el.rows = id === 'compact' ? items.slice(0, 5) : id === 'nokey' ? [items[0]!, { name: 'No id', kind: 'Herb', price: 5 }, items[1]!] : items;
  for (const type of ['dv-select', 'dv-open', 'dv-batch']) {
    el.addEventListener(type, (e) => events.push({ type, detail: (e as CustomEvent).detail }));
  }
}

// #table's and #server's batch actions: 3 buttons and the rest in the ⋯ menu. While window.keep
// is true, their dv-batch handler calls preventDefault(), so the selection stays.
const actions: MenuItem[] = [
  { id: 'export', label: 'Export' },
  { id: 'ship', label: 'Mark as shipped' },
  { id: 'archive', label: 'Archive' },
  { id: 'delete', label: 'Delete', danger: true },
  { id: 'never', label: "Can't do this", disabled: true },
];
const server = document.querySelector('#server') as LfdlnDataViewer<{ id: number; name: string }>;
for (const el of [list('table'), server]) {
  el.batchActions = actions;
  el.addEventListener('dv-batch', (e) => (window as unknown as { keep?: boolean }).keep === true && e.preventDefault());
}
// #cards: 3 actions; #cardof: 1 (on phones: the first as a button, the rest in a ⋯).
list('cards').batchActions = [actions[0]!, actions[1]!, actions[3]!];
list('cardof').batchActions = [actions[0]!];
for (const type of ['dv-select', 'dv-batch']) {
  server.addEventListener(type, (e) => events.push({ type, detail: (e as CustomEvent).detail }));
}

// #cardof: the built-in card, from the page's cardOf.
list('cardof').cardOf = (r) => ({ title: r.name, badge: r.kind, facts: [`€${r.price}`] });

// Custom cards: the app's own open button (its ::after covers the card) and a line of text.
list('tpl').cardTemplate = (r) => html`<button type="button" data-open class="tpl-name">${r.name}</button>
  <p class="tpl-kind">${r.kind}</p>`;
list('mount').cardMount = (el, r) => {
  const open = Object.assign(document.createElement('button'), { type: 'button', className: 'mount-name', textContent: r.name });
  open.setAttribute('data-open', '');
  const kind = Object.assign(document.createElement('p'), { className: 'mount-kind', textContent: r.kind });
  el.replaceChildren(open, kind);
};
define();
