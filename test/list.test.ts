import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyQuery, pageRange, sortValue } from '../src/core/list.ts';
import type { Column, Query, View } from '../src/core/types.ts';

type Row = Record<string, unknown>;

const base: Query = { page: 1, search: '', sort: '', dir: 'asc', view: '' };
const q = (over: Partial<Query>): Query => ({ ...base, ...over });
const names = (rows: Row[]) => rows.map((r) => r.name);

const nameCol: Column<Row> = { key: 'name', label: 'Name', sortable: true };

test('search matches any column\'s text, case-insensitive', () => {
  const rows = [{ name: 'Rose tea' }, { name: 'Mint' }];
  const out = applyQuery(rows, [nameCol], q({ search: 'rose' }), { pageSize: 20 });
  assert.deepEqual(names(out.rows), ['Rose tea']);
  assert.equal(out.total, 1);
});

test('searchKeys limits the search', () => {
  const rows = [{ name: 'Mint', note: 'rose' }, { name: 'Rose', note: 'x' }];
  const cols: Column<Row>[] = [nameCol, { key: 'note', label: 'Note' }];
  const all = applyQuery(rows, cols, q({ search: 'rose' }), { pageSize: 20 });
  assert.equal(all.total, 2);
  const limited = applyQuery(rows, cols, q({ search: 'rose' }), { pageSize: 20, searchKeys: ['name'] });
  assert.deepEqual(names(limited.rows), ['Rose']);
});

test('sort by number, money, date and text', () => {
  const rows: Row[] = [
    { name: 'item 10', n: 10, m: 5.5, d: '2026-03-01' },
    { name: 'item 2', n: 2, m: 120, d: '2025-12-31' },
    { name: 'Item 1', n: 33, m: 0.5, d: '2026-01-15' },
  ];
  const cols: Column<Row>[] = [
    nameCol,
    { key: 'n', label: 'N', type: 'number' },
    { key: 'm', label: 'M', type: 'money' },
    { key: 'd', label: 'D', type: 'date' },
  ];
  const by = (sort: string, dir: 'asc' | 'desc' = 'asc') =>
    names(applyQuery(rows, cols, q({ sort, dir }), { pageSize: 20 }).rows);
  assert.deepEqual(by('n'), ['item 2', 'item 10', 'Item 1']);
  assert.deepEqual(by('m'), ['Item 1', 'item 10', 'item 2']);
  assert.deepEqual(by('d'), ['item 2', 'Item 1', 'item 10']);
  assert.deepEqual(by('name'), ['Item 1', 'item 2', 'item 10']);
  assert.deepEqual(by('name', 'desc'), ['item 10', 'item 2', 'Item 1']);
});

test('missing values sort last in both directions', () => {
  const rows: Row[] = [
    { name: 'a', d: null },
    { name: 'b', d: '2026-02-01' },
    { name: 'c' },
    { name: 'd', d: 'not a date' },
    { name: 'e', d: '2025-02-01' },
  ];
  const cols: Column<Row>[] = [nameCol, { key: 'd', label: 'D', type: 'date' }];
  const asc = applyQuery(rows, cols, q({ sort: 'd', dir: 'asc' }), { pageSize: 20 });
  assert.deepEqual(names(asc.rows), ['e', 'b', 'a', 'c', 'd']);
  const desc = applyQuery(rows, cols, q({ sort: 'd', dir: 'desc' }), { pageSize: 20 });
  assert.deepEqual(names(desc.rows), ['b', 'e', 'a', 'c', 'd']);
});

test('equal keys keep their input order', () => {
  const rows: Row[] = [{ name: 'x', n: 1 }, { name: 'y', n: 1 }, { name: 'z', n: 1 }];
  const cols: Column<Row>[] = [nameCol, { key: 'n', label: 'N', type: 'number' }];
  for (const dir of ['asc', 'desc'] as const) {
    const out = applyQuery(rows, cols, q({ sort: 'n', dir }), { pageSize: 20 });
    assert.deepEqual(names(out.rows), ['x', 'y', 'z']);
  }
});

test('sortValue uses the column\'s value() and the type', () => {
  const col: Column<Row> = { key: 'k', label: 'K', type: 'number', value: (r) => (r.a as number) * 2 };
  assert.equal(sortValue(col, { a: 4 }), 8);
  assert.equal(sortValue({ key: 'k', label: 'K', type: 'number' }, { k: 'abc' }), null);
  assert.equal(sortValue({ key: 'k', label: 'K', type: 'date' }, { k: '2026-01-01' }), Date.parse('2026-01-01'));
  assert.equal(sortValue({ key: 'k', label: 'K' }, { k: undefined }), null);
  assert.equal(sortValue({ key: 'k', label: 'K' }, { k: 'Hi' }), 'Hi');
});

test('view where() filters before search and paging', () => {
  const rows: Row[] = [
    { name: 'Rose tea', live: true },
    { name: 'Rose jam', live: false },
    { name: 'Mint', live: true },
  ];
  const views: View<Row>[] = [
    { key: '', label: 'All' },
    { key: 'live', label: 'Live', where: (r) => r.live === true },
  ];
  const out = applyQuery(rows, [nameCol], q({ view: 'live', search: 'rose' }), { pageSize: 20, views });
  assert.deepEqual(names(out.rows), ['Rose tea']);
  assert.equal(out.total, 1);
  const unknown = applyQuery(rows, [nameCol], q({ view: 'nope' }), { pageSize: 20, views });
  assert.equal(unknown.total, 3);
});

test('paging slices the page', () => {
  const rows = Array.from({ length: 25 }, (_, i) => ({ name: `r${i}` }));
  const out = applyQuery(rows, [nameCol], q({ page: 2 }), { pageSize: 20 });
  assert.equal(out.rows.length, 5);
  assert.equal(out.total, 25);
  assert.equal(out.page, 2);
});

test('page past the end clamps to the last page', () => {
  const rows = Array.from({ length: 25 }, (_, i) => ({ name: `r${i}` }));
  const out = applyQuery(rows, [nameCol], q({ page: 5 }), { pageSize: 20 });
  assert.equal(out.page, 2);
  assert.equal(out.rows.length, 5);
  const low = applyQuery(rows, [nameCol], q({ page: 0 }), { pageSize: 20 });
  assert.equal(low.page, 1);
  const none = applyQuery([], [nameCol], q({ page: 3 }), { pageSize: 20 });
  assert.equal(none.page, 1);
});

test('pageRange', () => {
  assert.deepEqual(pageRange(2, 20, 25, 5), { from: 21, to: 25, pages: 2 });
  assert.deepEqual(pageRange(1, 20, 0, 0), { from: 0, to: 0, pages: 1 });
  assert.deepEqual(pageRange(1, 20, 25, 20), { from: 1, to: 20, pages: 2 });
});
