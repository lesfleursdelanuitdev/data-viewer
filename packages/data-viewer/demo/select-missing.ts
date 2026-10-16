import { LfdlnDataViewer, define } from '../src/index.ts';
import { columns, items, views, type Item } from './select-rows.ts';

// window.events collects each dv-select detail.
const events: unknown[] = [];
(window as unknown as { events: unknown[] }).events = events;
for (const id of ['bare', 'plain']) {
  const list = document.querySelector(`#${id}`) as LfdlnDataViewer<Item>;
  list.columns = columns;
  list.views = views;
  list.rows = items;
  list.addEventListener('dv-select', (e) => events.push((e as CustomEvent).detail));
}
define();
