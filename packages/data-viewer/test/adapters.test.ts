import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Query } from '../src/core/types.ts';
import { jsonAdapter } from '../src/adapters/json.ts';
import { pammyAdapter } from '../src/adapters/pammy.ts';
import { adapterNamed, registerAdapter, whenRegistered } from '../src/adapters/register.ts';
import type { Adapter } from '../src/adapters/types.ts';

const base: Query = { page: 1, search: '', sort: '', dir: 'asc', view: '', size: 20 };
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
  const out = await pammyAdapter.load(q({ page: 2, search: 'rose', sort: 'name', dir: 'desc', view: 'ignored', size: 10 }),
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

test('json: a total sent as a string (PHP/PDO counts) is still server mode', async () => {
  answer({ rows: [{ name: 'Rose jam' }], total: '45' });
  const out = await jsonAdapter.load(q(), opts('https://x.test/api/recipes'));
  assert.equal(out.total, 45);
});

test('json: a total that is not a number means browser mode', async () => {
  for (const total of ['', 'many', null, true, [3]]) {
    answer({ rows: [{ name: 'Rose jam' }], total });
    const out = await jsonAdapter.load(q(), opts('https://x.test/api/recipes'));
    assert.equal(out.total, undefined, `total ${JSON.stringify(total)}`);
  }
});

test('json and pammy say plainly that they need src', async () => {
  answer([]);
  await assert.rejects(jsonAdapter.load(q(), opts('')), /needs src/);
  await assert.rejects(pammyAdapter.load(q(), opts('  ')), /needs src/);
  assert.equal(calls.length, 0);
});

test('json: sends size when it is not the default 20', async () => {
  answer({ rows: [], total: 0 });
  await jsonAdapter.load(q({ size: 50 }), opts('https://x.test/api/recipes'));
  assert.deepEqual(params(calls[0]!.url), { size: '50' });
  answer({ rows: [], total: 0 });
  await jsonAdapter.load(q({ size: 20 }), opts('https://x.test/api/recipes'));
  assert.equal(calls[0]!.url, 'https://x.test/api/recipes');
});

test('pammy: per follows the query\'s size, and is capped at 100', async () => {
  answer({ page: 1, per: 50, total: 0, items: [] });
  await pammyAdapter.load(q({ size: 50 }), { ...opts('https://pammy.test/_pammy/api/data/postgres/r/r'), pageSize: 20 });
  assert.equal(params(calls[0]!.url).per, '50');
  answer({ page: 1, per: 100, total: 0, items: [] });
  await pammyAdapter.load(q({ size: 250 }), opts('https://pammy.test/_pammy/api/data/postgres/r/r'));
  assert.equal(params(calls[0]!.url).per, '100');
});

test('json: sends "Search in" as in and filters as f.<key>, encoded as in the address (Review Focus 2)', async () => {
  answer({ rows: [], total: 0 });
  const filters = { owner: ['Smith, Jane', 'Café', 'A & B'], price: { from: '10' }, organic: false, empty: [] };
  await jsonAdapter.load(q({ searchIn: 'name', filters }), opts('https://x.test/api/orders'));
  const url = new URL(calls[0]!.url);
  assert.equal(url.searchParams.get('in'), 'name');
  assert.equal(url.searchParams.get('f.price'), '10..');
  assert.equal(url.searchParams.get('f.organic'), 'no');
  assert.equal(url.searchParams.has('f.empty'), false);
  // How a server reads a choice back: split on the commas, then decode each value.
  const owner = url.searchParams.get('f.owner')!.split(',').map(decodeURIComponent);
  assert.deepEqual(owner, ['Smith, Jane', 'Café', 'A & B']);
  // Nothing set: neither is sent.
  answer({ rows: [], total: 0 });
  await jsonAdapter.load(q(), opts('https://x.test/api/orders'));
  assert.equal(calls[0]!.url, 'https://x.test/api/orders');
});

test('json: passes facets through; junk facets are dropped', async () => {
  const facets = { status: [{ value: 'paid', label: 'Paid', count: 3 }, { value: 'due', count: 1 }] };
  answer({ rows: [], total: 4, facets: { ...facets, bad: 'x', worse: [{ label: 'no value' }, 5] } });
  const out = await jsonAdapter.load(q(), opts('https://x.test/api/orders'));
  assert.deepEqual(out.facets, { ...facets, worse: [] });
  answer({ rows: [], total: 4 });
  assert.equal((await jsonAdapter.load(q(), opts('https://x.test/api/orders'))).facets, undefined);
});

test('pammy: says what it supports, sends a choice as where.<key>, never in or f.*', async () => {
  assert.deepEqual(pammyAdapter.supports, { filters: 'equals', searchIn: false, facets: false });
  answer({ items: [], total: 0 });
  await pammyAdapter.load(q({ searchIn: 'name', search: 'rose', filters: { status: ['shipped'], price: { from: '1' }, organic: true } }),
    opts('https://x.test/_pammy/api/data/postgres/shop/orders'));
  const p = params(calls[0]!.url);
  assert.equal(p['where.status'], 'shipped');
  assert.equal(p.search, 'rose');
  assert.deepEqual(Object.keys(p).filter((k) => k === 'in' || k.startsWith('f.') || k.startsWith('where.')), ['where.status']);
});
