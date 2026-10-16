import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cellValues, countMatching, filterKind, filterSections, matchesFilters, parseOptions, parseRanges, searchColumns } from '../src/core/filters.ts';
import type { Column, Query } from '../src/core/types.ts';

type Row = Record<string, unknown>;
const q: Query = { page: 1, search: '', sort: '', dir: 'asc', view: '', size: 20 };

// Plants with messy values: numbers as strings, dates in three forms, tags as an array or a
// comma string, and empty or missing values (Review Focus 1).
const rows: Row[] = [
  { name: 'Basil', status: 'growing', price: 12.5, planted: new Date('1950-06-15T00:00:00Z'), tags: ['herb', 'shade'], organic: true },
  { name: 'Mint', status: 'growing', price: '12.50', planted: '1950-06-15', tags: 'herb, sun', organic: 'no' },
  { name: 'Rose', status: 'sold', price: null, planted: '1950', tags: [], organic: false },
  { name: 'Fern', status: '', price: '', planted: null, tags: null, organic: null },
  { name: 'Ivy', status: null, price: 40, planted: '2021-03-01', tags: 'shade' },
];
const cols: Column<Row>[] = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status', type: 'badge', filterable: true },
  { key: 'price', label: 'Price', type: 'money', filterable: true, format: { currency: 'EUR' } },
  { key: 'planted', label: 'Planted', type: 'date', filterable: true, ranges: [{ label: '1950s', from: '1950', to: '1959' }] },
  { key: 'tags', label: 'Tags', type: 'tags', filterable: true },
  { key: 'organic', label: 'Organic', type: 'bool', filterable: true },
  { key: 'picture', label: 'Picture', type: 'image', filterable: true },
];
const names = (rs: Row[]) => rs.map((r) => r.name);
const keep = (filters: Query['filters']) => names(rows.filter((r) => matchesFilters(r, cols, filters ?? {})));

test('filterKind follows the column type; an image is never filterable', () => {
  assert.equal(filterKind({ key: 'a', label: 'A' }), 'choice');
  for (const type of ['text', 'badge', 'link', 'tags'] as const) assert.equal(filterKind({ key: 'a', label: 'A', type }), 'choice');
  for (const type of ['number', 'money', 'date'] as const) assert.equal(filterKind({ key: 'a', label: 'A', type }), 'range');
  assert.equal(filterKind({ key: 'a', label: 'A', type: 'bool' }), 'bool');
  assert.equal(filterKind({ key: 'a', label: 'A', type: 'image' }), null);
});

test('cellValues: no empty or null values; tags split from an array or a comma string', () => {
  assert.deepEqual(cellValues(cols[4]!, rows[0]!), ['herb', 'shade']);
  assert.deepEqual(cellValues(cols[4]!, rows[1]!), ['herb', 'sun']);
  assert.deepEqual(cellValues(cols[4]!, rows[2]!), []);
  assert.deepEqual(cellValues(cols[1]!, rows[3]!), []);
  assert.deepEqual(cellValues(cols[1]!, rows[4]!), []);
  assert.deepEqual(cellValues(cols[1]!, rows[0]!), ['growing']);
});

test('browser mode: choice options are the distinct values with counts, sorted, no empty or null', () => {
  const sections = filterSections(cols, { rows, q, rangeCounts: true });
  assert.deepEqual(sections.map((s) => s.key), ['status', 'price', 'planted', 'tags', 'organic']);
  const status = sections.find((s) => s.key === 'status')!;
  assert.deepEqual(status, {
    key: 'status', label: 'Status', kind: 'choice',
    options: [{ value: 'growing', label: 'growing', count: 2 }, { value: 'sold', label: 'sold', count: 1 }],
  });
  const tags = sections.find((s) => s.key === 'tags')!;
  assert.deepEqual(tags.kind === 'choice' && tags.options.map((o) => [o.value, o.count]), [['herb', 2], ['shade', 2], ['sun', 1]]);
  const priceBuckets = new Array(12).fill(0);
  priceBuckets[0] = 2;
  priceBuckets[11] = 1;
  assert.deepEqual(sections.find((s) => s.key === 'price'), {
    key: 'price', label: 'Price', kind: 'range', type: 'money', format: { currency: 'EUR' },
    histogram: { from: 12.5, to: 40, buckets: priceBuckets },
  });
  assert.deepEqual(sections.find((s) => s.key === 'planted'), {
    key: 'planted', label: 'Planted', kind: 'range', type: 'date', ranges: [{ label: '1950s', from: '1950', to: '1959', count: 3 }],
  });
  assert.deepEqual(sections.find((s) => s.key === 'organic'), { key: 'organic', label: 'Organic', kind: 'bool' });
});

