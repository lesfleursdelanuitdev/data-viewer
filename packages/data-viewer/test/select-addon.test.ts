import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGISTRY_KEY, onSelectAddon, registerSelect, selectAddon } from '../src/core/select-addon.ts';
import type { SelectAddon } from '../src/core/select-types.ts';

// An add-on that draws nothing; only its identity matters here.
const addon = (): SelectAddon => ({
  styles() {}, bar: () => ({}) as never, pageBox: () => ({}) as never, box: () => ({}) as never,
});

test('an add-on registered is found; a later one replaces it', () => {
  const a = addon();
  registerSelect(a);
  assert.equal(selectAddon(), a);
  const b = addon();
  registerSelect(b);
  assert.equal(selectAddon(), b);
});

test('listeners hear each registration and can unsubscribe', () => {
  let heard = 0;
  const stop = onSelectAddon(() => void heard++);
  registerSelect(addon());
  registerSelect(addon());
  stop();
  registerSelect(addon());
  assert.equal(heard, 2);
});

test('the registry lives on globalThis under __lfdlnDataViewerSelect', () => {
  assert.equal(REGISTRY_KEY, '__lfdlnDataViewerSelect');
  const r = (globalThis as unknown as Record<string, { addon: SelectAddon | undefined; listeners: Set<unknown> }>)[REGISTRY_KEY]!;
  assert.ok(r.listeners instanceof Set);
  // An add-on put there by another bundle is found too.
  const other = addon();
  r.addon = other;
  assert.equal(selectAddon(), other);
});
