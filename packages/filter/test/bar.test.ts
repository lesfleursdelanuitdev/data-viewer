import { test } from 'node:test';
import assert from 'node:assert/strict';
import { menuOptions, pillName, pillSummary, searchable } from '../src/styles/bar-logic.ts';
import { defaultFilterWords as w } from '../src/core/summary.ts';
import type { FilterSection } from '../src/core/types.ts';

const kind: FilterSection = {
  key: 'kind', label: 'Kind', kind: 'choice',
  options: [{ value: 'Herb', count: 5 }, { value: 'fern', label: 'Fern', count: 3 }, { value: 'Café', count: 1 }],
};
const price: FilterSection = {
  key: 'price', label: 'Price', kind: 'range', type: 'money', format: { currency: 'EUR', locale: 'en-IE' },
  ranges: [{ label: 'Under €5', to: '5' }],
};
const plain: FilterSection = { key: 'price', label: 'Price', kind: 'range', type: 'money', format: { currency: 'EUR', locale: 'en-IE' } };
const stock: FilterSection = { key: 'stock', label: 'In stock', kind: 'bool' };

test('pillSummary: nothing set is empty', () => {
  assert.equal(pillSummary(kind, {}, w), '');
  assert.equal(pillSummary(kind, { kind: [] }, w), '');
  assert.equal(pillSummary(price, {}, w), '');
  assert.equal(pillSummary(stock, {}, w), '');
});

test('pillSummary: one value by its label, two as "first +1"', () => {
  assert.equal(pillSummary(kind, { kind: ['Herb'] }, w), 'Herb');
  assert.equal(pillSummary(kind, { kind: ['fern'] }, w), 'Fern');
  assert.equal(pillSummary(kind, { kind: ['Herb', 'fern'] }, w), 'Herb +1');
  assert.equal(pillSummary(kind, { kind: ['Herb', 'fern', 'Café'] }, w), 'Herb +2');
  // A value no longer offered still shows, by its value.
  assert.equal(pillSummary(kind, { kind: ['Cactus'] }, w), 'Cactus');
});

test('pillSummary: a range by its label, or its ends in the column format', () => {
  assert.equal(pillSummary(price, { price: { to: '5' } }, w), 'Under €5');
  assert.equal(pillSummary(plain, { price: { from: '5', to: '10' } }, w), '€5–€10');
  assert.equal(pillSummary(plain, { price: { to: '5' } }, w), 'Up to €5');
});

test('pillSummary: a yes/no pill says nothing when on, its "no" word when set to no', () => {
  assert.equal(pillSummary(stock, { stock: true }, w), '');
  assert.equal(pillSummary(stock, { stock: false }, w), 'No');
});

test('pillName: the label and the full text, for the accessible name', () => {
  assert.equal(pillName(kind, {}, w), 'Kind');
  assert.equal(pillName(kind, { kind: ['Herb', 'fern', 'Café'] }, w), 'Kind: Herb, Fern, Café');
  assert.equal(pillName(price, { price: { to: '5' } }, w), 'Price: Under €5');
  assert.equal(pillName(stock, { stock: true }, w), 'In stock');
  assert.equal(pillName(stock, { stock: false }, w), 'In stock: No');
});

test('searchable: more than SEARCH_ABOVE (8) options', () => {
  const many = (n: number): FilterSection => ({ key: 'o', label: 'Owner', kind: 'choice', options: Array.from({ length: n }, (_, i) => ({ value: `v${i}` })) });
  assert.equal(searchable(many(8)), false);
  assert.equal(searchable(many(9)), true);
  assert.equal(searchable(price), false);
});

test('menuOptions: the options, the picked ones no longer offered, then the typed search', () => {
  assert.deepEqual(menuOptions(kind, { kind: ['Cactus'] }, '').map((o) => o.value), ['Herb', 'fern', 'Café', 'Cactus']);
  assert.deepEqual(menuOptions(kind, {}, 'cafe').map((o) => o.value), ['Café']);
  assert.deepEqual(menuOptions(kind, {}, ' FE ').map((o) => o.value), ['fern', 'Café']);
});
