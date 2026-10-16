// The selection: ticked keys in the order they were ticked, or "all matching" minus except.
// Pure functions, no DOM; each returns a new selection (or the same one when nothing changes).

export type Selection = { keys: string[]; all: boolean; except: string[] };

export const NONE: Selection = Object.freeze({ keys: [], all: false, except: [] }) as Selection;

/** A row's key: rowKey names a field (default 'id') or reads it; '', null and undefined are no key. */
export function keyOf<T>(row: T, rowKey: string | ((row: T) => string) | undefined): string | undefined {
  const v = typeof rowKey === 'function' ? rowKey(row) : (row as Record<string, unknown> | null)?.[rowKey || 'id'];
  return v === '' || v === null || v === undefined ? undefined : String(v);
}

export function ticked(s: Selection, key: string): boolean {
  return s.all ? !s.except.includes(key) : s.keys.includes(key);
}

const without = (list: string[], drop: string[]) => list.filter((k) => !drop.includes(k));
const adding = (list: string[], add: string[]) => [...list, ...without(add, list)];

/** Ticks or unticks one key. Under "all", an untick goes into except and a tick takes it out. */
export function tick(s: Selection, key: string, on: boolean): Selection {
  const flip = (list: string[], add: boolean) => (add ? adding : without)(list, [key]);
  return { keys: flip(s.keys, on), all: s.all, except: s.all ? flip(s.except, !on) : s.except };
}

/** The header box's state over the page's tickable keys. */
export function pageState(s: Selection, pageKeys: string[]): 'none' | 'some' | 'all' {
  const n = pageKeys.filter((k) => ticked(s, k)).length;
  return n === 0 ? 'none' : n === pageKeys.length ? 'all' : 'some';
}

export function tickPage(s: Selection, pageKeys: string[], on: boolean): Selection {
  return pageKeys.reduce((acc, k) => tick(acc, k, on), s);
}

/** "Select all matching": every row the query matches, the page's keys added to those seen. */
export function tickAll(s: Selection, pageKeys: string[]): Selection {
  return { keys: adding(s.keys, pageKeys), all: true, except: [] };
}

/** Under "all", a new page's keys join those seen (not the excepted ones). */
export function seen(s: Selection, pageKeys: string[]): Selection {
  if (!s.all) return s;
  return { ...s, keys: adding(s.keys, without(pageKeys, s.except)) };
}

/** Drops keys and except entries whose rows are gone. */
export function keep(s: Selection, present: Set<string>): Selection {
  const has = (k: string) => present.has(k);
  return { ...s, keys: s.keys.filter(has), except: s.except.filter(has) };
}

/** How many are ticked: under "all" with a known total, that total minus except; else the keys. */
export function countOf(s: Selection, matching: number | null): number {
  return s.all && matching !== null ? Math.max(0, matching - s.except.length) : s.keys.length;
}

/** What a selection belongs to: the search, "Search in", filters and view (not sort or paging). */
export function scopeOf(q: { search?: string; searchIn?: string; filters?: unknown; view?: string }): string {
  return JSON.stringify([q.search ?? '', q.searchIn ?? '', q.filters ?? {}, q.view ?? '']);
}
