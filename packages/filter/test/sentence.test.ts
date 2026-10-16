import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultSentenceWords, joinValues, sentenceParts, sentenceText } from '../src/styles/sentence-logic.ts';
import { defaultFilterWords } from '../src/core/summary.ts';
import type { FilterSection, FilterValue } from '../src/core/types.ts';

const w = { ...defaultFilterWords, ...defaultSentenceWords };

const kind: FilterSection = {
  key: 'kind', label: 'Kind', kind: 'choice', phrase: '{values}', phraseAny: 'all plants',
  plural: { Perennial: 'perennials', Shrub: 'shrubs', Fern: 'ferns', Herb: 'herbs' },
  options: ['Perennial', 'Shrub', 'Fern', 'Herb'].map((value) => ({ value, label: value })),
};
const light: FilterSection = {
  key: 'light', label: 'Light', kind: 'choice', phrase: 'for {values}', phraseAny: 'for any light',
  options: ['Sun', 'Part shade', 'Shade'].map((value) => ({ value, label: value })),
};
const price: FilterSection = {
  key: 'price', label: 'Price', kind: 'range', type: 'money', format: { currency: 'EUR', locale: 'en-IE' }, phraseAny: 'at any price',
  ranges: [{ label: 'Under €5', to: '5' }, { label: '€5–€10', from: '5', to: '10' }],
};
const stock: FilterSection = { key: 'stock', label: 'In stock', kind: 'bool', phrase: 'in stock only', phraseAny: 'including sold out' };
const plants = [kind, light, price, stock];

const text = (value: FilterValue, sections = plants, words = w) => sentenceText(sentenceParts(sections, value, words), words);
const part = (value: FilterValue, key: string, sections = plants) => sentenceParts(sections, value, w).find((p) => p.key === key)!;

test("the handoff's sentence", () => {
  assert.equal(text({ kind: ['Perennial', 'Fern'], light: ['Shade'] }), 'Show perennials and ferns for shade, at any price, including sold out.');
});

test('nothing set', () => {
  assert.equal(text({}), 'Show all plants for any light, at any price, including sold out.');
});

test('three or more values, and a value with no plural', () => {
  const five: FilterSection = { ...kind, options: [...kind.options, { value: 'Climber', label: 'Climber' }] } as FilterSection;
  const p = part({ kind: ['Perennial', 'Shrub', 'Fern', 'Herb', 'Climber'] }, 'kind', [five, light, price, stock]);
  assert.equal(p.button, 'perennials, shrubs, ferns, herbs and climber');
});

test('a range reads in lower case', () => {
  assert.equal(part({ price: { to: '5' } }, 'price').button, 'under €5');
  // No named range: its summary, first letter lower-cased.
  assert.equal(part({ price: { from: '7' } }, 'price').button, 'from €7');
});

test('bool yes uses the phrase; no reads label: no', () => {
  assert.deepEqual(part({ stock: true }, 'stock'), { key: 'stock', before: '', button: 'in stock only', after: '.', set: true });
  const no = part({ stock: false }, 'stock');
  assert.equal(no.before + no.button, 'In stock: no');
  assert.equal(no.button, 'no');
  // A phrase with {values} puts the yes word, lower case, in its place.
  const organic: FilterSection = { key: 'organic', label: 'Organic', kind: 'bool', phrase: 'grown {values}', yes: 'Organic' };
  assert.equal(text({ organic: true }, [organic]), 'Show grown organic.');
});

test('a column without phrase reads "Label: values" and "Label: any"', () => {
  const owner: FilterSection = { key: 'owner', label: 'Owner', kind: 'choice', options: [{ value: 'ana', label: 'Ana' }, { value: 'ben', label: 'Ben' }] };
  assert.deepEqual(part({ owner: ['ana', 'ben'] }, 'owner', [kind, owner]), { key: 'owner', before: 'Owner: ', button: 'ana and ben', after: '.', set: true });
  assert.deepEqual(part({}, 'owner', [kind, owner]), { key: 'owner', before: '', button: 'Owner: any', after: '.', set: false });
  assert.equal(text({}, [kind, owner]), 'Show all plants Owner: any.');
});

