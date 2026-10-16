import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COUNT_DEBOUNCE_MS, DraftCount } from '../src/core/draft-count.ts';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// A count that ignores its abort signal, as a host's own fetch might: the guard alone keeps an
// older answer that arrives after a newer one from replacing it.
test('an older answer that ignores the abort never replaces a newer one', async () => {
  const answers: number[] = [];
  const dc = new DraftCount(() => answers.push(dc.value!));
  let answerOld!: (n: number) => void;
  let oldAsked = false;
  dc.ask(() => new Promise<number>((r) => {
    oldAsked = true;
    answerOld = r;
  }));
  await wait(COUNT_DEBOUNCE_MS + 50);
  assert.ok(oldAsked, 'the first request has started');
  dc.ask(async () => 2);
  await wait(COUNT_DEBOUNCE_MS + 50);
  assert.equal(dc.value, 2);
  answerOld(1); // out of order: the older request answers last
  await wait(10);
  assert.equal(dc.value, 2);
  assert.deepEqual(answers, [2]);
});

test('stop() forgets the count and drops a running answer', async () => {
  const dc = new DraftCount(() => {});
  let answer!: (n: number) => void;
  dc.ask(() => new Promise<number>((r) => (answer = r)));
  await wait(COUNT_DEBOUNCE_MS + 50);
  dc.stop();
  answer(5);
  await wait(10);
  assert.equal(dc.value, null);
});
