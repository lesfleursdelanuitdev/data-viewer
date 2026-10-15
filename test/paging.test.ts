import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageAfterResize, pageNumbers, pageSizeChoices, parsePageSizes } from '../src/core/paging.ts';

test('parsePageSizes reads a comma list: junk ignored, deduplicated, sorted, nothing ≤ 0', () => {
  assert.deepEqual(parsePageSizes('10,20,50'), [10, 20, 50]);
  assert.deepEqual(parsePageSizes(' 50, 10 ,abc,, 20,10,-5,0, 1e9x '), [10, 20, 50]);
  assert.deepEqual(parsePageSizes('25 100'), [25, 100]); // spaces separate too
  assert.deepEqual(parsePageSizes('12.7, 0.5'), [12]); // whole rows only
  assert.deepEqual(parsePageSizes('Infinity,NaN'), []);
  assert.deepEqual(parsePageSizes(''), []);
  assert.deepEqual(parsePageSizes(null), []);
  assert.deepEqual(parsePageSizes(undefined), []);
  assert.deepEqual(parsePageSizes(42), []);
});

test('parsePageSizes takes an array from script too', () => {
  assert.deepEqual(parsePageSizes([50, '10', 20, 20, null, 'x', -1]), [10, 20, 50]);
});

test('pageSizeChoices adds the starting size in order; none valid means no picker', () => {
  assert.deepEqual(pageSizeChoices([10, 20, 50], 20), [10, 20, 50]);
  assert.deepEqual(pageSizeChoices([10, 50], 25), [10, 25, 50]);
  assert.deepEqual(pageSizeChoices('10,50', 100), [10, 50, 100]);
  assert.deepEqual(pageSizeChoices('junk', 20), []);
  assert.deepEqual(pageSizeChoices(undefined, 20), []);
});

test('pageAfterResize keeps the first row on screen', () => {
  // Page 3 of 10 starts at row 21 (index 20).
  assert.equal(pageAfterResize(3, 10, 50), 1);
  assert.equal(pageAfterResize(3, 10, 20), 2);
  assert.equal(pageAfterResize(3, 10, 5), 5);
  assert.equal(pageAfterResize(1, 20, 10), 1);
  assert.equal(pageAfterResize(6, 50, 20), 13); // index 250 → page 13 (rows 241–260)
});

test('pageNumbers: first, last, current and neighbours, with gaps', () => {
  assert.deepEqual(pageNumbers(5, 12), [1, 'gap', 4, 5, 6, 'gap', 12]);
  assert.deepEqual(pageNumbers(1, 12), [1, 2, 'gap', 12]);
  assert.deepEqual(pageNumbers(12, 12), [1, 'gap', 11, 12]);
  assert.deepEqual(pageNumbers(2, 3), [1, 2, 3]);
  assert.deepEqual(pageNumbers(1, 2), [1, 2]);
});

test('pageNumbers shows a lone hidden page instead of a gap', () => {
  // 1 … 3 would hide only page 2, so 2 shows.
  assert.deepEqual(pageNumbers(4, 12), [1, 2, 3, 4, 5, 'gap', 12]);
  assert.deepEqual(pageNumbers(9, 12), [1, 'gap', 8, 9, 10, 11, 12]);
});

test('pageNumbers: one page or none means no numbers', () => {
  assert.deepEqual(pageNumbers(1, 1), []);
  assert.deepEqual(pageNumbers(1, 0), []);
});
