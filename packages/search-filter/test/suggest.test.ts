import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FilterSection } from '@lesfleursdelanuitdev/filter/parts';
import { suggest, type Suggestion } from '../src/core/index.ts';
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