test('the parts split around {values}', () => {
  const parts = sentenceParts(plants, { light: ['Shade'] }, w);
  assert.deepEqual(parts.find((p) => p.key === 'light'), { key: 'light', before: 'for ', button: 'shade', after: ', ', set: true });
  assert.deepEqual(parts.find((p) => p.key === 'price'), { key: 'price', before: '', button: 'at any price', after: ', ', set: false });
  // The joiners: a space after the first, ", " after each further one, listComma + " " before the last, then sentenceEnd.
  assert.deepEqual(parts.map((p) => p.after), [' ', ', ', ', ', '.']);
  // Text after {values} is plain, before the joiner.
  const tail: FilterSection = { ...light, phrase: 'for {values} spots' } as FilterSection;
  assert.deepEqual(sentenceParts([kind, tail], { light: ['Shade'] }, w)[1], { key: 'light', before: 'for ', button: 'shade', after: ' spots.', set: true });
});

test('the joining words can change', () => {
  assert.equal(text({}, plants, { ...w, listComma: '' }), 'Show all plants for any light, at any price including sold out.');
  assert.equal(text({ kind: ['Perennial', 'Fern', 'Herb'] }, plants, { ...w, and: '&', comma: ';', sentenceStart: 'Find', sentenceEnd: '!' }),
    'Find perennials; ferns & herbs for any light; at any price, including sold out!');
});

test('a value no longer offered reads by its value, in lower case', () => {
  assert.equal(part({ light: ['Deep Shade'] }, 'light').button, 'deep shade');
});

test('joinValues', () => {
  assert.equal(joinValues([], w), '');
  assert.equal(joinValues(['a'], w), 'a');
  assert.equal(joinValues(['a', 'b'], w), 'a and b');
  assert.equal(joinValues(['a', 'b', 'c'], w), 'a, b and c');
});

test('defaultSentenceWords', () => {
  assert.equal(w.sentenceNone(w.things), 'No results match that sentence. Change one of the underlined parts.');
  assert.equal(w.startOver, 'Start over');
  assert.equal(w.anyValue, 'any');
});

// SN-2: the style and the ./sentence entry (no Lit inside).
test('phraseName: the section, then what the phrase says', async () => {
  const { phraseName } = await import('../src/sentence.ts');
  const owner: FilterSection = { key: 'owner', label: 'Owner', kind: 'choice', options: [{ value: 'ana', label: 'Ana' }] };
  const [k, l, , s, o] = sentenceParts([kind, light, price, stock, owner], { kind: ['Perennial', 'Fern'], stock: false }, w);
  assert.equal(phraseName(kind, k!), 'Kind: perennials and ferns');
  assert.equal(phraseName(light, l!), 'Light: for any light');
  // A part that already starts with its label is not named twice.
  assert.equal(phraseName(stock, s!), 'In stock: no');
  assert.equal(phraseName(owner, o!), 'Owner: any');
});

test('sentenceStyle: instant, above the bar, the sheet under 480 px, its own empty line', async () => {
  const { sentenceStyle } = await import('../src/sentence.ts');
  assert.equal(sentenceStyle.name, 'sentence');
  assert.equal(sentenceStyle.instant, true);
  assert.equal(sentenceStyle.showsApplied, true);
  assert.equal(sentenceStyle.above, true);
  assert.equal(sentenceStyle.narrowBelow, 480);
  const view = (value: FilterValue, words: object = {}) => ({ sections: plants, value, words: { ...defaultFilterWords, ...words } }) as never;
  // Nothing set: the host's own empty line.
  assert.equal(sentenceStyle.empty!(view({})), null);
  assert.equal(sentenceStyle.empty!(view({ kind: ['Fern'] })), 'No results match that sentence. Change one of the underlined parts.');
  assert.equal(sentenceStyle.empty!(view({ kind: ['Fern'] }, { things: 'plants' })), 'No plants match that sentence. Change one of the underlined parts.');
});
