import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FilterSection } from '@lesfleursdelanuitdev/filter/parts';
import { suggest, type Suggestion } from '../src/core/index.ts';
import { activeRow } from '../src/core/suggest.ts';
import { search, sections, words } from './fixture.ts';

type FilterSuggestion = Extract<Suggestion, { kind: 'filter' }>;
const group = (out: ReturnType<typeof suggest>, label: string) =>
  out.groups.find((g) => g.label === label)?.items as FilterSuggestion[] | undefined;

test('"her" suggests Herb under Kind, not already-picked values', () => {
  const out = suggest(sections, { kind: [] }, search(), 'her', words);
  assert.equal(out.groups.length, 1);
  assert.equal(out.groups[0]?.label, 'Kind');
  const items = group(out, 'Kind') ?? [];
  assert.deepEqual(items.map(({ op, label, count }) => ({ op, label, count })), [{ op: 'Kind is', label: 'Herb', count: 5 }]);
  assert.deepEqual(items[0]?.next, { kind: ['Herb'] });
  assert.equal(items[0]?.section, 'kind');
  assert.equal(group(suggest(sections, { kind: ['Herb'] }, search(), 'her', words), 'Kind'), undefined);
});

test("accents and case don't matter", () => {
  const cafe: FilterSection = { key: 'shop', label: 'Shop', kind: 'choice', options: [{ value: 'Café' }, { value: 'Bar' }] };
  const out = suggest([cafe], {}, search(), 'CAFE', words);
  assert.deepEqual(group(out, 'Shop')?.map((s) => s.label), ['Café']);
});

test('named ranges are suggested like choices', () => {
  const items = group(suggest(sections, {}, search(), 'under', words), 'Price') ?? [];
  assert.equal(items.length, 1);
  assert.deepEqual([items[0]?.op, items[0]?.label, items[0]?.count], ['Price', 'Under €5', 6]);
  assert.deepEqual(items[0]?.next.price, { to: '5' });
});

test('a number offers ≤ and ≥ for number and money ranges, not dates', () => {
  const items = group(suggest(sections, {}, search(), '7', words), 'Price') ?? [];
  assert.deepEqual(items.map((s) => [s.op, s.label]), [['Price', '≤ 7'], ['Price', '≥ 7']]);
  assert.deepEqual(items[0]?.next.price, { to: '7' });
  assert.deepEqual(items[1]?.next.price, { from: '7' });
  const date: FilterSection = { key: 'sown', label: 'Sown', kind: 'range', type: 'date' };
  assert.equal(group(suggest([date], {}, search(), '7', words), 'Sown'), undefined);
  const comma = group(suggest(sections, {}, search(), '7,5', words), 'Price') ?? [];
  assert.deepEqual(comma.map((s) => s.next.price), [{ to: '7.5' }, { from: '7.5' }]);
  assert.deepEqual(comma.map((s) => s.label), ['≤ 7.5', '≥ 7.5']);
});

test('bool offers Yes and No when its label matches', () => {
  const items = group(suggest(sections, {}, search(), 'stock', words), 'In stock') ?? [];
  assert.deepEqual(items.map((s) => [s.op, s.label]), [['In stock', 'Yes'], ['In stock', 'No']]);
  assert.equal(items[0]?.next.stock, true);
  assert.equal(items[1]?.next.stock, false);
  assert.equal(group(suggest(sections, {}, search(), 'herb', words), 'In stock'), undefined);
});

test('the text rows', () => {
  const fields = [{ key: 'name', label: 'Name' }, { key: 'owner', label: 'Owner' }];
  const out = suggest(sections, {}, search({ fields, typedCount: 3 }), 'mi', words);
  assert.deepEqual(out.text.map((s) => s.kind === 'text' && { label: s.label, searchIn: s.searchIn }), [
    { label: 'Search for “mi”', searchIn: '' },
    { label: 'Name has “mi”', searchIn: 'name' },
    { label: 'Owner has “mi”', searchIn: 'owner' },
  ]);
  assert.equal(out.text[0]?.kind === 'text' && out.text[0].count, 3);
  const none = suggest(sections, {}, search(), 'mi', words);
  assert.deepEqual(none.text, [{ kind: 'text', searchIn: '', label: 'Search for “mi”', count: null }]);
  assert.deepEqual(suggest(sections, {}, search({ fields }), '', words).text, []);
  assert.deepEqual(suggest(sections, {}, search({ fields }), '   ', words).text, []);
});

