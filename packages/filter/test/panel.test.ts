import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appliedCount, choiceOptions, histogramBars, panelLeft, showLabel, useSeg } from '../src/styles/panel-logic.ts';
import { defaultFilterWords as w } from '../src/core/summary.ts';
import type { FilterSection } from '../src/core/types.ts';

const opts = (n: number) => Array.from({ length: n }, (_, i) => ({ value: `v${i}` }));
const kind: FilterSection = {
  key: 'kind', label: 'Kind', kind: 'choice',
  options: [{ value: 'Herb', count: 5 }, { value: 'Fern', label: 'Ferns', count: 0 }],
};
const price: FilterSection = {
  key: 'price', label: 'Price', kind: 'range', type: 'money',
  ranges: [{ label: 'Under €5', to: '5' }, { label: '€5–€10', from: '5', to: '10' }],
  histogram: { from: 0, to: 12, buckets: [4, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 8] },
};
const stock: FilterSection = { key: 'stock', label: 'In stock', kind: 'bool' };

test('useSeg: single choice with 5 options or fewer', () => {
  assert.equal(useSeg({ key: 'a', label: 'A', kind: 'choice', single: true, options: opts(5) }), true);
  assert.equal(useSeg({ key: 'a', label: 'A', kind: 'choice', single: true, options: opts(1) }), true);
  assert.equal(useSeg({ key: 'a', label: 'A', kind: 'choice', single: true, options: opts(6) }), false);
  assert.equal(useSeg({ key: 'a', label: 'A', kind: 'choice', options: opts(3) }), false);
  assert.equal(useSeg(price), false);
  assert.equal(useSeg(stock), false);
});

test('showLabel: the primary button says what Apply would leave', () => {
  assert.equal(showLabel(null, w), 'Show results');
  assert.equal(showLabel(0, w), 'Nothing matches');
  assert.equal(showLabel(1, w), 'Show 1 result');
  assert.equal(showLabel(12, w), 'Show 12 results');
});

test('appliedCount: one per chip, a value that no longer exists included', () => {
  const sections = [kind, price, stock];
  assert.equal(appliedCount(sections, {}), 0);
  assert.equal(appliedCount(sections, { kind: ['Herb', 'Fern'] }), 2);
  assert.equal(appliedCount(sections, { kind: ['Cactus'], price: { to: '5' }, stock: true }), 3);
  // A key with no section is no chip.
  assert.equal(appliedCount(sections, { gone: ['x'] }), 0);
});

test('choiceOptions: picked values the section no longer offers come last, with count 0', () => {
  assert.deepEqual(choiceOptions(kind, { kind: ['Herb'] }).map((o) => o.value), ['Herb', 'Fern']);
  const out = choiceOptions(kind, { kind: ['Cactus', 'Herb'] });
  assert.deepEqual(out.map((o) => o.value), ['Herb', 'Fern', 'Cactus']);
  assert.equal(out[2]!.count, 0);
});

test('histogramBars: 40 px at the tallest, at least 3 px, accent inside the drafted range', () => {
  const bars = histogramBars(price, undefined);
  assert.equal(bars.length, 12);
  assert.equal(bars[11]!.height, 40);
  assert.equal(bars[0]!.height, 20);
  assert.equal(bars[2]!.height, 3);
  // No range drafted: every bar with rows is on.
  assert.deepEqual(bars.map((b) => b.on), [true, true, false, true, false, false, false, false, false, false, false, true]);
  // 5 to 10 overlaps buckets 5 to 10 (each 1 wide); of those only ones with rows are on, so none.
  const mid = histogramBars(price, { from: '5', to: '10' });
  assert.deepEqual(mid.map((b) => b.on), new Array(12).fill(false));
  // Up to 5: buckets 0 to 5 (the one starting at 5 included); 0, 1 and 3 have rows.
  const low = histogramBars(price, { to: '5' });
  assert.deepEqual(low.map((b, i) => (b.on ? i : -1)).filter((i) => i >= 0), [0, 1, 3]);
  // From 11: only the last.
  assert.deepEqual(histogramBars(price, { from: '11' }).map((b, i) => (b.on ? i : -1)).filter((i) => i >= 0), [11]);
  assert.deepEqual(histogramBars(stock, undefined), []);
});

test('panelLeft: under the trigger in the left half, right-aligned to it in the right half, 8 px inside the window', () => {
  const list = { left: 20, right: 1260 };
  assert.equal(panelLeft({ left: 40, right: 140 }, list, 400, 1280), 40);
  assert.equal(panelLeft({ left: 1100, right: 1200 }, list, 400, 1280), 800);
  // Right-aligned but the window is narrow: kept 8 px from its left edge.
  assert.equal(panelLeft({ left: 250, right: 350 }, { left: 0, right: 360 }, 400, 360), 8);
  // Left-aligned near the right edge: shifted back inside.
  assert.equal(panelLeft({ left: 900, right: 960 }, { left: 0, right: 2000 }, 400, 1280), 872);
});
