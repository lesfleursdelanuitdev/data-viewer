import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currentUserView, readViews, sameState, viewKey } from '../src/core/saved-views.ts';
import type { SavedView } from '../src/core/types.ts';

test('readViews keeps good entries and drops the rest', () => {
  const out = readViews('[{"key":"u-1","label":"Shade","filter":{"light":["Shade"]}},{"label":"x"},3]');
  assert.deepEqual(out, { views: [{ key: 'u-1', label: 'Shade', filter: { light: ['Shade'] } }], bad: true });
  assert.deepEqual(readViews('{'), { views: [], bad: true });
  assert.deepEqual(readViews(null), { views: [], bad: false });
  // Not an array, a filter that is no object, a search that is no text.
  assert.deepEqual(readViews('{"key":"u-1"}'), { views: [], bad: true });
  assert.deepEqual(readViews('[{"key":"u-1","label":"A","filter":[]},{"key":"u-2","label":"B","filter":null}]'), { views: [], bad: true });
  assert.deepEqual(readViews('[{"key":"u-1","label":"A","filter":{},"search":3}]'), { views: [], bad: true });
  // A good list, with a search, is kept as it is; unknown fields go.
  assert.deepEqual(readViews('[{"key":"u-1","label":"A","filter":{},"search":"mint","sort":"name"}]'),
    { views: [{ key: 'u-1', label: 'A', filter: {}, search: 'mint' }], bad: false });
});

test('viewKey avoids a clash', () => {
  const base = `u-${(1000).toString(36)}`;
  assert.equal(viewKey(new Set(), 1000), base);
  assert.equal(viewKey(new Set([base]), 1000), `${base}-2`);
  assert.equal(viewKey(new Set([base, `${base}-2`]), 1000), `${base}-3`);
  assert.match(viewKey(new Set()), /^u-[0-9a-z]+$/);
});

test('sameState ignores key order and empty parts', () => {
  assert.ok(sameState({ filter: { a: ['x'], b: true } }, { filters: { b: true, a: ['x'] }, search: '' }));
  assert.ok(sameState({ filter: {}, search: 'mint ' }, { search: 'mint' }));
  assert.ok(sameState({ filter: { a: [], r: {} } }, { search: '' }));
  assert.ok(sameState({ filter: { a: ['y', 'x'] } }, { filters: { a: ['x', 'y'] }, search: '' }));
  assert.ok(!sameState({ filter: { a: ['x'] } }, { filters: { a: ['y'] }, search: '' }));
  assert.ok(!sameState({ filter: { b: true } }, { filters: { b: false }, search: '' }));
  assert.ok(!sameState({ filter: {} }, { search: 'mint' }));
  assert.ok(!sameState({ filter: { p: { from: '5' } } }, { filters: { p: { to: '5' } }, search: '' }));
});

test('currentUserView prefers the last picked on a tie, else the first; none with a page view set', () => {
  const herb = { kind: ['Herb'] };
  const views: SavedView[] = [
    { key: 'u-1', label: 'Herbs', filter: herb },
    { key: 'u-2', label: 'Herbs again', filter: { kind: ['Herb'] } },
    { key: 'u-3', label: 'Mint', filter: {}, search: 'mint' },
  ];
  const q = { view: '', filters: herb, search: '' };
  assert.equal(currentUserView(views, q, null), 'u-1');
  assert.equal(currentUserView(views, q, 'u-2'), 'u-2');
  assert.equal(currentUserView(views, q, 'u-3'), 'u-1'); // the last picked doesn't match: the first that does
  assert.equal(currentUserView(views, { view: '', search: ' mint' }, null), 'u-3');
  assert.equal(currentUserView(views, { view: 'sun', filters: herb, search: '' }, 'u-1'), null);
  assert.equal(currentUserView(views, { view: '', search: '' }, null), null);
});
