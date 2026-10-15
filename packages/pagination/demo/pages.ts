import { define, type LfdlnPagination } from '../src/index.ts';

define();

// 200 made-up rows; the page shows the ones the pager asks for.
const all = Array.from({ length: 200 }, (_, i) => `Row ${i + 1}`);
const list = document.querySelector('#rows') as HTMLOListElement;
const pager = document.querySelector('#js') as LfdlnPagination;
const events: { page: number; size: number }[] = [];
(window as unknown as { events: typeof events }).events = events;

function show(page: number, size: number): void {
  list.start = (page - 1) * size + 1;
  list.replaceChildren(...all.slice((page - 1) * size, page * size).map((t) => Object.assign(document.createElement('li'), { textContent: t })));
}
pager.addEventListener('page-change', (e) => {
  events.push(e.detail);
  show(e.detail.page, e.detail.size);
});
pager.pager = 'numbers';
pager.pageSize = 25;
pager.pageSizes = [25, 50, 100];
pager.total = all.length;
pager.page = 2;
pager.lang = 'de';
pager.words = { previous: 'Zurück', next: 'Weiter', showing: (f, t, n) => `${f}–${t} von ${n}` };
show(2, 25);
