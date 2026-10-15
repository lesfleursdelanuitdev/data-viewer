import { define as defineMenu } from '@lesfleursdelanuitdev/menu';
import { define, type CardParts, type LfdlnCard } from '../src/index.ts';

defineMenu();
define();

const events: { type: string; on: string; id?: string }[] = [];
(window as unknown as { events: typeof events }).events = events;
for (const type of ['menu-action', 'card-open']) {
  document.addEventListener(type, (e) => events.push({ type, on: (e.target as HTMLElement).id, id: (e as CustomEvent<{ id?: string } | undefined>).detail?.id }));
}

const parts: CardParts = {
  title: 'Rose jam',
  badge: 'New',
  facts: ['45 minutes', 'Persian'],
  meta: '2 days ago',
  value: '€4.20',
  action: { id: 'again', label: 'Make again' },
  menu: [
    { id: 'edit', label: 'Edit', icon: '✏️' },
    { id: 'delete', label: 'Delete', danger: true, confirm: 'Delete Rose jam?' },
  ],
};
(document.querySelector('#js') as LfdlnCard).parts = parts;
(document.querySelector('#js-row') as LfdlnCard).parts = { ...parts, title: 'Lemon tart', action: undefined };
