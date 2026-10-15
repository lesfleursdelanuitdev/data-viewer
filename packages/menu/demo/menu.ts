import { define, type LfdlnMenu } from '../src/index.ts';

define();

// What the menus fired, for the tests.
const log: { type: string; id?: string; item?: string; on: string }[] = [];
(window as unknown as { menuEvents: typeof log }).menuEvents = log;
for (const type of ['menu-action', 'menu-open', 'menu-close']) {
  document.addEventListener(type, (e) => {
    const d = (e as CustomEvent<{ id?: string; item?: { label: string } }>).detail;
    log.push({ type, id: d?.id, item: d?.item?.label, on: (e.target as HTMLElement).id });
  });
}

// A Node icon for the trigger.
const star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
star.setAttribute('viewBox', '0 0 16 16');
star.setAttribute('class', 'star');
star.innerHTML = '<path d="M8 1l2 5h5l-4 3 2 6-5-4-5 4 2-6-4-3h5z" fill="currentColor"/>';

const m2 = document.querySelector('#m2') as LfdlnMenu;
m2.icon = star;
m2.items = [
  { id: 'name', label: 'Name' },
  { id: 'date', label: 'Date', description: 'Newest first' },
];
