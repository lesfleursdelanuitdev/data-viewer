import type { Query } from '../core/types.ts';
import type { Adapter } from './types.ts';
import { registerAdapter } from './register.ts';
import { getJson, withParams } from './fetch.ts';
import { filterParam } from '../core/address.ts';
import type { FilterOption } from '../core/types.ts';

// Facets as an answer gives them: only lists, only options with a string value.
function facetsOf(raw: unknown): Record<string, FilterOption[]> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, FilterOption[]> = {};
  for (const [key, list] of Object.entries(raw)) {
    if (!Array.isArray(list)) continue;
    out[key] = list.filter((o): o is FilterOption =>
      Boolean(o) && typeof o === 'object' && typeof (o as FilterOption).value === 'string');
  }
  return out;
}

/**
 * adapter="json": GET src?page&search&sort&dir&view&size (only the ones that differ from the
 * defaults: page 1, ascending, size 20; so with the default page size the first load asks for src
 * as written), plus `in` ("Search in") and `f.<key>` for each filter, written as the address writes
 * them: a choice "a,b" with each value URL-encoded (split on the commas, then decode each), a
 * range "from..to", yes / no. The answer is either an array (all rows: browser mode) or
 * { rows, total, facets? } (one page: server mode; no total means browser mode too).
 */
export const jsonAdapter: Adapter = {
  async load(q: Query, { signal, src }) {
    if (!src.trim()) throw new Error('adapter="json" needs src: the address to load from');
    const params: Record<string, string> = {};
    if (q.page > 1) params.page = String(q.page);
    if (q.search) params.search = q.search;
    if (q.sort) params.sort = q.sort;
    if (q.dir === 'desc') params.dir = 'desc';
    if (q.view) params.view = q.view;
    // The rows per page, when it isn't the viewer's default (a page-size picker, or page-size).
    if (q.size && q.size !== 20) params.size = String(q.size);
    if (q.searchIn) params.in = q.searchIn;
    for (const [key, v] of Object.entries(q.filters ?? {})) {
      const text = filterParam(v);
      if (text) params[`f.${key}`] = text;
    }
    const body = await getJson(withParams(src, params), signal);
    if (Array.isArray(body)) return { rows: body };
    const b = body as { rows?: unknown; total?: unknown; facets?: unknown } | null;
    if (b && Array.isArray(b.rows)) {
      // PHP/PDO and some drivers send counts as strings ("45"): any finite number counts.
      const total = typeof b.total === 'number' || (typeof b.total === 'string' && b.total.trim() !== '')
        ? Number(b.total) : NaN;
      const facets = facetsOf(b.facets);
      const out = Number.isFinite(total) ? { rows: b.rows, total } : { rows: b.rows };
      return facets ? { ...out, facets } : out;
    }
    throw new Error(`Couldn't load ${src}: the answer is not a list`);
  },
};

registerAdapter('json', jsonAdapter);
