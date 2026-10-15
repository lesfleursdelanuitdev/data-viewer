import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readQuery, writeQuery } from '../src/core/address.ts';
import type { AddressQuery as Query } from '../src/core/address.ts';

const base: Query = { page: 1, search: '', sort: '', dir: 'asc', view: '' };

test('readQuery with nothing gives defaults', () => {
  assert.deepEqual(readQuery(new URLSearchParams(), 'dv'), base);
});

test('readQuery with junk falls back', () => {
  const p = new URLSearchParams('dv.page=abc&dv.dir=sideways');
  const q = readQuery(p, 'dv');
  assert.equal(q.page, 1);
  assert.equal(q.dir, 'asc');
  assert.equal(readQuery(new URLSearchParams('dv.page=-3'), 'dv').page, 1);
});

test('writeQuery drops defaults', () => {
  const p = writeQuery(new URLSearchParams(), 'dv', base);
  assert.equal(p.toString(), '');
});

test('writeQuery round-trips and removes keys that went back to default', () => {
  const q: Query = { page: 3, search: 'a b', sort: 'name', dir: 'desc', view: 'paid' };
  const p = writeQuery(new URLSearchParams('other=1'), 'dv', q);
  assert.equal(p.get('other'), '1');
  assert.deepEqual(readQuery(p, 'dv'), q);
  writeQuery(p, 'dv', base);
  assert.equal(p.toString(), 'other=1');
});

test("two prefixes don't touch each other", () => {
  const a: Query = { page: 2, search: 'x', sort: 'n', dir: 'desc', view: 'v1' };
  const b: Query = { page: 5, search: 'y', sort: 'm', dir: 'asc', view: 'v2' };
  const p = new URLSearchParams();
  writeQuery(p, 'a', a);
  writeQuery(p, 'b', b);
  assert.deepEqual(readQuery(p, 'a'), a);
  assert.deepEqual(readQuery(p, 'b'), b);
});

test('readQuery reads a size only when it is a whole number of at least 1', () => {
  assert.equal(readQuery(new URLSearchParams('dv.size=50'), 'dv').size, 50);
  assert.equal(readQuery(new URLSearchParams('dv.size=abc'), 'dv').size, undefined);
  assert.equal(readQuery(new URLSearchParams('dv.size=0'), 'dv').size, undefined);
  assert.equal(readQuery(new URLSearchParams('dv.size=2.5'), 'dv').size, undefined);
  assert.equal(readQuery(new URLSearchParams(), 'dv').size, undefined);
});

test('writeQuery keeps the size, and drops it when it is the starting size', () => {
  const p = writeQuery(new URLSearchParams(), 'dv', { ...base, size: 50 }, 20);
  assert.equal(p.toString(), 'dv.size=50');
  writeQuery(p, 'dv', { ...base, size: 20 }, 20);
  assert.equal(p.toString(), '');
  // Without a starting size (no picker) the size never goes in the address.
  assert.equal(writeQuery(new URLSearchParams(), 'dv', { ...base, size: 50 }).toString(), '');
});
