import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_KEYS, newWarnings, splitConfig } from '../src/core/config.ts';

test('splitConfig keeps known properties in a fixed order, columns before rows', () => {
  const cardOf = () => ({ title: 'x' });
  const out = splitConfig({ rows: [1], label: 'Plants', cardOf, columns: [{ key: 'a', label: 'A' }] });
  assert.deepEqual(out.props.map(([k]) => k), ['label', 'columns', 'cardOf', 'rows']);
  assert.equal(out.props.find(([k]) => k === 'cardOf')![1], cardOf);
  assert.deepEqual(out.unknown, []);
});

test('splitConfig takes on handlers that are functions, and load', () => {
  const act = () => {};
  const load = async () => [];
  const out = splitConfig({ on: { 'dv-action': act, 'dv-open': 'nope' }, load });
  assert.deepEqual(out.on, [['dv-action', act]]);
  assert.equal(out.load, load);
  assert.deepEqual(out.problems, ['on.dv-open is not a function']);
  assert.deepEqual(out.props, []);
});

test('splitConfig lists unknown keys and never applies them', () => {
  const out = splitConfig({ colums: [], config: './x.js', busy: true, _q: {}, label: 'x' });
  assert.deepEqual(out.unknown, ['colums', 'config', 'busy', '_q']);
  assert.deepEqual(out.props.map(([k]) => k), ['label']);
});

test('splitConfig: load that is not a function, and an on that is not an object', () => {
  const out = splitConfig({ load: 3, on: 'x' });
  assert.equal(out.load, undefined);
  assert.deepEqual(out.problems, ['load is not a function', 'on is not an object']);
});

test('splitConfig of something that is not an object gives nothing', () => {
  for (const v of [undefined, null, 3, 'x', [1, 2]]) {
    const out = splitConfig(v);
    assert.deepEqual([out.props, out.on, out.unknown], [[], [], []], String(v));
  }
});

test('the keys are the public properties, without config or busy', () => {
  for (const k of ['columns', 'views', 'cardOf', 'rows', 'total', 'pageSize', 'pageSizes', 'pager', 'layoutSwitch', 'layoutIcons', 'words']) {
    assert.ok(CONFIG_KEYS.includes(k as never), k);
  }
  for (const k of ['config', 'busy', 'on', 'load']) assert.ok(!CONFIG_KEYS.includes(k as never), k);
});

test('newWarnings says each unknown key once', () => {
  const warned = new Set<string>();
  assert.deepEqual(newWarnings(['colums', 'x'], warned), ['colums', 'x']);
  assert.deepEqual(newWarnings(['x', 'y'], warned), ['y']);
  assert.deepEqual(newWarnings(['colums'], warned), []);
});

test('defineList returns the config as is, and types its rows (checked by tsc)', async () => {
  const { defineList } = await import('../src/element/setup.ts');
  type Plant = { name: string; price: number };
  const cfg = defineList<Plant>({
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'double', label: 'Twice', value: (p) => p.price * 2 },
    ],
    cardOf: (p) => ({ title: p.name }),
    on: { 'dv-action': (e) => void e.detail.row.price },
  });
  // @ts-expect-error a column key that is no row key, with no value() or render()
  defineList<Plant>({ columns: [{ key: 'nmae', label: 'Typo' }] });
  assert.equal(typeof cfg, 'object');
});

test('custom cards: cardTemplate, cardMount and cardTemplateId are config keys, applied before rows', () => {
  const cardTemplate = () => 'x';
  const cardMount = () => {};
  const out = splitConfig({ rows: [], cardMount, cardTemplate, cardTemplateId: 'plant-card' });
  assert.deepEqual(out.props.map(([k]) => k), ['cardTemplate', 'cardMount', 'cardTemplateId', 'rows']);
  assert.deepEqual(out.unknown, []);
});

test('defineList types cardTemplate and cardMount with the row type (checked by tsc)', async () => {
  const { defineList } = await import('../src/element/setup.ts');
  type Plant = { name: string; price: number };
  defineList<Plant>({
    cardTemplate: (p, pieces) => `${p.name} ${pieces.text('price')}`,
    cardMount: (el, p, pieces) => {
      el.append(p.name, pieces.menu, pieces.actions);
      return () => el.replaceChildren();
    },
  });
  // @ts-expect-error a field the row doesn't have
  defineList<Plant>({ cardTemplate: (p) => p.nmae });
});
