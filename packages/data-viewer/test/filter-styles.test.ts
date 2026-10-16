import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FilterStyle } from '@lesfleursdelanuitdev/filter';
import { REGISTRY_KEY, filterStyle, onFilterStyle, pickFilterStyle, registerFilterStyle } from '../src/core/filter-styles.ts';

// A style that draws nothing; only its name and flags matter here.
const style = (name: string, over: Partial<FilterStyle> = {}): FilterStyle => ({
  name, instant: false, showsApplied: false, styles() {}, render: () => ({}) as never, ...over,
});

test('a style registered before is found', () => {
  const s = style('t-found');
  registerFilterStyle('t-found', s);
  assert.equal(filterStyle('t-found'), s);
  assert.equal(filterStyle('t-never'), undefined);
});

test('a later style under the same name replaces it', () => {
  registerFilterStyle('t-twice', style('t-twice'));
  const later = style('t-twice', { instant: true });
  registerFilterStyle('t-twice', later);
  assert.equal(filterStyle('t-twice'), later);
});

test('listeners hear each registration and can unsubscribe', () => {
  const heard: string[] = [];
  const stop = onFilterStyle((n) => heard.push(n));
  registerFilterStyle('t-a', style('t-a'));
  registerFilterStyle('t-b', style('t-b'));
  stop();
  registerFilterStyle('t-c', style('t-c'));
  assert.deepEqual(heard, ['t-a', 't-b']);
});

test('the registry lives on globalThis under __lfdlnDataViewerFilterStyles', () => {
  assert.equal(REGISTRY_KEY, '__lfdlnDataViewerFilterStyles');
  const r = (globalThis as unknown as Record<string, { styles: Map<string, FilterStyle>; listeners: Set<unknown> }>)[REGISTRY_KEY]!;
  assert.ok(r.styles instanceof Map);
  assert.ok(r.listeners instanceof Set);
  // A style put there by another bundle is found too.
  const other = style('t-other');
  r.styles.set('t-other', other);
  assert.equal(filterStyle('t-other'), other);
});

test('pickFilterStyle: empty and "dialog" mean the dialog; names are read in lower case', () => {
  const ctx = { width: 900, layout: 'table' as const };
  assert.equal(pickFilterStyle(undefined, ctx), undefined);
  assert.equal(pickFilterStyle('  Dialog ', ctx), undefined);
  const s = style('t-pick');
  registerFilterStyle('t-pick', s);
  assert.equal(pickFilterStyle(' T-Pick ', ctx), s);
});

test('pickFilterStyle: a fallback is followed once, with the width and layout', () => {
  const narrow = style('t-narrow');
  registerFilterStyle('t-narrow', narrow);
  const seen: unknown[] = [];
  const wide = style('t-wide', { fallback: (c) => (seen.push(c), c.width < 720 ? 't-narrow' : null) });
  registerFilterStyle('t-wide', wide);
  assert.equal(pickFilterStyle('t-wide', { width: 900, layout: 'table' }), wide);
  assert.equal(pickFilterStyle('t-wide', { width: 700, layout: 'cards' }), narrow);
  assert.deepEqual(seen.at(-1), { width: 700, layout: 'cards' });
});

test('pickFilterStyle: an unknown style is the dialog and warns once, naming its file', async () => {
  const warn = console.warn;
  const said: string[] = [];
  console.warn = (m: string) => void said.push(m);
  try {
    const ctx = { width: 900, layout: 'table' as const };
    assert.equal(pickFilterStyle('t-nope', ctx), undefined);
    pickFilterStyle('t-nope', ctx);
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(said.length, 1);
    assert.match(said[0]!, /filter-style="t-nope"/);
    assert.match(said[0]!, /data-viewer-filter-t-nope\.js/);
  } finally {
    console.warn = warn;
  }
});
