import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anySet, railFallback, railRows } from '../src/styles/rail-logic.ts';
import type { FilterSection } from '../src/core/types.ts';

const kind: FilterSection = {
  key: 'kind', label: 'Kind', kind: 'choice',
  options: [{ value: 'Herb', count: 5 }, { value: 'fern', label: 'Fern', count: 0 }],
};
const light: FilterSection = { key: 'light', label: 'Light', kind: 'choice', single: true, options: [{ value: 'Sun', count: 8 }, { value: 'Shade', count: 3 }] };
const price: FilterSection = {
  key: 'price', label: 'Price', kind: 'range', type: 'money',
  ranges: [{ label: 'Under €5', to: '5', count: 6 }, { label: '€5–€10', from: '5', to: '10', count: 4 }],
};
const plain: FilterSection = { key: 'price', label: 'Price', kind: 'range', type: 'number' };
const stock: FilterSection = { key: 'stock', label: 'In stock', kind: 'bool' };

test('railFallback: the panel under 720 px, the rail from 720 px', () => {
  assert.equal(railFallback({ width: 700, layout: 'table' }), 'panel');
  assert.equal(railFallback({ width: 719.5, layout: 'cards' }), 'panel');
  assert.equal(railFallback({ width: 720, layout: 'table' }), null);
  assert.equal(railFallback({ width: 1280, layout: 'cards' }), null);
});

test('railRows: a choice lists its options with counts, on, and the value a tick leaves', () => {
  const rows = railRows(kind, { kind: ['Herb'], stock: true });
  assert.deepEqual(rows.map((r) => [r.value, r.label, r.count, r.on, r.round]), [['Herb', 'Herb', 5, true, false], ['fern', 'Fern', 0, false, false]]);
  assert.deepEqual(rows[0]!.next, { stock: true });
  assert.deepEqual(rows[1]!.next, { kind: ['Herb', 'fern'], stock: true });
});

test('railRows: a single choice is round and replaces its pick', () => {
  const rows = railRows(light, { light: ['Sun'] });
  assert.ok(rows.every((r) => r.round));
  assert.deepEqual(rows[1]!.next, { light: ['Shade'] });
  assert.deepEqual(rows[0]!.next, {});
});

test('railRows: a picked value no longer offered shows as on, count 0, and can be unticked', () => {
  const rows = railRows(kind, { kind: ['Cactus'] });
  assert.deepEqual(rows.map((r) => [r.value, r.on, r.count]), [['Herb', false, 5], ['fern', false, 0], ['Cactus', true, 0]]);
  assert.deepEqual(rows[2]!.next, {});
});

test('railRows: a range lists its named ranges as round rows; a tick sets it, another clears it', () => {
  const rows = railRows(price, { price: { to: '5' } });
  assert.deepEqual(rows.map((r) => [r.label, r.count, r.on, r.round]), [['Under €5', 6, true, true], ['€5–€10', 4, false, true]]);
  assert.deepEqual(rows[0]!.next, {});
  assert.deepEqual(rows[1]!.next, { price: { from: '5', to: '10' } });
});

test('railRows: no rows for a range without named ranges (it has the From/To boxes) or a yes/no', () => {
  assert.deepEqual(railRows(plain, {}), []);
  assert.deepEqual(railRows(stock, { stock: true }), []);
});

test('anySet: whether any section narrows the list', () => {
  assert.equal(anySet([kind, stock], {}), false);
  assert.equal(anySet([kind, stock], { kind: [] }), false);
  assert.equal(anySet([kind, stock], { stock: false }), true);
  assert.equal(anySet([kind], { kind: ['Cactus'] }), true);
});
