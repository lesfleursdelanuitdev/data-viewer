// Saved views (filter-style="views"), the pure part: reading them from storage, new keys, and
// which saved view the list's state is. The store that uses these (localStorage, events, undo)
// is element/views-store.ts, which only the views add-on bundles.
import type { FilterValue, SavedView } from './types.ts';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * The saved views in a stored string. Bad JSON, a non-array, or entries without a string `key`
 * and `label` and an object `filter` (or with a `search` that is no text) are dropped, and `bad`
 * says so; nothing stored (null) is no views and not bad. Only the known fields are kept.
 */
export function readViews(raw: string | null): { views: SavedView[]; bad: boolean } {
  if (raw === null) return { views: [], bad: false };
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return { views: [], bad: true };
  }
  if (!Array.isArray(list)) return { views: [], bad: true };
  const views: SavedView[] = [];
  for (const v of list) {
    if (!isObject(v) || typeof v.key !== 'string' || typeof v.label !== 'string' || !isObject(v.filter)
      || (v.search !== undefined && typeof v.search !== 'string')) continue;
    const view: SavedView = { key: v.key, label: v.label, filter: v.filter as FilterValue };
    if (v.search !== undefined) view.search = v.search as string;
    views.push(view);
  }
  return { views, bad: views.length !== list.length };
}

/** A new view's key: `u-` and the time in base 36, with -2, -3, … added while it is taken. */
export function viewKey(taken: Set<string>, now = Date.now()): string {
  const base = `u-${now.toString(36)}`;
  let key = base;
  for (let n = 2; taken.has(key); n++) key = `${base}-${n}`;
  return key;
}

// A filter value as one string: keys sorted, values of a choice sorted, and parts that narrow
// nothing (empty choices, empty ranges, undefined) left out.
function canon(filter: FilterValue | undefined): string {
  const out: [string, unknown][] = [];
  for (const key of Object.keys(filter ?? {}).sort()) {
    const v = filter![key];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      if (v.length) out.push([key, [...v].sort()]);
    } else if (typeof v === 'object') {
      const r: [string, unknown][] = Object.entries(v).filter(([, x]) => x !== undefined && x !== '').sort(([a], [b]) => (a < b ? -1 : 1));
      if (r.length) out.push([key, r]);
    } else out.push([key, v]);
  }
  return JSON.stringify(out);
}

/** Whether a saved view and a list state are the same: same filters (key order and empty parts don't matter), same search (trimmed). */
export function sameState(a: { filter: FilterValue; search?: string }, b: { filters?: FilterValue; search: string }): boolean {
  return (a.search ?? '').trim() === b.search.trim() && canon(a.filter) === canon(b.filters);
}

/**
 * The user view that is current (PLANNER CHOICE 1): with no page view set (`view` ''), one whose
 * filters and search equal the list's; the last one picked wins a tie, else the first. Null when
 * none matches or a page view is set.
 */
export function currentUserView(views: SavedView[], q: { view: string; filters?: FilterValue; search: string }, last: string | null): string | null {
  if (q.view) return null;
  const same = views.filter((v) => sameState(v, q));
  return (same.find((v) => v.key === last) ?? same[0])?.key ?? null;
}
