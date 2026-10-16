import { test } from 'node:test';
import assert from 'node:assert/strict';
import { columnRows, columnsFallback, columnsSummary, filteredCount, menuAtEnd, menuLeft, menuRoom } from '../src/styles/columns-logic.ts';
import { defaultFilterWords as w } from '../src/core/summary.ts';
import type { FilterSection } from '../src/core/types.ts';

const kind: FilterSection = {
  key: 'kind', label: 'Kind', kind: 'choice',
  options: [{ value: 'Herb', count: 5 }, { value: 'fern', label: 'Fern', count: 0 }],
};
const price: FilterSection = {
  key: 'price', label: 'Price', kind: 'range', type: 'money',
  ranges: [{ label: 'Under €5', to: '5', count: 6 }, { label: '€5–€10', from: '5', to: '10', count: 4 }],
};
const plain: FilterSection = { key: 'height', label: 'Height', kind: 'range', type: 'number' };
const stock: FilterSection = { key: 'stock', label: 'In stock', kind: 'bool' };
const many: FilterSection = {
  key: 'owner', label: 'Owner', kind: 'choice',
  options: ['Ana', 'Ben', 'Chloé', 'Dev', 'Emeka', 'Farah', 'Gus', 'Hana', 'Ivo'].map((value) => ({ value, count: 1 })),
};

test('columnsFallback: the panel in cards view, none in the table', () => {
  assert.equal(columnsFallback({ width: 1280, layout: 'cards' }), 'panel');
  assert.equal(columnsFallback({ width: 300, layout: 'table' }), null);
});

test('menuAtEnd: the last two columns open their menus right-aligned', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map((index) => menuAtEnd({ index, of: 5 })), [false, false, false, true, true]);
  assert.equal(menuAtEnd({ index: 0, of: 1 }), true);
});

test('menuLeft: under the anchor, its left edge or (at the end) its right edge, kept 8 px inside the window', () => {
  const a = { left: 300, right: 330 };
  assert.equal(menuLeft(a, 220, 1280, false), 300);
  assert.equal(menuLeft(a, 220, 1280, true), 110);
  assert.equal(menuLeft({ left: 1200, right: 1230 }, 220, 1280, false), 1052);
  assert.equal(menuLeft({ left: 20, right: 50 }, 220, 1280, true), 8);
});

test('menuRoom: under the anchor with room, above it near the bottom, 120-320 px tall', () => {
  assert.deepEqual(menuRoom({ top: 100, bottom: 130 }, 900), { up: false, max: 320 });
  assert.deepEqual(menuRoom({ top: 600, bottom: 630 }, 900), { up: false, max: 256 });
  assert.deepEqual(menuRoom({ top: 800, bottom: 830 }, 900), { up: true, max: 320 });
  assert.deepEqual(menuRoom({ top: 40, bottom: 70 }, 150), { up: false, max: 120 });
});

test('filteredCount: how many sections narrow the list, a stale value counted', () => {
  assert.equal(filteredCount([kind, price, stock], {}), 0);
  assert.equal(filteredCount([kind, price, stock], { kind: ['Cactus'], stock: false, price: { from: '' } }), 2);
});

test('columnsSummary: "N of M · K columns filtered", "All M results", and server mode', () => {
  assert.equal(columnsSummary(5, 12, 1, w), '5 of 12 · 1 column filtered');
  assert.equal(columnsSummary(3, 12, 2, w), '3 of 12 · 2 columns filtered');
  assert.equal(columnsSummary(12, 12, 0, w), 'All 12 results');
  // A search narrows the list with no column filtered: just how many there are.
  assert.equal(columnsSummary(4, 12, 0, w), '4 results');
  // Server mode: no total before filters.
  assert.equal(columnsSummary(7, null, 1, w), '7 results · 1 column filtered');
  assert.equal(columnsSummary(1, null, 0, w), '1 result');
  // Not known yet.
  assert.equal(columnsSummary(null, null, 1, w), '');
});

test('columnRows: a choice lists its options, any stale pick, and the value a tick leaves', () => {
  const rows = columnRows(kind, { kind: ['Cactus'] }, w, '');
  assert.deepEqual(rows.map((r) => [r.value, r.label, r.count, r.on, r.round]),
    [['Herb', 'Herb', 5, false, false], ['fern', 'Fern', 0, false, false], ['Cactus', 'Cactus', 0, true, false]]);
  assert.deepEqual(rows[2]!.next, {});
});

test('columnRows: a long choice follows the typed search', () => {
  assert.deepEqual(columnRows(many, {}, w, 'chloe').map((r) => r.value), ['Chloé']);
  // A short list has no search, so text never hides its rows.
  assert.equal(columnRows(kind, {}, w, 'zzz').length, 2);
});

test('columnRows: a range lists its named ranges as single-choice rows; none without', () => {
  const rows = columnRows(price, { price: { to: '5' } }, w, '');
  assert.deepEqual(rows.map((r) => [r.label, r.count, r.on, r.round]), [['Under €5', 6, true, true], ['€5–€10', 4, false, true]]);
  assert.deepEqual(rows[0]!.next, {});
  assert.deepEqual(rows[1]!.next, { price: { from: '5', to: '10' } });
  assert.deepEqual(columnRows(plain, {}, w, ''), []);
});

test('columnRows: a yes/no column lists Yes and No, one at a time, a tick again unpicks', () => {
  const off = columnRows(stock, {}, w, '');
  assert.deepEqual(off.map((r) => [r.value, r.label, r.on, r.round]), [['yes', 'Yes', false, true], ['no', 'No', false, true]]);
  assert.deepEqual(off[0]!.next, { stock: true });
  assert.deepEqual(off[1]!.next, { stock: false });
  const no = columnRows({ ...stock, yes: 'Only in stock', no: 'Sold out' } as FilterSection, { stock: false }, w, '');
  assert.deepEqual(no.map((r) => [r.label, r.on]), [['Only in stock', false], ['Sold out', true]]);
  assert.deepEqual(no[1]!.next, {});
  assert.deepEqual(no[0]!.next, { stock: true });
});
