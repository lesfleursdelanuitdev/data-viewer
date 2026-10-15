import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextId } from '../src/element/ids.ts';

test('nextId counts up per page', () => {
  const a = nextId();
  const b = nextId();
  assert.match(a, /^lfdln-m\d+$/);
  assert.equal(Number(b.slice(7)), Number(a.slice(7)) + 1);
  assert.match(nextId('dv'), /^dv\d+$/);
});

test('two copies of the code (two standalone scripts) never hand out the same id', async () => {
  // A second evaluation of the module stands in for a second bundle on the same page.
  const other = (await import(`../src/element/ids.ts?copy=${Date.now()}`)) as typeof import('../src/element/ids.ts');
  const seen = new Set([nextId(), other.nextId(), nextId(), other.nextId()]);
  assert.equal(seen.size, 4);
});
