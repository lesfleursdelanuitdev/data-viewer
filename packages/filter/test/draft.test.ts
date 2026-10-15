import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearAll, normalise, normaliseRange, removeChip, setBool, setRange, toggleOption } from '../src/core/draft.ts';
import type { FilterSection, FilterValue } from '../src/core/types.ts';

const multi: FilterSection = { key: 'status', label: 'Status', kind: 'choice', options: [{ value: 'a' }, { value: 'b' }] };
const single: FilterSection = { ...multi, key: 'owner', single: true };
const num: FilterSection = { key: 'price', label: 'Price', kind: 'range', type: 'number' };
const date: FilterSection = { key: 'planted', label: 'Planted', kind: 'range', type: 'date' };

test('toggleOption: multi adds and removes, and drops the key when it empties', () => {
  const v0: FilterValue = {};
  const v1 = toggleOption(v0, multi, 'a');
  assert.deepEqual(v1, { status: ['a'] });
  assert.deepEqual(v0, {}); // a new object every time
  const v2 = toggleOption(v1, multi, 'b');
  assert.deepEqual(v2, { status: ['a', 'b'] });
  assert.deepEqual(toggleOption(v2, multi, 'a'), { status: ['b'] });
  assert.deepEqual(toggleOption({ status: ['a'] }, multi, 'a'), {});
});

test('toggleOption: single replaces; picking the picked one again goes back to any', () => {
  assert.deepEqual(toggleOption({ owner: ['a'] }, single, 'b'), { owner: ['b'] });
  assert.deepEqual(toggleOption({ owner: ['a'] }, single, 'a'), {});
});

test('removeChip: drops one option, and the key with the last one', () => {
  const v = { status: ['a', 'b'], price: { from: '1' }, organic: true };
  assert.deepEqual(removeChip(v, { key: 'status', option: 'a', label: 'a' }), { status: ['b'], price: { from: '1' }, organic: true });
  assert.deepEqual(removeChip({ status: ['b'] }, { key: 'status', option: 'b', label: 'b' }), {});
  assert.deepEqual(removeChip(v, { key: 'price', label: 'Price: From 1' }), { status: ['a', 'b'], organic: true });
  assert.deepEqual(removeChip(v, { key: 'organic', label: 'Organic: Yes' }), { status: ['a', 'b'], price: { from: '1' } });
  assert.deepEqual(v, { status: ['a', 'b'], price: { from: '1' }, organic: true });
});

test('setRange, setBool and clearAll', () => {
  assert.deepEqual(setRange({}, 'price', '10', undefined), { price: { from: '10' } });
  assert.deepEqual(setRange({ price: { from: '10' } }, 'price', '10', '20'), { price: { from: '10', to: '20' } });
  assert.deepEqual(setRange({ price: { from: '10' } }, 'price', '', ''), {});
  assert.deepEqual(setBool({}, 'organic', false), { organic: false });
  assert.deepEqual(setBool({ organic: false }, 'organic', undefined), {});
  assert.deepEqual(clearAll(), {});
});

test('normaliseRange: numbers swap as numbers', () => {
  assert.deepEqual(normaliseRange(num, { from: '50', to: '10' }), { from: '10', to: '50' });
  assert.deepEqual(normaliseRange(num, { from: '9', to: '10' }), { from: '9', to: '10' }); // not as text
  assert.deepEqual(normaliseRange(num, { from: ' 12.50 ', to: '3' }), { from: '3', to: '12.50' });
});

test('normaliseRange: trims and drops empty ends', () => {
  assert.deepEqual(normaliseRange(num, { from: ' ', to: '1999' }), { to: '1999' });
  assert.deepEqual(normaliseRange(num, {}), {});
});

test('normaliseRange: dates of any precision compare by their start', () => {
  assert.deepEqual(normaliseRange(date, { from: '1999', to: '1950-06' }), { from: '1950-06', to: '1999' });
  assert.deepEqual(normaliseRange(date, { from: '1950', to: '1950-06-15' }), { from: '1950', to: '1950-06-15' });
});

test('normalise: every range normalised, unset sections dropped', () => {
  assert.deepEqual(
    normalise([multi, num, date], { status: [], price: { from: '50', to: '10' }, planted: { from: ' ' }, other: true }),
    { price: { from: '10', to: '50' }, other: true },
  );
});
