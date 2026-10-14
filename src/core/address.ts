import type { Query } from './types.ts';

const keys = ['page', 'search', 'sort', 'dir', 'view'] as const;

// Read this viewer's state from the address; the prefix lets several viewers share one page.
export function readQuery(params: URLSearchParams, prefix: string): Query {
  const get = (k: string) => params.get(`${prefix}.${k}`) ?? '';
  const page = Number(get('page'));
  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    search: get('search'),
    sort: get('sort'),
    dir: get('dir') === 'desc' ? 'desc' : 'asc',
    view: get('view'),
  };
}

// Write the state into params (changed in place and returned). Defaults are left out
// so a fresh viewer has a clean address; other prefixes' keys are never touched.
export function writeQuery(params: URLSearchParams, prefix: string, q: Query): URLSearchParams {
  for (const k of keys) params.delete(`${prefix}.${k}`);
  if (q.page > 1) params.set(`${prefix}.page`, String(q.page));
  if (q.search) params.set(`${prefix}.search`, q.search);
  if (q.sort) params.set(`${prefix}.sort`, q.sort);
  if (q.dir === 'desc') params.set(`${prefix}.dir`, 'desc');
  if (q.view) params.set(`${prefix}.view`, q.view);
  return params;
}
