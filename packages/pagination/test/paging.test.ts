import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampPage, pageAfterResize, pageNumbers, pageRange, pageSizeChoices, pageSizeOf, parsePageSizes } from '../src/paging.ts';

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

test('pageRange', () => {
  assert.deepEqual(pageRange(2, 20, 25, 5), { from: 21, to: 25, pages: 2 });
  assert.deepEqual(pageRange(1, 20, 0, 0), { from: 0, to: 0, pages: 1 });
  assert.deepEqual(pageRange(1, 20, 25, 20), { from: 1, to: 20, pages: 2 });
});

test('pageSizeOf: a bad page size becomes a usable one', () => {
  assert.equal(pageSizeOf(10), 10);
  assert.equal(pageSizeOf(12.7), 12);
  assert.equal(pageSizeOf(Number('abc')), 20);
  assert.equal(pageSizeOf(0), 20);
  assert.equal(pageSizeOf(-5), 1);
  assert.equal(pageSizeOf(Infinity), 20);
  assert.equal(pageSizeOf(undefined), 20);
});

test('pageRange works out the rows on the page when it isn\'t told', () => {
  assert.deepEqual(pageRange(5, 10, 120), { from: 41, to: 50, pages: 12 });
  assert.deepEqual(pageRange(3, 20, 45), { from: 41, to: 45, pages: 3 });
  assert.deepEqual(pageRange(1, 20, 0), { from: 0, to: 0, pages: 1 });
});

test('clampPage keeps a page between 1 and the last', () => {
  assert.equal(clampPage(5, 12), 5);
  assert.equal(clampPage(99, 12), 12);
  assert.equal(clampPage(0, 12), 1);
  assert.equal(clampPage('3', 12), 3);
  assert.equal(clampPage('abc', 12), 1);
  assert.equal(clampPage(2.7, 12), 2);
  assert.equal(clampPage(4, 0), 1);
});
