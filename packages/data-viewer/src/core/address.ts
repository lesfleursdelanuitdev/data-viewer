import type { FilterValue } from '@lesfleursdelanuitdev/filter';
import type { Query } from './types.ts';

const keys = ['page', 'search', 'sort', 'dir', 'view', 'size', 'in'] as const;

/** A query as the address holds it: the size only when the address names one. */
export type AddressQuery = Omit<Query, 'size'> & { size?: number };

/** How each filter is written in the address; without it the value's shape decides. */
export type FilterKinds = Record<string, 'choice' | 'range' | 'bool'>;

/**
 * A filter's value as the address (and the json adapter) writes it: a choice "a,b" (each value
 * URL-encoded, so a comma inside one is %2C), a range "from..to" (either end may be empty), yes /
 * no. '' when it narrows nothing.
 */
export function filterParam(v: FilterValue[string]): string {
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (Array.isArray(v)) return v.map(encodeURIComponent).join(',');
  const from = (v?.from ?? '').trim();
  const to = (v?.to ?? '').trim();
  return from || to ? `${encodeURIComponent(from)}..${encodeURIComponent(to)}` : '';
}

const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s; // a broken escape: keep it as written
  }
};

function readFilter(raw: string, kind: FilterKinds[string] | undefined): FilterValue[string] | undefined {
  const k = kind ?? (raw === 'yes' || raw === 'no' ? 'bool' : /^[^,]*\.\.[^,]*$/.test(raw) ? 'range' : 'choice');
  if (k === 'bool') return raw === 'yes' ? true : raw === 'no' ? false : undefined;
  if (k === 'range') {
    const at = raw.indexOf('..');
    if (at < 0) return undefined;
    const r: { from?: string; to?: string } = {};
    const from = decode(raw.slice(0, at)).trim();
    const to = decode(raw.slice(at + 2)).trim();
    if (from) r.from = from;
    if (to) r.to = to;
    return from || to ? r : undefined;
  }
  const list = raw.split(',').map(decode).filter((x) => x !== '');
  return list.length ? list : undefined;
}

// Read this viewer's state from the address; the prefix lets several viewers share one page.
// The size is only read here (a whole number of at least 1); the viewer checks it against its list.
// "Search in" and the filters are only there when set.
export function readQuery(params: URLSearchParams, prefix: string, kinds?: FilterKinds): AddressQuery {
  const get = (k: string) => params.get(`${prefix}.${k}`) ?? '';
  const page = Number(get('page'));
  const q: AddressQuery = {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    search: get('search'),
    sort: get('sort'),
    dir: get('dir') === 'desc' ? 'desc' : 'asc',
    view: get('view'),
  };
  const size = /^\d+$/.test(get('size')) ? Number(get('size')) : 0;
  if (size >= 1) q.size = size;
  const searchIn = get('in').trim();
  if (searchIn) q.searchIn = searchIn;
  const f = `${prefix}.f.`;
  const filters: FilterValue = {};
  for (const [name, raw] of params) {
    if (!name.startsWith(f) || name.length === f.length) continue;
    const key = name.slice(f.length);
    const v = readFilter(raw, kinds?.[key]);
    if (v !== undefined) filters[key] = v;
  }
  if (Object.keys(filters).length) q.filters = filters;
  return q;
}

// Write the state into params (changed in place and returned). Defaults are left out
// so a fresh viewer has a clean address; other prefixes' keys are never touched.
// The size goes in only when there is a starting size (a picker) and it differs from it.
export function writeQuery(params: URLSearchParams, prefix: string, q: AddressQuery, startSize?: number): URLSearchParams {
  for (const k of keys) params.delete(`${prefix}.${k}`);
  for (const name of [...params.keys()]) if (name.startsWith(`${prefix}.f.`)) params.delete(name);
  if (q.page > 1) params.set(`${prefix}.page`, String(q.page));
  if (q.search) params.set(`${prefix}.search`, q.search);
  if (q.sort) params.set(`${prefix}.sort`, q.sort);
  if (q.dir === 'desc') params.set(`${prefix}.dir`, 'desc');
  if (q.view) params.set(`${prefix}.view`, q.view);
  if (startSize !== undefined && q.size !== undefined && q.size !== startSize) params.set(`${prefix}.size`, String(q.size));
  if (q.searchIn) params.set(`${prefix}.in`, q.searchIn);
  for (const [key, v] of Object.entries(q.filters ?? {})) {
    const text = filterParam(v);
    if (text) params.set(`${prefix}.f.${key}`, text);
  }
  return params;
}