// The options are the values in the view's rows (so none vanish while filtering); the counts are
// what each would leave.
test('counts ignore their own filter but follow the others, the search and the view', () => {
  const both = filterSections(cols, { rows, q: { ...q, filters: { status: ['sold'], price: { from: '10', to: '13' } } } });
  const status = both.find((s) => s.key === 'status')!;
  // The price filter leaves Basil and Mint (both growing); the status filter itself is ignored.
  assert.deepEqual(status.kind === 'choice' && status.options.map((o) => [o.value, o.count]), [['growing', 2], ['sold', 0]]);
  const searched = filterSections(cols, { rows, q: { ...q, search: 'mint' } }).find((s) => s.key === 'tags')!;
  assert.deepEqual(searched.kind === 'choice' && searched.options.map((o) => [o.value, o.count]), [['herb', 1], ['shade', 0], ['sun', 1]]);
  const viewed = filterSections(cols, {
    rows, q: { ...q, view: 'sold' }, views: [{ key: 'sold', label: 'Sold', where: (r) => r.status === 'sold' }],
  }).find((s) => s.key === 'status')!;
  assert.deepEqual(viewed.kind === 'choice' && viewed.options.map((o) => [o.value, o.count]), [['sold', 1]]);
});

test('a column\'s own options give the order and labels; counts still come from the rows', () => {
  const own: Column<Row>[] = [{ key: 'status', label: 'Status', filterable: true, options: ['sold', { value: 'growing', label: 'Growing' }, 'lost'] }];
  const s = filterSections(own, { rows, q })[0]!;
  assert.deepEqual(s.kind === 'choice' && s.options, [
    { value: 'sold', label: 'sold', count: 1 }, { value: 'growing', label: 'Growing', count: 2 }, { value: 'lost', label: 'lost', count: 0 },
  ]);
});

test('server mode: facets, else the column\'s options without counts, else no choice', () => {
  const own: Column<Row>[] = [
    { key: 'status', label: 'Status', filterable: true },
    { key: 'owner', label: 'Owner', filterable: true, options: ['Ana', { value: 'jo', label: 'Jo' }] },
    { key: 'kind', label: 'Kind', filterable: true },
  ];
  const facets = { status: [{ value: 'paid', label: 'Paid', count: 4 }] };
  const sections = filterSections(own, { facets, q });
  assert.deepEqual(sections, [
    { key: 'status', label: 'Status', kind: 'choice', options: [{ value: 'paid', label: 'Paid', count: 4 }] },
    { key: 'owner', label: 'Owner', kind: 'choice', options: [{ value: 'Ana', label: 'Ana' }, { value: 'jo', label: 'Jo' }] },
  ]);
});

test('supports.filters "equals": only choices, each single', () => {
  const sections = filterSections(cols, { rows, q, supports: { filters: 'equals' } });
  assert.deepEqual(sections.map((s) => [s.key, s.kind, s.kind === 'choice' && s.single]), [['status', 'choice', true], ['tags', 'choice', true]]);
});

test('matchesFilters: numbers stored as strings compare as numbers; empty never matches', () => {
  assert.deepEqual(keep({ price: { from: '10', to: '13' } }), ['Basil', 'Mint']);
  assert.deepEqual(keep({ price: { from: '13' } }), ['Ivy']);
  assert.deepEqual(keep({ price: { to: '12.5' } }), ['Basil', 'Mint']);
});

test('matchesFilters: dates by period, so 1950 covers the whole year', () => {
  assert.deepEqual(keep({ planted: { from: '1950', to: '1950' } }), ['Basil', 'Mint', 'Rose']);
  assert.deepEqual(keep({ planted: { from: '1950-07' } }), ['Ivy']);
  assert.deepEqual(keep({ planted: { to: '1950-06' } }), ['Basil', 'Mint', 'Rose']);
  assert.deepEqual(keep({ planted: { from: '2021-03-01', to: '2021-03-01' } }), ['Ivy']);
});

test('matchesFilters: OR within a field, AND across fields, any tag matches', () => {
  assert.deepEqual(keep({ status: ['growing', 'sold'] }), ['Basil', 'Mint', 'Rose']);
  assert.deepEqual(keep({ status: ['growing'], tags: ['sun'] }), ['Mint']);
  assert.deepEqual(keep({ tags: ['shade'] }), ['Basil', 'Ivy']);
});

test('matchesFilters: an option that no longer exists matches nothing (Review Focus 3)', () => {
  assert.deepEqual(keep({ status: ['archived'] }), []);
});

test('matchesFilters: yes / no, with "no" strings read as no and missing never matching', () => {
  assert.deepEqual(keep({ organic: true }), ['Basil']);
  assert.deepEqual(keep({ organic: false }), ['Mint', 'Rose']);
});

