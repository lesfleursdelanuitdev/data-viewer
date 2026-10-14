import type { Query } from '../core/types.ts';
import type { Adapter } from './types.ts';
import { registerAdapter } from './register.ts';
import { getJson, withParams } from './fetch.ts';

/**
 * adapter="json": GET src?page&search&sort&dir&view (only the ones that differ from the
 * default, so the first load asks for src as written). The answer is either an array (all rows:
 * browser mode) or { rows, total } (one page: server mode; no total means browser mode too).
 */
export const jsonAdapter: Adapter = {
  async load(q: Query, { signal, src }) {
    const params: Record<string, string> = {};
    if (q.page > 1) params.page = String(q.page);
    if (q.search) params.search = q.search;
    if (q.sort) params.sort = q.sort;
    if (q.dir === 'desc') params.dir = 'desc';
    if (q.view) params.view = q.view;
    const body = await getJson(withParams(src, params), signal);
    if (Array.isArray(body)) return { rows: body };
    const b = body as { rows?: unknown; total?: unknown } | null;
    if (b && Array.isArray(b.rows)) {
      return typeof b.total === 'number' ? { rows: b.rows, total: b.total } : { rows: b.rows };
    }
    throw new Error(`Couldn't load ${src}: the answer is not a list`);
  },
};

registerAdapter('json', jsonAdapter);
