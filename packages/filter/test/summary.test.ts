import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chipsOf, defaultFilterWords as w, isSet, sectionSummary, summarise } from '../src/core/summary.ts';
import type { FilterSection } from '../src/core/types.ts';

const status: FilterSection = {
  key: 'status', label: 'Status', kind: 'choice',
  options: [{ value: 'shipped', label: 'Shipped' }, { value: 'pending', label: 'Pending' }, { value: 'lost', label: 'Lost' }],
};
const price: FilterSection = { key: 'price', label: 'Price', kind: 'range', type: 'money', format: { currency: 'EUR', locale: 'en-IE' } };
const year: FilterSection = { key: 'planted', label: 'Planted', kind: 'range', type: 'date', ranges: [{ label: '1900s', from: '1900', to: '1999' }] };
const size: FilterSection = { key: 'size', label: 'Size', kind: 'range' };
const organic: FilterSection = { key: 'organic', label: 'Organic', kind: 'bool' };
const potted: FilterSection = { key: 'potted', label: 'Potted', kind: 'bool', yes: 'In a pot', no: 'In the ground' };
const sections = [status, price];

test('summarise: the set sections joined with " · "', () => {
  assert.equal(summarise(sections, { status: ['shipped', 'pending'], price: { from: '10', to: '50' } }, w), 'Shipped, Pending · €10–€50');
});

test('summarise: more than two picked shows "<n> <section label>"', () => {
  assert.equal(summarise(sections, { status: ['shipped', 'pending', 'lost'], price: { from: '10', to: '50' } }, w), '3 status · €10–€50');
});

test('summarise: nothing set is the button word', () => {
  assert.equal(summarise(sections, {}, w), 'Filter');
  assert.equal(summarise(sections, { status: [], price: { from: ' ' } }, w), 'Filter');
  assert.equal(summarise(sections, {}, { ...w, filter: 'Narrow down' }), 'Narrow down');
});

test('sectionSummary: choice', () => {
  assert.equal(sectionSummary(status, undefined, w), 'Any');
  assert.equal(sectionSummary(status, ['lost'], w), 'Lost');
  assert.equal(sectionSummary(status, ['lost', 'shipped'], w), 'Lost, Shipped');
  assert.equal(sectionSummary(status, ['lost', 'shipped', 'pending'], w), '3 selected');
  assert.equal(sectionSummary(status, ['archived'], w), 'archived'); // an option that no longer exists
});

test('sectionSummary: range', () => {
  assert.equal(sectionSummary(size, { from: '10', to: '50' }, w), '10–50');
  assert.equal(sectionSummary(size, { from: '10' }, w), 'From 10');
  assert.equal(sectionSummary(size, { to: '50' }, w), 'Up to 50');
  assert.equal(sectionSummary(size, {}, w), 'Any');
  assert.equal(sectionSummary(price, { from: '12.5' }, w), 'From €12.50');
  assert.equal(sectionSummary(price, { to: 'lots' }, w), 'Up to lots'); // not a number: as typed
  assert.equal(sectionSummary(year, { from: '1900', to: '1999' }, w), '1900s'); // a quick range by its name
  assert.equal(sectionSummary(year, { from: '1950-06' }, w), 'From 1950-06');
});

test('sectionSummary: bool', () => {
  assert.equal(sectionSummary(organic, true, w), 'Yes');
  assert.equal(sectionSummary(organic, false, w), 'No');
  assert.equal(sectionSummary(organic, undefined, w), 'Any');
  assert.equal(sectionSummary(potted, false, w), 'In the ground');
});

test('isSet', () => {
  assert.equal(isSet(status, ['x']), true);
  assert.equal(isSet(status, []), false);
  assert.equal(isSet(size, { from: '', to: '  ' }), false);
  assert.equal(isSet(size, { to: '3' }), true);
  assert.equal(isSet(organic, false), true);
  assert.equal(isSet(organic, undefined), false);
  assert.equal(isSet(status, true), false); // the wrong shape for the kind
});

test('chipsOf: one per picked option, one per set range and bool, in section order', () => {
  assert.deepEqual(chipsOf([status, price, organic], { organic: true, price: { from: '10', to: '50' }, status: ['pending', 'shipped'] }, w), [
    { key: 'status', option: 'pending', label: 'Pending' },
    { key: 'status', option: 'shipped', label: 'Shipped' },
    { key: 'price', label: 'Price: €10–€50' },
    { key: 'organic', label: 'Organic: Yes' },
  ]);
});

test('chipsOf: an option that no longer exists keeps a chip, labelled with its value', () => {
  assert.deepEqual(chipsOf(sections, { status: ['archived'] }, w), [{ key: 'status', option: 'archived', label: 'archived' }]);
});

test('chipsOf: keys with no section and unset sections give no chips', () => {
  assert.deepEqual(chipsOf(sections, { colour: ['red'], price: {} }, w), []);
});
