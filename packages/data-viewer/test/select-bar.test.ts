import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitActions } from '../src/select/bar.ts';
import type { MenuItem } from '../src/core/types.ts';

const item = (id: string): MenuItem => ({ id, label: id });

test('splitActions keeps 3 as buttons and puts the rest in the menu', () => {
  const five = ['a', 'b', 'c', 'd', 'e'].map(item);
  const out = splitActions(five);
  assert.equal(out.shown.length, 3);
  assert.equal(out.more.length, 2);
  assert.deepEqual(out.shown.map((i) => i.id), ['a', 'b', 'c']);
  assert.deepEqual(out.more.map((i) => i.id), ['d', 'e']);

  assert.deepEqual(splitActions(['a', 'b', 'c'].map(item)).more, []);

  // Separators and headings in batchActions are dropped: only items count.
  const mixed = [{ heading: 'Send' }, item('a'), { separator: true }, item('b'), item('c'), { separator: true }, item('d')] as unknown as MenuItem[];
  const m = splitActions(mixed);
  assert.deepEqual(m.shown.map((i) => i.id), ['a', 'b', 'c']);
  assert.deepEqual(m.more.map((i) => i.id), ['d']);

  assert.deepEqual(splitActions(['a', 'b'].map(item), 1).more.map((i) => i.id), ['b']);
  assert.deepEqual(splitActions(undefined as unknown as MenuItem[]), { shown: [], more: [] });
});