test('matchesFilters: unset filters and keys with no column narrow nothing', () => {
  assert.deepEqual(keep({ status: [], price: {}, colour: ['red'] }), names(rows));
});

test('searchColumns: the marked ones, else searchKeys, else all', () => {
  assert.deepEqual(searchColumns(cols).map((c) => c.key), cols.map((c) => c.key));
  const marked = cols.map((c) => (c.key === 'name' || c.key === 'tags' ? { ...c, searchable: true } : c));
  assert.deepEqual(searchColumns(marked).map((c) => c.key), ['name', 'tags']);
  assert.deepEqual(searchColumns(cols, ['status', 'nope']).map((c) => c.key), ['status', 'nope']);
});

test('parseOptions and parseRanges read the column attributes', () => {
  assert.deepEqual(parseOptions(' A, B ,,C '), ['A', 'B', 'C']);
  assert.deepEqual(parseOptions(null), undefined);
  assert.deepEqual(parseRanges('1900s:1900..1999,Recent:2020..'), [
    { label: '1900s', from: '1900', to: '1999' }, { label: 'Recent', from: '2020' },
  ]);
  assert.deepEqual(parseRanges('Cheap:..10, junk, :1..2'), [{ label: 'Cheap', to: '10' }]);
  assert.deepEqual(parseRanges(''), undefined);
});

test('range sections count each range over the rows the other filters leave', () => {
  const planted = (qq: Query) => filterSections(cols, { rows, q: qq, rangeCounts: true }).find((s) => s.key === 'planted')!;
  const a = planted({ ...q, filters: { status: ['growing'] } });
  assert.equal(a.kind === 'range' && a.ranges?.[0]?.count, 2);
  const b = planted({ ...q, filters: { status: ['growing'], planted: { from: '1950', to: '1959' } } });
  assert.equal(b.kind === 'range' && b.ranges?.[0]?.count, 2);
});

const cheap: Row[] = Array.from({ length: 12 }, (_, i) => ({ name: `P${i + 1}`, price: i + 1 }));
const priceCols: Column<Row>[] = [{ key: 'price', label: 'Price', type: 'money', filterable: true }];
const histOf = (r: Row[], c: Column<Row>[], opts: object = {}) => {
  const s = filterSections(c, { rows: r, q, rangeCounts: true, ...opts })[0]!;
  return s.kind === 'range' ? s.histogram : undefined;
};

test('a money range gets a 12-bucket histogram in browser mode', () => {
  const h = histOf(cheap, priceCols)!;
  assert.equal(h.from, 1);
  assert.equal(h.to, 12);
  assert.equal(h.buckets.length, 12);
  assert.equal(h.buckets.reduce((a, b) => a + b, 0), 12);
  assert.equal(h.buckets[11], 1);
});

test('no histogram for dates, in server mode, or with fewer than 2 distinct values', () => {
  assert.equal(histOf(rows, cols.filter((c) => c.key === 'planted')), undefined);
  const s = filterSections(priceCols, { q })[0]!;
  assert.equal(s.kind === 'range' && s.histogram, undefined);
  assert.equal(histOf([{ price: 5 }, { price: 5 }], priceCols), undefined);
});

// Today's dialog shows neither, so without `rangeCounts` it makes no extra passes over the rows.
test('without rangeCounts no range counts or histogram are built', () => {
  const sections = filterSections(cols, { rows, q });
  assert.deepEqual(sections.find((s) => s.key === 'price'), {
    key: 'price', label: 'Price', kind: 'range', type: 'money', format: { currency: 'EUR' },
  });
  assert.deepEqual(sections.find((s) => s.key === 'planted'), {
    key: 'planted', label: 'Planted', kind: 'range', type: 'date', ranges: [{ label: '1950s', from: '1950', to: '1959' }],
  });
});

// Math.min(...nums) throws RangeError past ~125k arguments.
test('200 000 rows with a filterable number column do not throw', () => {
  const many: Row[] = Array.from({ length: 200_000 }, (_, i) => ({ price: i }));
  for (const rangeCounts of [false, true]) {
    const s = filterSections(priceCols, { rows: many, q, rangeCounts })[0]!;
    if (rangeCounts) assert.deepEqual(s.kind === 'range' && [s.histogram?.from, s.histogram?.to], [0, 199_999]);
  }
});

test('countMatching counts what the query leaves', () => {
  assert.equal(countMatching(rows, cols, { ...q, filters: { organic: true } }, {}), 1);
  assert.equal(countMatching(rows, cols, { ...q, search: 'zzz' }, {}), 0);
});

test('a bool section carries the column hint', () => {
  const s = filterSections([{ key: 'organic', label: 'Organic', type: 'bool', filterable: true, hint: 'Grown without sprays' }], { rows, q })[0]!;
  assert.equal(s.kind === 'bool' && s.hint, 'Grown without sprays');
});
