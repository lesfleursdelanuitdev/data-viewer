import { define, type LfdlnDataViewer } from '../src/index.ts';
import type { LfdlnDvMenu } from '../src/element/dv-menu.ts';

define();

const log: { type: string; id?: string; item?: string; on: string }[] = [];
(window as unknown as { menuEvents: typeof log }).menuEvents = log;
for (const type of ['dv-action', 'dv-menu-open', 'dv-menu-close']) {
  document.addEventListener(type, (e) => {
    const d = (e as CustomEvent<{ id?: string; item?: { label: string } }>).detail;
    log.push({ type, id: d?.id, item: d?.item?.label, on: (e.target as HTMLElement).id });
  });
}

// A Node icon, given once: each menu gets its own copy.
const star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
star.setAttribute('viewBox', '0 0 16 16');
star.setAttribute('class', 'star');
star.innerHTML = '<path d="M8 1l2 5h5l-4 3 2 6-5-4-5 4 2-6-4-3h5z" fill="currentColor"/>';

type File = { id: number; name: string };
for (const id of ['rich', 'rich-cards']) {
  const el = document.querySelector(`#${id}`) as LfdlnDataViewer<File>;
  el.columns = [{ key: 'name', label: 'Name' }];
  el.cardOf = (r) => ({
    title: r.name,
    menu: [
      { id: 'delete', label: 'Delete', danger: true, icon: '🗑️', description: 'Gone for good', confirm: 'Delete it?' },
      { id: 'rename', label: 'Rename', icon: '✏️', description: 'Give it a new name' },
      { id: 'star', label: 'Star', icon: star },
      { heading: 'Share' },
      { id: 'mail', label: 'By email', icon: '✉️' },
      { id: 'print', label: 'Print', disabled: true, description: 'On paper', why: 'No printer is set up' },
    ],
  });
  el.rows = [{ id: 1, name: 'Notes.txt' }, { id: 2, name: 'Photo.jpg' }];
}

const m2 = document.querySelector('#m2') as LfdlnDvMenu;
m2.icon = star;
m2.items = [
  { id: 'name', label: 'Name' },
  { id: 'date', label: 'Date', description: 'Newest first' },
];
