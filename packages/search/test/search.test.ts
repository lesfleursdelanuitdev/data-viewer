import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { debounce } from '../src/debounce.ts';

test('debounce fires once, 300 ms after the last run()', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fn = mock.fn();
  const d = debounce(fn, 300);
  d.run();
  t.mock.timers.tick(200);
  d.run(); // typing again restarts the wait
  t.mock.timers.tick(299);
  assert.equal(fn.mock.callCount(), 0);
  t.mock.timers.tick(1);
  assert.equal(fn.mock.callCount(), 1);
  t.mock.timers.tick(1000);
  assert.equal(fn.mock.callCount(), 1);
});

test('flush() fires at once and drops the pending one', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fn = mock.fn();
  const d = debounce(fn, 300);
  d.run();
  d.flush();
  assert.equal(fn.mock.callCount(), 1);
  t.mock.timers.tick(1000);
  assert.equal(fn.mock.callCount(), 1);
});

test('flush() with nothing pending still fires (Enter on an unchanged box)', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fn = mock.fn();
  debounce(fn, 300).flush();
  assert.equal(fn.mock.callCount(), 1);
});

test('cancel() drops the pending one', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fn = mock.fn();
  const d = debounce(fn, 300);
  d.run();
  d.cancel();
  t.mock.timers.tick(1000);
  assert.equal(fn.mock.callCount(), 0);
});

test('a delay of 0 or junk still waits for the next turn, not forever', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fn = mock.fn();
  const d = debounce(fn, Number.NaN);
  d.run();
  t.mock.timers.tick(0);
  assert.equal(fn.mock.callCount(), 1);
});
