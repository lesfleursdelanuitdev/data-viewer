import type { Query } from '../core/types.ts';
import type { Adapter } from './types.ts';
import { registerAdapter } from './register.ts';
import { getJson, withParams } from './fetch.ts';

/**
 * adapter="pammy": the panel gate's public data API (pammy.org and the lfdln panel), as written in
 * packages/studio/src/gate/data-api.ts of https://github.com/lesfleursdelanuitdev/PammyPanel
 * (read 2026-10-14; the line numbers below are that file's).
 *
 * src is the list's address under "Where programs ask", e.g.
 *   src="/_pammy/api/data/postgres/recipes/recipes"   (/_pammy/api/data/:engine/:name/:resource)
 * Filters may be written into src (?where.published=true); they are kept.
 *
 * Its list parameters (data-api.ts:249-277):
 *   page    1-based, default 1 (capped at 100000)
 *   per     rows per page, default 20 (rows.ts PAGE), at most 100 (MAX_PER_PAGE, :42)
 *   sort    a column the catalog marks sortable; anything else silently falls back to the key
 *   dir     'desc', or ascending otherwise
 *   search  free text (first 200 characters), over the catalog's searchable columns; ignored
 *           when the table has search switched off
 *   where.<column>=value  equality filters (up to 10)
 * There are no views, so the query's `view` is not sent. Its only filter is one exact value per
 * column, so the adapter says `supports: { filters: 'equals', searchIn: false, facets: false }`:
 * the viewer then offers single choices only, and a choice goes as where.<key>=value.
 *
 * Its answer (:283): { resource, rich, page, per, total, items }. It pages and searches on the
 * server, so this adapter returns { rows: items, total }: server mode. An error is a non-2xx
 * with { error, message }; the message goes into the thrown Error.
 * It sends the page's cookies, so a signed-in visitor sees what they may see.
 */
export const pammyAdapter: Adapter = {
  supports: { filters: 'equals', searchIn: false, facets: false },
  async load(q: Query, { signal, src, pageSize }) {
    if (!src.trim()) throw new Error('adapter="pammy" needs src: the list\'s address under "Where programs ask"');
    const params: Record<string, string> = {};
    if (q.page > 1) params.page = String(q.page);
    // Always say the page size: the viewer pages by it, and the API's default may differ. The
    // API sends 100 rows at most, so larger sizes ask for 100 (keep page-size(s) at 100 or less).
    params.per = String(Math.min(100, Math.max(1, Math.floor(q.size || pageSize || 20))));
    if (q.search) params.search = q.search;
    if (q.sort) params.sort = q.sort;
    if (q.dir === 'desc') params.dir = 'desc';
    for (const [key, v] of Object.entries(q.filters ?? {})) {
      if (Array.isArray(v) && v[0] !== undefined) params[`where.${key}`] = v[0];
    }
    const body = (await getJson(withParams(src, params), signal)) as { items?: unknown; total?: unknown } | null;
    if (!body || !Array.isArray(body.items)) throw new Error(`Couldn't load ${src}: the answer is not a list`);
    return { rows: body.items, total: Number(body.total) || 0 };
  },
};

registerAdapter('pammy', pammyAdapter);
