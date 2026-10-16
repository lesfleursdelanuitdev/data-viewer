import { LfdlnDataViewer, define, registerSelect, type SelectAddon } from '../src/index.ts';
import { columns, items, type Item } from './select-rows.ts';

// The 54 rows plus one with no id (second, so it is on the first page). window.events collects
// each dv-select detail.
const rows: Item[] = [items[0]!, { name: 'No id', kind: 'Herb', price: 5 }, ...items.slice(1)];
const events: unknown[] = [];
(window as unknown as { events: unknown[] }).events = events;
for (const id of ['probe', 'probecards', 'probetpl']) {
  const list = document.querySelector(`#${id}`) as LfdlnDataViewer<Item>;
  list.columns = columns;
  list.rows = rows;
  list.addEventListener('dv-select', (e) => events.push((e as CustomEvent).detail));
}
(document.querySelector('#probetpl') as LfdlnDataViewer<Item>).cardTemplate = (r) => r.name;
define();

// The probe: plain boxes and a bar that shows the count, drawn with the viewer's kit.
const checked = (e: Event) => (e.target as HTMLInputElement).checked;
const probe: SelectAddon = {
  styles() {},
  bar: (view, _on, kit) => kit.html`<p class="probe-bar">${view.count}</p>`,
  pageBox: (view, on, kit) => kit.html`<input type="checkbox" class="probe-box" aria-label="Select the page"
    ?disabled=${!view.pageCount} .checked=${view.page === 'all'} @change=${(e: Event) => on.onPage(checked(e))}>`,
  box: (row, _view, onTick, kit) => kit.html`<input type="checkbox" class="probe-box" aria-label=${row.name}
    ?disabled=${!row.key} .checked=${row.ticked} @change=${(e: Event) => onTick(checked(e))}>`,
};
setTimeout(() => registerSelect(probe), 200);
