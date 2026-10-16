import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultSearchFilterWords, removeToken, tokensOf } from '../src/core/index.ts';
import { search, sections, words } from './fixture.ts';

test('the text token comes first, keyed by "Search in", the one column, or Any column', () => {
  const picked = tokensOf(sections, { kind: ['Herb'] }, search({ text: 'mint', in: 'name', fields: [{ key: 'name', label: 'Name' }] }), words);
  assert.deepEqual(picked[0], { kind: 'text', key: 'Name', op: 'has', value: 'mint' });
  assert.equal(picked[1]?.kind, 'filter');
  assert.equal(tokensOf(sections, {}, search({ text: 'mint', only: 'Name' }), words)[0]?.key, 'Name');
  assert.equal(tokensOf(sections, {}, search({ text: 'mint' }), words)[0]?.key, 'Any column');
  assert.deepEqual(tokensOf(sections, {}, search(), words), []);
});

test('one token per picked value, range and bool, in section order', () => {
  const out = tokensOf(sections, { stock: true, price: { to: '5' }, kind: ['Herb', 'Fern'] }, search(), words);
  assert.deepEqual(out.map((t) => [t.key, t.op, t.value]), [
    ['Kind', 'is', 'Herb'],
    ['Kind', 'is', 'Fern'],
    ['Price', '', 'Under €5'],
    ['In stock', '', 'Yes'],
  ]);
  assert.deepEqual(out[0], { kind: 'filter', section: 'kind', option: 'Herb', key: 'Kind', op: 'is', value: 'Herb' });
  assert.deepEqual(out[2], { kind: 'filter', section: 'price', key: 'Price', op: '', value: 'Under €5' });
});

test('a value no longer offered is still a token', () => {
  const [t] = tokensOf(sections, { kind: ['Cactus'] }, search(), words);
  assert.deepEqual([t?.key, t?.op, t?.value], ['Kind', 'is', 'Cactus']);
});

test('removeToken drops one picked value, or a whole range', () => {
  const value = { kind: ['Herb', 'Fern'], price: { to: '5' } };
  const tokens = tokensOf(sections, value, search(), words);
  const herb = tokens.find((t) => t.value === 'Herb');
  const priceToken = tokens.find((t) => t.key === 'Price');
  assert.ok(herb && priceToken);
  assert.deepEqual(removeToken(value, herb), { kind: ['Fern'], price: { to: '5' } });
  assert.deepEqual(removeToken(value, priceToken), { kind: ['Herb', 'Fern'] });
  assert.deepEqual(value, { kind: ['Herb', 'Fern'], price: { to: '5' } }); // left alone
});

test('removeToken leaves the value alone for the text token', () => {
  const value = { kind: ['Herb'] };
  const [text] = tokensOf(sections, value, search({ text: 'mint' }), words);
  assert.ok(text);
  assert.deepEqual(removeToken(value, text), value);
});

test('words', () => {
  assert.equal(defaultSearchFilterWords.searchFor('q'), 'Search for “q”');
  assert.equal(defaultSearchFilterWords.atMost('5'), '≤ 5');
  assert.equal(defaultSearchFilterWords.atLeast('5'), '≥ 5');
  assert.equal(defaultSearchFilterWords.searchOrFilter, 'Search or filter');
  assert.equal(defaultSearchFilterWords.noSuggestions, 'No filters match. Press Enter to search the text.');
});
