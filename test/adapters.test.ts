import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Query } from '../src/core/types.ts';
import { jsonAdapter } from '../src/adapters/json.ts';
import { pammyAdapter } from '../src/adapters/pammy.ts';
import { adapterNamed, registerAdapter, whenRegistered } from '../src/adapters/register.ts';
import type { Adapter } from '../src/adapters/types.ts';

const base: Query = { page: 1, search: '', sort: '', dir: 'asc', view: '' };
const q = (over: Partial<Query> = {}): Query => ({ ...base, ...over });
const opts = (src: string) => ({ signal: new AbortController().signal, src });

type Call = { url: string; init: RequestInit | undefined };
const realFetch = globalThis.fetch;
let calls: Call[] = [];

// Stubs fetch with one answer; every call is kept for the checks.
function answer(body: unknown, status = 200): void {
  calls = [];
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

const params = (url: string) => Object.fromEntries(new URL(url).searchParams);

test('json: array answer means browser mode', async () => {
  answer([{ name: 'Rose jam' }, { name: 'Fig salad' }]);
  const out = await jsonAdapter.load(q(), opts('https://x.test/api/recipes'));
  assert.deepEqual(out.rows, [{ name: 'Rose jam' }, { name: 'Fig salad' }]);
  assert.equal(out.total, undefined);
  // The default query adds nothing to the address.
  assert.equal(calls[0]!.url, 'https://x.test/api/recipes');
  assert.equal(calls[0]!.init?.credentials, 'same-origin');
  assert.equal(new Headers(calls[0]!.init?.headers).get('Accept'), 'application/json');
});

test('json: {rows,total} passes the query as parameters', async () => {
  answer({ rows: [{ name: 'Rose jam' }], total: 41 });
  const signal = new AbortController().signal;
  const out = await jsonAdapter.load(q({ page: 3, search: 'rose', sort: 'name', dir: 'desc', view: 'veg' }),
    { signal, src: 'https://x.test/api/recipes?site=pammy' });
  assert.deepEqual(out, { rows: [{ name: 'Rose jam' }], total: 41 });
  // src's own parameters stay.
  assert.deepEqual(params(calls[0]!.url), { site: 'pammy', page: '3', search: 'rose', sort: 'name', dir: 'desc', view: 'veg' });
  assert.equal(calls[0]!.init?.signal, signal);
});

test('json: {rows} with no total is browser mode too', async () => {
  answer({ rows: [{ name: 'A' }] });
  const out = await jsonAdapter.load(q(), opts('https://x.test/a'));
  assert.equal(out.total, undefined);
});

test('json: an answer that is no list throws', async () => {
  answer({ hello: 'there' });
  await assert.rejects(jsonAdapter.load(q(), opts('https://x.test/a')), Error);
});

test('pammy: maps Query to its parameters', async () => {
  answer({ resource: 'recipes', rich: [], page: 2, per: 10, total: 23, items: [{ id: 11, name: 'Rose jam' }] });
  const out = await pammyAdapter.load(q({ page: 2, search: 'rose', sort: 'name', dir: 'desc', view: 'ignored' }),
    { signal: new AbortController().signal, src: 'https://pammy.test/_pammy/api/data/postgres/recipes/recipes', pageSize: 10 });
  assert.deepEqual(out, { rows: [{ id: 11, name: 'Rose jam' }], total: 23 });
  // The data API has no views, so view is not sent.
  assert.deepEqual(params(calls[0]!.url), { page: '2', per: '10', search: 'rose', sort: 'name', dir: 'desc' });
  assert.equal(calls[0]!.init?.credentials, 'same-origin');
});

test('pammy: default query sends only per, and keeps src filters', async () => {
  answer({ page: 1, per: 20, total: 0, items: [] });
  await pammyAdapter.load(q(), opts('https://pammy.test/_pammy/api/data/postgres/blog/posts?where.published=true'));
  assert.deepEqual(params(calls[0]!.url), { 'where.published': 'true', per: '20' });
});

test('a non-2xx answer throws an Error with the status', async () => {
  answer({ error: 'nope', message: 'No such list.' }, 404);
  await assert.rejects(jsonAdapter.load(q(), opts('https://x.test/a')), (e: Error) => e instanceof Error && /404/.test(e.message));
  answer({ error: 'too-many', message: 'Too many requests just now.' }, 429);
  await assert.rejects(pammyAdapter.load(q(), opts('https://x.test/b')), (e: Error) => e instanceof Error && /429/.test(e.message));
});

test('adapters register themselves by name', () => {
  assert.equal(adapterNamed('json'), jsonAdapter);
  assert.equal(adapterNamed('pammy'), pammyAdapter);
  assert.equal(adapterNamed('nope'), undefined);
});

test('a waiting element hears when its adapter arrives', () => {
  const heard: string[] = [];
  const stop = whenRegistered('later', () => heard.push('later'));
  const fake: Adapter = { load: async () => ({ rows: [] }) };
  registerAdapter('other', fake);
  assert.deepEqual(heard, []);
  registerAdapter('later', fake);
  assert.deepEqual(heard, ['later']);
  // Heard once, then it stops listening.
  registerAdapter('later', fake);
  assert.deepEqual(heard, ['later']);
  stop();
});

test('the registry lives on globalThis, shared by separate bundles', () => {
  const g = (globalThis as unknown as { __lfdlnDataViewerAdapters: { adapters: Map<string, Adapter> } }).__lfdlnDataViewerAdapters;
  assert.equal(g.adapters.get('json'), jsonAdapter);
});
