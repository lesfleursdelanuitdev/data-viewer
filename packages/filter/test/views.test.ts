import { test } from 'node:test';
import assert from 'node:assert/strict';
import { builderRows, canSaveView, defaultViewsWords, menuId, newViewLabel, saveLabel } from '../src/styles/views-logic.ts';
import { defaultFilterWords } from '../src/core/summary.ts';
import type { FilterSection } from '../src/core/types.ts';

const w = defaultFilterWords;
const kind: FilterSection = {
  key: 'kind', label: 'Kind', kind: 'choice',
  options: [{ value: 'Herb', count: 5 }, { value: 'fern', label: 'Fern', count: 0 }],
};
const price: FilterSection = {
  key: 'price', label: 'Price', kind: 'range', type: 'money',
  ranges: [{ label: 'Under €5', to: '5', count: 6 }, { label: '€5–€10', from: '5', to: '10', count: 4 }],
};
const plain: FilterSection = { key: 'height', label: 'Height', kind: 'range', type: 'number' };
const stock: FilterSection = { key: 'stock', label: 'In stock', kind: 'bool' };
const own: FilterSection = { key: 'sold', label: 'Sold', kind: 'bool', yes: 'Sold', no: 'Unsold' };

test('builderRows: a choice is chips of its options, with counts, on, and the value a tick leaves', () => {
  const [row] = builderRows([kind], { kind: ['Herb'], stock: true }, w);
  assert.equal(row!.key, 'kind');
  assert.equal(row!.label, 'Kind');
  assert.equal(row!.boxes, false);
  assert.deepEqual(row!.chips.map((c) => [c.label, c.count, c.on]), [['Herb', 5, true], ['Fern', 0, false]]);
  assert.deepEqual(row!.chips[0]!.next, { stock: true });
  assert.deepEqual(row!.chips[1]!.next, { kind: ['Herb', 'fern'], stock: true });
});

test('builderRows: a choice shows a picked value it no longer offers, count 0', () => {
  const [row] = builderRows([kind], { kind: ['Cactus'] }, w);
  assert.deepEqual(row!.chips.map((c) => [c.label, c.count, c.on]), [['Herb', 5, false], ['Fern', 0, false], ['Cactus', 0, true]]);
  assert.deepEqual(row!.chips[2]!.next, {});
});

test('builderRows: a range with named ranges is single chips; a tick on the picked one unpicks it', () => {
  const [row] = builderRows([price], { price: { to: '5' } }, w);
  assert.equal(row!.boxes, false);
  assert.deepEqual(row!.chips.map((c) => [c.label, c.count, c.on]), [['Under €5', 6, true], ['€5–€10', 4, false]]);
  assert.deepEqual(row!.chips[0]!.next, {});
  assert.deepEqual(row!.chips[1]!.next, { price: { from: '5', to: '10' } });
});

test('builderRows: a range without named ranges has the From and To boxes and no chips', () => {
  const [row] = builderRows([plain], {}, w);
  assert.equal(row!.boxes, true);
  assert.deepEqual(row!.chips, []);
});

test('builderRows: yes / no is two chips, one at a time, in the section\'s own words', () => {
  const [off, on] = [builderRows([stock], {}, w)[0]!, builderRows([stock], { stock: true }, w)[0]!];
  assert.deepEqual(off.chips.map((c) => [c.label, c.on, c.count]), [['Yes', false, undefined], ['No', false, undefined]]);
  assert.deepEqual(off.chips[0]!.next, { stock: true });
  assert.deepEqual(off.chips[1]!.next, { stock: false });
  assert.deepEqual(on.chips.map((c) => c.on), [true, false]);
  assert.deepEqual(on.chips[0]!.next, {}); // tick again unpicks
  assert.deepEqual(on.chips[1]!.next, { stock: false }); // the other replaces it
  const no = builderRows([own], { sold: false }, w)[0]!;
  assert.deepEqual(no.chips.map((c) => [c.label, c.on]), [['Sold', false], ['Unsold', true]]);
});

test('saveLabel: "Save · N results", "Save · 1 result", "Save" while unknown', () => {
  assert.equal(saveLabel(5, defaultViewsWords), 'Save · 5 results');
  assert.equal(saveLabel(1, defaultViewsWords), 'Save · 1 result');
  assert.equal(saveLabel(0, defaultViewsWords), 'Save · 0 results');
  assert.equal(saveLabel(null, defaultViewsWords), 'Save');
});

test('newViewLabel: the trimmed name, else "View n" after the user views', () => {
  assert.equal(newViewLabel('  ', 2, defaultViewsWords), 'View 3');
  assert.equal(newViewLabel('', 0, defaultViewsWords), 'View 1');
  assert.equal(newViewLabel(' Shade ', 0, defaultViewsWords), 'Shade');
});

test('canSaveView: only a view that filters or searches something', () => {
  assert.equal(canSaveView([kind, price], {}, ''), false);
  assert.equal(canSaveView([kind, price], { kind: [], price: { from: ' ' } }, '  '), false); // narrows nothing
  assert.equal(canSaveView([kind], { kind: ['Herb'] }, ''), true);
  assert.equal(canSaveView([kind], {}, 'mint'), true);
  assert.equal(canSaveView([stock], { stock: false }, ''), true);
});

test('defaultViewsWords: the words of the plan', () => {
  const v = defaultViewsWords;
  assert.deepEqual([v.allViews, v.newView, v.viewName(2), v.nameView, v.saveViewUnknown, v.viewMenu('Herbs'), v.rename, v.delete,
    v.renameView('Herbs'), v.viewDeleted('Herbs'), v.undo], ['All', 'New view', 'View 2', 'Name this view', 'Save', 'More for Herbs',
    'Rename', 'Delete', 'Rename Herbs', 'Deleted “Herbs”', 'Undo']);
});

test('menuId: keyed by the view key, safe for an id, and distinct for distinct keys', () => {
  assert.equal(menuId('f1', 'u-abc9'), 'f1-vm-u-abc9');
  assert.equal(menuId('f1', 'a b'), 'f1-vm-a_20_b');
  assert.notEqual(menuId('f1', 'a_20_b'), menuId('f1', 'a b'));
  assert.match(menuId('f1', 'é"#/ x'), /^[A-Za-z0-9_-]+$/);
});
