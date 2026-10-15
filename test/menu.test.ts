import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entryFromAttrs, menuItems, menuLayout } from '../src/core/menu.ts';
import type { MenuEntry } from '../src/core/types.ts';

// The layout as short text: items by id, '---' for a separator, '# x' for a heading's group.
function show(entries: MenuEntry[]): string[] {
  return menuLayout(entries).map((b) =>
    b.kind === 'separator' ? '---' : `${b.heading !== undefined ? `# ${b.heading}: ` : ''}${b.items.map((i) => i.id).join(' ')}`);
}

test('items keep their order, danger ones last after a separator', () => {
  assert.deepEqual(show([
    { id: 'del', label: 'Delete', danger: true },
    { id: 'edit', label: 'Edit' },
    { id: 'view', label: 'View' },
  ]), ['edit view', '---', 'del']);
});

test('separators split items; extra, leading and trailing ones go', () => {
  assert.deepEqual(show([
    { separator: true },
    { id: 'a', label: 'A' },
    { separator: true },
    { separator: true },
    { id: 'b', label: 'B' },
    { separator: true },
  ]), ['a', '---', 'b']);
});

test('a heading names the items after it, up to the next separator or heading', () => {
  assert.deepEqual(show([
    { id: 'edit', label: 'Edit' },
    { heading: 'Share' },
    { id: 'mail', label: 'By email' },
    { id: 'link', label: 'Copy link' },
    { heading: 'Move' },
    { id: 'up', label: 'Up' },
  ]), ['edit', '# Share: mail link', '# Move: up']);
});

test('a heading left with no items is dropped, also when its items were danger ones', () => {
  assert.deepEqual(show([
    { id: 'edit', label: 'Edit' },
    { heading: 'Gone' },
    { id: 'del', label: 'Delete', danger: true },
    { heading: 'Empty' },
  ]), ['edit', '---', 'del']);
});

test('only danger items: no separator before them', () => {
  assert.deepEqual(show([{ id: 'del', label: 'Delete', danger: true }]), ['del']);
  assert.deepEqual(show([]), []);
});

test('entryFromAttrs reads an item element', () => {
  const at = (o: Record<string, string>) => (n: string) => (n in o ? o[n]! : null);
  assert.deepEqual(entryFromAttrs('item', at({ value: 'edit', icon: '✏️', description: 'Change it', why: 'x' }), ' Edit \n'), {
    id: 'edit', label: 'Edit', icon: '✏️', description: 'Change it',
  });
  assert.deepEqual(entryFromAttrs('item', at({ value: 'del', danger: '', disabled: '', why: 'Not yours', confirm: 'Sure?', href: '/x' }), 'Delete'), {
    id: 'del', label: 'Delete', danger: true, disabled: true, why: 'Not yours', confirm: 'Sure?', href: '/x',
  });
  // No value: the label is the id.
  assert.deepEqual(entryFromAttrs('item', at({}), 'Print'), { id: 'Print', label: 'Print' });
  assert.deepEqual(entryFromAttrs('separator', at({}), ''), { separator: true });
  assert.deepEqual(entryFromAttrs('heading', at({}), ' Share '), { heading: 'Share' });
  assert.equal(entryFromAttrs('other', at({}), 'x'), undefined);
});

test('menuItems: the items alone for a footer, danger last, lines and headings gone', () => {
  const ids = menuItems([
    { id: 'del', label: 'Delete', danger: true },
    { heading: 'More' },
    { id: 'edit', label: 'Edit' },
    { separator: true },
    { id: 'view', label: 'View' },
  ]).map((i) => i.id);
  assert.deepEqual(ids, ['edit', 'view', 'del']);
  assert.deepEqual(menuItems(undefined), []);
});