test('at most 8 per group', () => {
  const owner: FilterSection = {
    key: 'owner', label: 'Owner', kind: 'choice',
    options: Array.from({ length: 30 }, (_, i) => ({ value: `Owner ${i + 1}` })),
  };
  assert.equal(group(suggest([owner], {}, search(), 'o', words), 'Owner')?.length, 8);
});

test('empty typed lists every group', () => {
  const out = suggest(sections, {}, search(), '', words);
  assert.deepEqual(out.groups.map((g) => g.label), ['Kind', 'Light', 'Price', 'In stock']);
  assert.equal(group(out, 'Kind')?.length, 4);
  assert.deepEqual(group(out, 'Price')?.map((s) => s.label), ['Under €5', '€5–€10', 'Over €10']);
  assert.deepEqual(group(out, 'In stock')?.map((s) => s.label), ['Yes', 'No']);
});

test('the set range and the set yes / no are not suggested again', () => {
  const out = suggest(sections, { price: { to: '5' }, stock: true }, search(), '', words);
  assert.deepEqual(group(out, 'Price')?.map((s) => s.label), ['€5–€10', 'Over €10']);
  assert.deepEqual(group(out, 'In stock')?.map((s) => s.label), ['No']);
});

test('bool offers its row when the row’s own yes / no word matches', () => {
  assert.deepEqual(group(suggest(sections, {}, search(), 'yes', words), 'In stock')?.map((s) => s.label), ['Yes']);
  assert.deepEqual(group(suggest(sections, {}, search(), 'no', words), 'In stock')?.map((s) => s.label), ['No']);
  const organic: FilterSection = { key: 'organic', label: 'Organic', kind: 'bool', yes: 'Certified', no: 'Not certified' };
  assert.deepEqual(group(suggest([organic], {}, search(), 'certified', words), 'Organic')?.map((s) => s.label), ['Certified', 'Not certified']);
  assert.deepEqual(group(suggest([organic], {}, search(), 'not', words), 'Organic')?.map((s) => s.label), ['Not certified']);
});

test('only the row for the applied "Search in" carries typedCount', () => {
  const fields = [{ key: 'name', label: 'Name' }, { key: 'owner', label: 'Owner' }];
  const counts = (over: { in: string }) =>
    suggest(sections, {}, search({ fields, typedCount: 3, ...over }), 'mi', words).text.map((s) => s.kind === 'text' && s.count);
  assert.deepEqual(counts({ in: '' }), [3, null, null]);
  assert.deepEqual(counts({ in: 'name' }), [null, 3, null]);
});

test('typed numbers are plain decimals only', () => {
  for (const typed of ['0x10', '1e3', '7.', '.5', 'Infinity']) {
    assert.equal(group(suggest(sections, {}, search(), typed, words), 'Price'), undefined, typed);
  }
  const neg = group(suggest(sections, {}, search(), '-2', words), 'Price') ?? [];
  assert.deepEqual(neg.map((s) => s.label), ['≤ -2', '≥ -2']);
});

test('≤ n and ≥ n keep the other end, and are not offered for the end already set', () => {
  const items = group(suggest(sections, { price: { from: '2', to: '9' } }, search(), '7', words), 'Price') ?? [];
  assert.deepEqual(items.map((s) => s.next.price), [{ from: '2', to: '7' }, { from: '7', to: '9' }]);
  const set = group(suggest(sections, { price: { to: '7' } }, search(), '7', words), 'Price') ?? [];
  assert.deepEqual(set.map((s) => s.label), ['≥ 7']);
  assert.deepEqual(set[0]?.next.price, { from: '7', to: '7' });
});

test('the active row by default: the first filter with a count above 0 or unknown, else the first row', () => {
  const text: Suggestion = { kind: 'text', searchIn: '', label: 'Search for “s”', count: 3 };
  const f = (label: string, count?: number): Suggestion => ({ kind: 'filter', section: 'light', group: 'Light', op: 'Light is', label, count, next: {} });
  assert.equal(activeRow([text], [{ items: [f('Shade', 0), f('Part shade', 2)] }]), 2);
  assert.equal(activeRow([text], [{ items: [f('Shade', 0), f('Sun')] }]), 2); // an unknown count is fine
  assert.equal(activeRow([text], [{ items: [f('Sun', 4)] }]), 1);
  assert.equal(activeRow([text], [{ items: [f('Shade', 0), f('Part shade', 0)] }]), 0); // all zero: "Search for"
  assert.equal(activeRow([], [{ items: [f('Shade', 0), f('Part shade', 0)] }]), 0); // no text rows: the first row
  assert.equal(activeRow([text], []), 0);
  assert.equal(activeRow([], []), 0);
});
