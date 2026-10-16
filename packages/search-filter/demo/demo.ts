// The demo page plays the list's host: 12 plants (stage 1's, each cared for by someone), the
// sections' counts worked out with the other filters and the search applied (as the viewer does),
// and countFor for the "Search for" row. window.events keeps every event the field fires.
import type { FilterSection, FilterValue } from '@lesfleursdelanuitdev/filter/parts';
import { define, type LfdlnSearchFilter } from '../src/index.ts';

define();

type Plant = { name: string; owner: string; kind: string; light: string; price: number; stock: boolean };
const plants: Plant[] = [
  { name: 'Rose', owner: 'Ana Lopez', kind: 'Flower', light: 'Sun', price: 12.5, stock: true },
  { name: 'Fern', owner: 'Ben Okafor', kind: 'Foliage', light: 'Shade', price: 8, stock: true },
  { name: 'Mint', owner: 'Chloé Martin', kind: 'Herb', light: 'Sun', price: 3.5, stock: false },
  { name: 'Basil', owner: 'Ana Lopez', kind: 'Herb', light: 'Sun', price: 4, stock: true },
  { name: 'Ivy', owner: 'Ben Okafor', kind: 'Foliage', light: 'Shade', price: 6.5, stock: false },
  { name: 'Tulip', owner: 'Chloé Martin', kind: 'Flower', light: 'Sun', price: 2, stock: true },
  { name: 'Lily', owner: 'Dan Kay', kind: 'Flower', light: 'Part shade', price: 6, stock: true },
  { name: 'Sage', owner: 'Ana Lopez', kind: 'Herb', light: 'Sun', price: 5, stock: true },
  { name: 'Moss', owner: 'Dan Kay', kind: 'Foliage', light: 'Shade', price: 1.5, stock: false },
  { name: 'Thyme', owner: 'Ben Okafor', kind: 'Herb', light: 'Sun', price: 3, stock: true },
  { name: 'Oak', owner: 'Dan Kay', kind: 'Tree', light: 'Sun', price: 120, stock: true },
  { name: 'Rosemary', owner: 'Chloé Martin', kind: 'Herb', light: 'Part shade', price: 4.5, stock: true },
];
const fields = [{ key: 'name', label: 'Name' }, { key: 'owner', label: 'Owner' }];
const kinds = ['Flower', 'Foliage', 'Herb', 'Tree'];
const lights = ['Sun', 'Shade', 'Part shade'];
const ranges = [{ label: 'Under €5', to: '5' }, { label: '€5–€10', from: '5', to: '10' }, { label: 'Over €10', from: '10' }];

const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();

/** Whether a plant passes the search and every filter but `skip`'s. */
function keeps(p: Plant, search: string, searchIn: string, value: FilterValue, skip?: string): boolean {
  const q = fold(search.trim());
  if (q && !(searchIn ? [searchIn] : ['name', 'owner']).some((k) => fold(String(p[k as keyof Plant])).includes(q))) return false;
  for (const [key, f] of Object.entries(value)) {
    if (key === skip) continue;
    if (Array.isArray(f)) {
      if (f.length && !f.includes(String(p[key as keyof Plant]))) return false;
    } else if (typeof f === 'boolean') {
      if (p.stock !== f) return false;
    } else if (f && typeof f === 'object') {
      const lo = f.from?.trim() ? Number(f.from) : null;
      const hi = f.to?.trim() ? Number(f.to) : null;
      if ((lo !== null && p.price < lo) || (hi !== null && p.price > hi)) return false;
    }
  }
  return true;
}

function sections(search: string, searchIn: string, value: FilterValue): FilterSection[] {
  const count = (skip: string, test: (p: Plant) => boolean) => plants.filter((p) => keeps(p, search, searchIn, value, skip) && test(p)).length;
  return [
    { key: 'kind', label: 'Kind', kind: 'choice', options: kinds.map((v) => ({ value: v, count: count('kind', (p) => p.kind === v) })) },
    { key: 'light', label: 'Light', kind: 'choice', options: lights.map((v) => ({ value: v, count: count('light', (p) => p.light === v) })) },
    {
      key: 'price', label: 'Price', kind: 'range', type: 'money', format: { currency: 'EUR', locale: 'en-IE' },
      ranges: ranges.map((r) => ({ ...r, count: count('price', (p) => (r.from === undefined || p.price >= Number(r.from)) && (r.to === undefined || p.price <= Number(r.to))) })),
    },
    { key: 'stock', label: 'In stock', kind: 'bool' },
  ];
}

const events: { type: string; detail: unknown }[] = [];
(window as unknown as { events: typeof events }).events = events;
const log = document.querySelector('#log')!;
for (const type of ['search-change', 'filter-change', 'search-filter-change']) {
  document.querySelector('#sf')!.addEventListener(type, (e) => {
    events.push({ type, detail: (e as CustomEvent).detail });
    log.textContent = events.map((x) => `${x.type} ${JSON.stringify(x.detail)}`).join('\n');
  });
}

const sf = document.querySelector('#sf') as LfdlnSearchFilter;
sf.fields = fields;
sf.countFor = (q) => plants.filter((p) => keeps(p, q.search, q.in, q.value)).length;

const list = document.querySelector('#list')!;
const count = document.querySelector('#count')!;
function show(): void {
  sf.sections = sections(sf.search, sf.in, sf.value);
  const rows = plants.filter((p) => keeps(p, sf.search, sf.in, sf.value));
  count.textContent = `${rows.length} plants`;
  list.replaceChildren(...rows.map((p) => {
    const li = document.createElement('li');
    li.textContent = `${p.name} `;
    const meta = document.createElement('span');
    meta.textContent = `${p.kind} · ${p.light} · €${p.price.toFixed(2)} · ${p.owner}`;
    li.append(meta);
    return li;
  }));
}
sf.addEventListener('search-filter-change', show);
show();

// The field inside a form: no counts.
const inForm = document.querySelector('#inform lfdln-search-filter') as LfdlnSearchFilter;
inForm.sections = sections('', '', {});
