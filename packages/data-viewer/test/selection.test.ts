import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NONE, countOf, keep, keyOf, pageState, scopeOf, seen, tick, tickAll, tickPage, ticked } from '../src/core/selection.ts';

test('keyOf reads id by default, a named key, or a function; empty is no key', () => {
  assert.equal(keyOf({ id: 7 }, undefined), '7');
  assert.equal(keyOf({ sku: 'a' }, 'sku'), 'a');
  assert.equal(keyOf({ n: 3 }, (r) => `k${r.n}`), 'k3');
  assert.equal(keyOf({ id: '' }, undefined), undefined);
  assert.equal(keyOf({}, undefined), undefined);
  assert.equal(keyOf({ id: null }, undefined), undefined);
  assert.equal(keyOf({ id: 1 }, () => ''), undefined);
});

test('tick keeps the order ticks were made', () => {
  let s = tick(tick(tick(NONE, '3', true), '1', true), '2', true);
  assert.deepEqual(s.keys, ['3', '1', '2']);
  s = tick(s, '1', false);
  assert.deepEqual(s.keys, ['3', '2']);
  assert.ok(ticked(s, '3'));
  assert.ok(!ticked(s, '1'));
  // Ticking twice keeps one.
  assert.deepEqual(tick(s, '3', true).keys, ['3', '2']);
  assert.deepEqual(NONE, { keys: [], all: false, except: [] });
  assert.ok(Object.isFrozen(NONE));
});

test('pageState is none, some or all over the page\'s keys', () => {
  const s = tick(tick(NONE, '1', true), '2', true);
  assert.equal(pageState(s, []), 'none');
  assert.equal(pageState(s, ['3', '4']), 'none');
  assert.equal(pageState(s, ['1', '3']), 'some');
  assert.equal(pageState(s, ['1', '2']), 'all');
  const all = tick(tickAll(NONE, ['1', '2']), '2', false);
  assert.equal(pageState(all, ['5', '6']), 'all');
  assert.equal(pageState(all, ['1', '2']), 'some');
});

test('tickPage on adds the page\'s missing keys at the end; off removes only the page\'s', () => {
  const s = tick(tick(NONE, '9', true), '2', true);
  const on = tickPage(s, ['1', '2', '3'], true);
  assert.deepEqual(on.keys, ['9', '2', '1', '3']);
  const off = tickPage(on, ['1', '2', '3'], false);
  assert.deepEqual(off.keys, ['9']);
});

test('tickAll turns all on with no except', () => {
  const s = tickAll(tick(tick(NONE, '9', true), '1', false), ['1', '2']);
  assert.equal(s.all, true);
  assert.deepEqual(s.except, []);
  assert.deepEqual(s.keys, ['9', '1', '2']);
});

test('unticking under all goes into except, ticking takes it out', () => {
  let s = tickAll(NONE, ['1', '2']);
  s = tick(s, '2', false);
  assert.deepEqual(s.except, ['2']);
  assert.deepEqual(s.keys, ['1']);
  assert.equal(countOf(s, 54), 53);
  assert.ok(!ticked(s, '2'));
  assert.ok(ticked(s, '40')); // a row never seen is in "all matching"
  s = tick(s, '2', true);
  assert.deepEqual(s.except, []);
  assert.deepEqual(s.keys, ['1', '2']);
});

test('seen adds a new page\'s keys under all, but not the excepted ones', () => {
  const s = tick(tickAll(NONE, ['1', '2']), '3', false);
  assert.deepEqual(seen(s, ['3', '4', '1']).keys, ['1', '2', '4']);
  const plain = tick(NONE, '1', true);
  assert.equal(seen(plain, ['3', '4']), plain);
});

test('keep drops keys and except entries that are gone', () => {
  const s = { keys: ['1', '2', '3'], all: true, except: ['4', '5'] };
  assert.deepEqual(keep(s, new Set(['1', '3', '5'])), { keys: ['1', '3'], all: true, except: ['5'] });
});

test('countOf without a known total counts the keys', () => {
  const s = tick(tickAll(NONE, ['1', '2', '3']), '2', false);
  assert.equal(countOf(s, null), 2);
  assert.equal(countOf(tick(NONE, '1', true), 54), 1);
  assert.equal(countOf({ keys: [], all: true, except: ['1', '2'] }, 1), 0);
});

test('scopeOf ignores sort, dir, page and size', () => {
  const a = { search: 'a', sort: 'name', dir: 'desc', page: 2, size: 50 };
  const b = { search: 'a', page: 1 };
  assert.equal(scopeOf(a), scopeOf(b));
  assert.notEqual(scopeOf({ search: 'a' }), scopeOf({ search: 'a', view: 'cheap' }));
  assert.notEqual(scopeOf({ search: 'a' }), scopeOf({ search: 'a', searchIn: 'name' }));
  assert.notEqual(scopeOf({ search: 'a' }), scopeOf({ search: 'a', filters: { kind: ['Herb'] } }));
});
