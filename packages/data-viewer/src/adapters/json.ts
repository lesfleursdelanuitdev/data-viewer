import type { Query } from '../core/types.ts';
import type { Adapter } from './types.ts';
import { registerAdapter } from './register.ts';
import { getJson, withParams } from './fetch.ts';

/**
 * adapter="json": GET src?page&search&sort&dir&view&size (only the ones that differ from the
 * defaults: page 1, ascending, size 20; so with the default page size the first load asks for src
 * as written). The answer is either an array (all rows: browser mode) or { rows, total } (one page: server mode; no total means browser mode too).
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
    const body = await getJson(withParams(src, params), signal);
    if (Array.isArray(body)) return { rows: body };
    const b = body as { rows?: unknown; total?: unknown } | null;
    if (b && Array.isArray(b.rows)) {
      // PHP/PDO and some drivers send counts as strings ("45"): any finite number counts.
      const total = typeof b.total === 'number' || (typeof b.total === 'string' && b.total.trim() !== '')
        ? Number(b.total) : NaN;
      return Number.isFinite(total) ? { rows: b.rows, total } : { rows: b.rows };
    }
    throw new Error(`Couldn't load ${src}: the answer is not a list`);
  },
};

registerAdapter('json', jsonAdapter);
