import type { Query } from './types.ts';

const keys = ['page', 'search', 'sort', 'dir', 'view', 'size'] as const;

/** A query as the address holds it: the size only when the address names one. */
export type AddressQuery = Omit<Query, 'size'> & { size?: number };

// Read this viewer's state from the address; the prefix lets several viewers share one page.
// The size is only read here (a whole number of at least 1); the viewer checks it against its list.
export function readQuery(params: URLSearchParams, prefix: string): AddressQuery {
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
  return q;
}

// Write the state into params (changed in place and returned). Defaults are left out
// so a fresh viewer has a clean address; other prefixes' keys are never touched.
// The size goes in only when there is a starting size (a picker) and it differs from it.
export function writeQuery(params: URLSearchParams, prefix: string, q: AddressQuery, startSize?: number): URLSearchParams {
  for (const k of keys) params.delete(`${prefix}.${k}`);
  if (q.page > 1) params.set(`${prefix}.page`, String(q.page));
  if (q.search) params.set(`${prefix}.search`, q.search);
  if (q.sort) params.set(`${prefix}.sort`, q.sort);
  if (q.dir === 'desc') params.set(`${prefix}.dir`, 'desc');
  if (q.view) params.set(`${prefix}.view`, q.view);
  if (startSize !== undefined && q.size !== undefined && q.size !== startSize) params.set(`${prefix}.size`, String(q.size));
  return params;
}
