import { define, type LfdlnDataViewer } from '../src/index.ts';
import type { MenuEntry } from '../src/core/types.ts';

define();

const events: { on: string; id: string; row: number }[] = [];
(window as unknown as { events: typeof events }).events = events;

type Thing = { id: number; name: string };
// Given out of order, with a heading and a line: the footer drops those and puts danger last.
const menu: MenuEntry[] = [
  { id: 'delete', label: 'Delete', danger: true, icon: '🗑️', confirm: 'Delete this thing?' },
  { id: 'edit', label: 'Edit', icon: '✏️' },
  { heading: 'More' },
  { id: 'share', label: 'Share' },
  { id: 'archive', label: 'Archive', disabled: true, why: 'Only the owner can archive it.' },
  { separator: true },
  { id: 'view', label: 'See its page', href: '#view' },
];
for (const id of ['foot', 'foot-all', 'mixed', 'tbl', 'wrap', 'row']) {
  const el = document.querySelector(`#${id}`) as LfdlnDataViewer<Thing>;
  el.columns = [{ key: 'name', label: 'Name' }];
  el.cardOf = (r) => ({
    title: r.name,
    meta: '2 days ago',
    value: '€12.00',
    action: { id: 'again', label: 'Order again' },
    menu,
    actionsAt: id === 'mixed' && r.id === 2 ? 'footer' : id === 'mixed' && r.id === 3 ? 'row' : undefined,
  });
  el.rows = [{ id: 1, name: 'First thing' }, { id: 2, name: 'Second thing' }, { id: 3, name: 'Third thing' }];
  el.addEventListener('dv-action', (e) => events.push({ on: id, id: e.detail.id, row: (e.detail.row as Thing).id }));
}
