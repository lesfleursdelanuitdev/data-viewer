import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCell, formatNumber } from '../src/core/format.ts';
import type { Column } from '../src/core/types.ts';

type R = { v?: unknown };
const col = (c: Partial<Column<R>>): Column<R> => ({ key: 'v', label: 'V', ...c });

test('money uses format.currency', () => {
  const c = col({ type: 'money', format: { currency: 'USD' } });
  assert.equal(formatCell(c, { v: 1234.5 }, 'en-US'), '$1,234.50');
});

test('number groups digits for the locale', () => {
  assert.equal(formatCell(col({ type: 'number' }), { v: 1234567 }, 'en-US'), '1,234,567');
});

test('date uses format.date, and an invalid date gives empty text', () => {
  const c = col({ type: 'date', format: { date: { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' } } });
  assert.equal(formatCell(c, { v: '2026-03-05T12:00:00Z' }, 'en-US'), 'March 5, 2026');
  assert.equal(formatCell(c, { v: 'not a date' }, 'en-US'), '');
});

test('bool gives Yes / No', () => {
  const c = col({ type: 'bool' });
  assert.equal(formatCell(c, { v: true }), 'Yes');
  assert.equal(formatCell(c, { v: false }), 'No');
});

test('null and undefined give empty text for every type', () => {
  const types = ['text', 'number', 'money', 'date', 'badge', 'image', 'link', 'tags', 'bool'] as const;
  for (const type of types) {
    assert.equal(formatCell(col({ type }), { v: null }, 'en-US'), '', type);
    assert.equal(formatCell(col({ type }), {}, 'en-US'), '', type);
  }
});

test('unreadable numbers give empty text', () => {
  assert.equal(formatCell(col({ type: 'number' }), { v: 'abc' }, 'en-US'), '');
});

test('tags join with a comma, other types give plain text', () => {
  assert.equal(formatCell(col({ type: 'tags' }), { v: ['a', 'b'] }), 'a, b');
  assert.equal(formatCell(col({ type: 'badge' }), { v: 'Paid' }), 'Paid');
});

test('value() overrides row[key]', () => {
  assert.equal(formatCell(col({ value: () => 'x' }), { v: 'y' }), 'x');
});

test('odd values draw as empty text, never NaN or [object Object]', () => {
  assert.equal(formatCell(col({ type: 'text' }), { v: NaN }), '');
  assert.equal(formatCell(col({}), { v: NaN }), '');
  assert.equal(formatCell(col({}), { v: Infinity }), '');
  assert.equal(formatCell(col({ type: 'tags' }), { v: [1, NaN] }), '1');
  assert.equal(formatCell(col({ type: 'text' }), { v: { a: 1 } }), '');
});

test('a currency typo shows the plain number instead of throwing', () => {
  const c = col({ type: 'money', format: { currency: 'EURO' } });
  assert.equal(formatCell(c, { v: 12 }, 'en-US'), '12.00');
});

test('a locale typo falls back to the browser locale instead of throwing', () => {
  const plain = formatCell(col({ type: 'number' }), { v: 1234 });
  assert.equal(formatCell(col({ type: 'number' }), { v: 1234 }, 'en_US'), plain);
  assert.equal(formatCell(col({ type: 'money', format: { currency: 'USD' } }), { v: 1 }, 'en_US'),
    formatCell(col({ type: 'money', format: { currency: 'USD' } }), { v: 1 }));
  assert.equal(formatCell(col({ type: 'date' }), { v: '2026-03-05T12:00:00Z' }, 'en_US'),
    formatCell(col({ type: 'date' }), { v: '2026-03-05T12:00:00Z' }));
  assert.equal(formatNumber(1234, 'en_US'), formatNumber(1234));
});

test('bad date options fall back to the default date style', () => {
  const c = col({ type: 'date', format: { date: { dateStyle: 'nope' } as unknown as Intl.DateTimeFormatOptions } });
  assert.equal(formatCell(c, { v: '2026-03-05T12:00:00Z' }, 'en-US'), 'Mar 5, 2026');
});
