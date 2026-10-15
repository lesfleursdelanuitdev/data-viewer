import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitRow } from '../src/fit.ts';

const w = (...widths: number[]) => widths.map((width) => ({ width }));

test('everything fits: no More', () => {
  assert.deepEqual(fitRow(w(50, 50, 50), { available: 170, more: 60, gap: 10 }), { shown: [0, 1, 2], overflow: [] });
});

test('what doesn\'t fit goes into More, and More always has room', () => {
  const o = (available: number) => fitRow(w(50, 50, 50), { available, more: 30, gap: 10 });
  // The three need 50+10+50+10+50 = 170; two and More need 50+10+50+10+30 = 150.
  assert.deepEqual(o(170), { shown: [0, 1, 2], overflow: [] });
  assert.deepEqual(o(169), { shown: [0, 1], overflow: [2] });
  assert.deepEqual(o(150), { shown: [0, 1], overflow: [2] });
  // One and More: 50+10+30 = 90.
  assert.deepEqual(o(149), { shown: [0], overflow: [1, 2] });
  assert.deepEqual(o(90), { shown: [0], overflow: [1, 2] });
  assert.deepEqual(o(89), { shown: [], overflow: [0, 1, 2] });
});

test('too narrow for any button: all in More', () => {
  assert.deepEqual(fitRow(w(50, 50), { available: 40, more: 60, gap: 10 }), { shown: [], overflow: [0, 1] });
  assert.deepEqual(fitRow(w(50, 50), { available: 0, more: 60, gap: 10 }), { shown: [], overflow: [0, 1] });
});

test('max caps the buttons even when there is room', () => {
  assert.deepEqual(fitRow(w(10, 10, 10, 10), { available: 1000, more: 10, gap: 0, max: 2 }), { shown: [0, 1], overflow: [2, 3] });
  assert.deepEqual(fitRow(w(10, 10), { available: 1000, more: 10, gap: 0, max: 0 }), { shown: [], overflow: [0, 1] });
  assert.deepEqual(fitRow(w(10, 10), { available: 1000, more: 10, gap: 0, max: 5 }).overflow, []);
});

test('danger items go into More first when space is short', () => {
  const items = [{ width: 40, danger: true }, { width: 40 }, { width: 40 }];
  // The three need 140; two and More need 40+10+40+10+20 = 120. The two plain ones stay,
  // wherever the danger item was.
  assert.deepEqual(fitRow(items, { available: 130, more: 20, gap: 10 }), { shown: [1, 2], overflow: [0] });
  // Room for everything: the danger item shows too.
  assert.deepEqual(fitRow(items, { available: 140, more: 20, gap: 10 }), { shown: [0, 1, 2], overflow: [] });
  // max: the plain ones win the places.
  assert.deepEqual(fitRow(items, { available: 1000, more: 50, gap: 10, max: 2 }), { shown: [1, 2], overflow: [0] });
});

test('no items, nothing to show; bad numbers count as nothing', () => {
  assert.deepEqual(fitRow([], { available: 100, more: 50, gap: 10 }), { shown: [], overflow: [] });
  assert.deepEqual(fitRow(w(NaN, 20), { available: 100, more: 50, gap: Number.NaN }), { shown: [0, 1], overflow: [] });
});
