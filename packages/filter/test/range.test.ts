import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rangeOf, rangePressed } from '../src/core/range.ts';
import { anySet, filteredCount } from '../src/core/summary.ts';
import { typedEnds } from '../src/parts/range-boxes.ts';
import type { FilterSection } from '../src/core/types.ts';

const kind: FilterSection = { key: 'kind', label: 'Kind', kind: 'choice', options: [{ value: 'Herb' }] };
const price: FilterSection = { key: 'price', label: 'Price', kind: 'range', type: 'number' };
const stock: FilterSection = { key: 'stock', label: 'In stock', kind: 'bool' };

test('rangeOf: a range value as itself, anything else as an empty range', () => {
  assert.deepEqual(rangeOf({ from: '5' }), { from: '5' });
  assert.deepEqual(rangeOf(undefined), {});
  assert.deepEqual(rangeOf(['Herb']), {});
  assert.deepEqual(rangeOf(true), {});
});

test('rangePressed: the named range whose ends are the value\'s ends, trimmed', () => {
  const under = { label: 'Under 5', to: '5' };
  const mid = { label: '5 to 10', from: '5', to: '10' };
  assert.equal(rangePressed(under, { to: '5' }), true);
  assert.equal(rangePressed(under, { to: ' 5 ' }), true);
  assert.equal(rangePressed(under, { from: '', to: '5' }), true);
  assert.equal(rangePressed(under, { from: '1', to: '5' }), false);
  assert.equal(rangePressed(mid, { from: '5', to: '10' }), true);
  assert.equal(rangePressed(mid, { from: '5' }), false);
  assert.equal(rangePressed(under, {}), false);
});

test('anySet and filteredCount: whether, and how many, sections narrow the list', () => {
  assert.equal(anySet([kind, price, stock], {}), false);
  assert.equal(filteredCount([kind, price, stock], {}), 0);
  assert.equal(anySet([kind, price, stock], { kind: [], price: { from: ' ' } }), false);
  assert.equal(anySet([kind, price, stock], { stock: false }), true);
  assert.equal(filteredCount([kind, price, stock], { kind: ['Cactus'], price: { to: '5' }, stock: true }), 3);
  // A key with no section narrows nothing here.
  assert.equal(anySet([kind], { gone: ['x'] }), false);
});

test('typedEnds: as typed while drafting, trimmed when applied at once', () => {
  assert.deepEqual(typedEnds(' 5', '10 ', 'input'), [' 5', '10 ']);
  assert.deepEqual(typedEnds(' 5', '10 ', 'change'), ['5', '10']);
  assert.deepEqual(typedEnds('', '  ', 'change'), ['', '']);
});
