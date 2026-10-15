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

test('search-in and filters round-trip; commas, "&" and non-Latin text survive (Review Focus 2)', () => {
  const q: Query = {
    ...base, searchIn: 'name',
    filters: { owner: ['Smith, Jane', 'Café', 'A & B', 'x..y'], price: { from: '10' }, planted: { to: '1999-06' }, organic: false },
  };
  const p = writeQuery(new URLSearchParams('other=1'), 'orders', q);
  assert.equal(p.get('orders.in'), 'name');
  assert.equal(p.get('orders.f.owner'), 'Smith%2C%20Jane,Caf%C3%A9,A%20%26%20B,x..y');
  assert.equal(p.get('orders.f.price'), '10..');
  assert.equal(p.get('orders.f.planted'), '..1999-06');
  assert.equal(p.get('orders.f.organic'), 'no');
  // Through the address bar and back.
  const again = new URLSearchParams(p.toString());
  const kinds = { owner: 'choice', price: 'range', planted: 'range', organic: 'bool' } as const;
  assert.deepEqual(readQuery(again, 'orders', kinds), q);
  // Without kinds the shape decides: "a..b" a range, yes / no a bool, else a choice.
  const guessed = readQuery(again, 'orders');
  assert.deepEqual(guessed.filters!.price, { from: '10' });
  assert.equal(guessed.filters!.organic, false);
  assert.deepEqual(guessed.filters!.owner, ['Smith, Jane', 'Café', 'A & B', 'x..y']);
});

test('filters back to none leave the address clean; prefixes keep to their own f.*', () => {
  const p = writeQuery(new URLSearchParams(), 'orders', { ...base, searchIn: 'name', filters: { status: ['paid'] } });
  writeQuery(p, 'plants', { ...base, filters: { status: ['sown'] } });
  assert.deepEqual(readQuery(p, 'orders').filters, { status: ['paid'] });
  assert.deepEqual(readQuery(p, 'plants').filters, { status: ['sown'] });
  assert.equal(readQuery(p, 'plants').searchIn, undefined);
  writeQuery(p, 'orders', base);
  assert.equal(p.toString(), 'plants.f.status=sown');
  assert.deepEqual(readQuery(new URLSearchParams('orders.f.price=..&orders.f.status=&orders.in='), 'orders'), base);
});
