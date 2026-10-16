// Searchable and filterable columns: which columns search looks at, the filter's sections built
// from the columns (with options and counts from the rows in browser mode), and matching a row
// against the applied filters. No DOM here.
import type { FilterOption, FilterSection, FilterValue } from '@lesfleursdelanuitdev/filter';
import type { AdapterSupports, Column, Query, View } from './types.ts';

export function rawValue<T>(col: Column<T>, row: T): unknown {
  return col.value ? col.value(row) : (row as Record<string, unknown>)[col.key];
}

/** The columns search looks at: the ones marked searchable, else searchKeys, else all of them. */
export function searchColumns<T>(cols: Column<T>[], searchKeys?: string[]): Column<T>[] {
  const marked = cols.filter((c) => c.searchable);
  if (marked.length) return marked;
  if (searchKeys) return searchKeys.map((k) => cols.find((c) => c.key === k) ?? { key: k, label: k });
  return cols;
}

/** The filter kind a column gets from its type; null for an image, which is never filterable. */
export function filterKind<T>(col: Column<T>): FilterSection['kind'] | null {
  switch (col.type) {
    case 'number':
    case 'money':
    case 'date':
      return 'range';
    case 'bool':
      return 'bool';
    case 'image':
      return null;
    default:
      return 'choice';
  }
}

/**
 * The values a cell offers a choice: trimmed strings, with empty, null and missing ones left out.
 * A tags cell gives each tag (from an array or a comma string).
 */
export function cellValues<T>(col: Column<T>, row: T): string[] {
  const v = rawValue(col, row);
  const one = (x: unknown) => (x === null || x === undefined || typeof x === 'object' ? '' : String(x).trim());
  const list = Array.isArray(v)
    ? v.map(one)
    : col.type === 'tags' && typeof v === 'string'
      ? v.split(',').map((x) => x.trim())
      : [v instanceof Date ? v.toISOString().slice(0, 10) : one(v)];
  return [...new Set(list.filter(Boolean))];
}

// A number from a cell or a box: "12.50" is 12.5; empty and junk are null.
function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string' || !v.trim()) return null;
  const n = Number(v.trim());
  return Number.isFinite(n) ? n : null;
}

// A date as the start and end of its period, in ms: "1950" is the whole year, "1950-06" the month.
function period(v: unknown): [number, number] | null {
  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isNaN(t) ? null : [t, t];
  }
  if (typeof v === 'number') return Number.isFinite(v) ? [v, v] : null;
  if (typeof v !== 'string' || !v.trim()) return null;
  const s = v.trim();
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(s);
  if (m) {
    const y = Number(m[1]);
    if (!m[2]) return [Date.UTC(y, 0, 1), Date.UTC(y + 1, 0, 1) - 1];
    const mo = Number(m[2]) - 1;
    if (!m[3]) return [Date.UTC(y, mo, 1), Date.UTC(y, mo + 1, 1) - 1];
    const d = Number(m[3]);
    return [Date.UTC(y, mo, d), Date.UTC(y, mo, d + 1) - 1];
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : [t, t];
}

// Yes or no from a cell: "no", "false" and "0" are no; empty and missing are neither.
function toBool(v: unknown): boolean | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (!s) return null;
    return !['no', 'false', '0', 'n', 'off'].includes(s);
  }
  return Boolean(v);
}

/**
 * Whether a row passes the filters: every set filter must match (AND), a choice matches when the
 * cell has any of its values (OR; any tag of a tags cell), a range compares numbers, or dates by
 * the start of their period ("1950" is the whole year). A cell with no value never matches a set
 * filter; a value that is no option matches nothing. Keys with no column narrow nothing.
 */
export function matchesFilters<T>(row: T, cols: Column<T>[], filters: FilterValue): boolean {
  for (const [key, f] of Object.entries(filters)) {
    const col = cols.find((c) => c.key === key);
    if (!col) continue;
    if (Array.isArray(f)) {
      if (!f.length) continue;
      const have = cellValues(col, row);
      if (!f.some((x) => have.includes(x))) return false;
    } else if (typeof f === 'boolean') {
      if (toBool(rawValue(col, row)) !== f) return false;
    } else if (f && typeof f === 'object') {
      const from = (f.from ?? '').trim();
      const to = (f.to ?? '').trim();
      if (!from && !to) continue;
      if (col.type === 'date') {
        const cell = period(rawValue(col, row));
        if (!cell) return false;
        const lo = from ? period(from) : null;
        const hi = to ? period(to) : null;
        if (lo && cell[0] < lo[0]) return false;
        if (hi && cell[0] > hi[1]) return false;
      } else {
        const n = toNumber(rawValue(col, row));
        if (n === null) return false;
        const lo = toNumber(from);
        const hi = toNumber(to);
        if (lo !== null && n < lo) return false;
        if (hi !== null && n > hi) return false;
      }
    }
  }
  return true;
}

// Search: the text one cell offers.
function searchText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(searchText).join(' ');
  if (v instanceof Date) return v.toISOString();
  return typeof v === 'object' ? '' : String(v);
}

/** The columns a query's search looks at: its "Search in" column when that one is searchable. */
export function searchedColumns<T>(cols: Column<T>[], q: Pick<Query, 'searchIn'>, searchKeys?: string[]): Column<T>[] {
  const all = searchColumns(cols, searchKeys);
  const one = q.searchIn ? all.find((c) => c.key === q.searchIn) : undefined;
  return one ? [one] : all;
}

/** The rows a query's view, search and filters leave (filters other than `except`, if given). */
export function narrow<T>(
  rows: T[],
  cols: Column<T>[],
  q: Pick<Query, 'view' | 'search' | 'searchIn' | 'filters'>,
  opts: { views?: View<T>[]; searchKeys?: string[]; except?: string },
): T[] {
  let out = rows;
  const where = opts.views?.find((v) => v.key === q.view)?.where;
  if (where) out = out.filter(where);
  const needle = q.search.trim().toLowerCase();
  if (needle) {
    const searched = searchedColumns(cols, q, opts.searchKeys);
    out = out.filter((row) => searched.some((c) => searchText(rawValue(c, row)).toLowerCase().includes(needle)));
  }
  const filters = { ...q.filters };
  if (opts.except !== undefined) delete filters[opts.except];
  if (Object.keys(filters).length) out = out.filter((row) => matchesFilters(row, cols, filters));
  return out;
}

/** How many rows a query's view, search and filters leave. */
export function countMatching<T>(
  rows: T[],
  cols: Column<T>[],
  q: Pick<Query, 'view' | 'search' | 'searchIn' | 'filters'>,
  opts: { views?: View<T>[]; searchKeys?: string[] },
): number {
  return narrow(rows, cols, q, opts).length;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const optionOf = (o: string | FilterOption): FilterOption => (typeof o === 'string' ? { value: o, label: o } : { label: o.value, ...o });

/**
 * The filter's sections, one per filterable column (in column order). Browser mode (`rows`
 * given): a choice lists the values in the view's rows (or the column's own options first, in
 * their order), each counted over the rows the view, the search and the other filters leave.
 * Server mode: a choice takes `facets`, else the column's options without counts, else is left
 * out. With `supports.filters === 'equals'` only choices are made, each single. Range counts and
 * the histogram are built only with `rangeCounts` (a filter style asks for them; today's dialog
 * shows neither, so it makes no extra passes over the rows).
 */
export function filterSections<T>(cols: Column<T>[], opts: {
  rows?: T[];
  facets?: Record<string, FilterOption[]>;
  supports?: AdapterSupports;
  q: Pick<Query, 'view' | 'search' | 'searchIn' | 'filters'>;
  views?: View<T>[];
  searchKeys?: string[];
  rangeCounts?: boolean;
}): FilterSection[] {
  const equals = opts.supports?.filters === 'equals';
  const out: FilterSection[] = [];
  // The sentence's words for a section, when the column has them.
  const push = (s: FilterSection, col: Column<T>) => {
    for (const k of ['phrase', 'phraseAny', 'plural'] as const) if (col[k]) s[k] = col[k] as never;
    out.push(s);
  };
  for (const col of cols) {
    if (!col.filterable) continue;
    const kind = filterKind(col);
    if (!kind || (equals && kind !== 'choice')) continue;
    if (kind === 'bool') {
      const s: FilterSection = { key: col.key, label: col.label, kind };
      if (col.hint) s.hint = col.hint;
      push(s, col);
    } else if (kind === 'range') {
      const s: FilterSection = { key: col.key, label: col.label, kind, type: col.type === 'date' ? 'date' : col.type === 'money' ? 'money' : 'number' };
      if (col.ranges?.length) s.ranges = col.ranges;
      if (opts.rows && opts.rangeCounts) {
        // Counts and the histogram are over the rows the other filters leave (this one's own is skipped).
        const pool = narrow(opts.rows, cols, opts.q, { views: opts.views, searchKeys: opts.searchKeys, except: col.key });
        if (s.ranges) s.ranges = s.ranges.map((r) => {
          const range: { from?: string; to?: string } = {};
          if (r.from !== undefined) range.from = r.from;
          if (r.to !== undefined) range.to = r.to;
          return { ...r, count: pool.filter((row) => matchesFilters(row, cols, { [col.key]: range })).length };
        });
        if (s.type !== 'date') {
          const nums = pool.map((row) => toNumber(rawValue(col, row))).filter((n): n is number => n !== null);
          // A loop, not Math.min(...nums): spreading throws RangeError past ~125k rows.
          let from = Infinity;
          let to = -Infinity;
          for (const n of nums) {
            if (n < from) from = n;
            if (n > to) to = n;
          }
          if (to > from) {
            const buckets = new Array<number>(12).fill(0);
            const width = (to - from) / 12;
            for (const v of nums) buckets[Math.min(11, Math.floor((v - from) / width))]!++;
            s.histogram = { from, to, buckets };
          }
        }
      }
      if (col.format?.currency || col.format?.locale) {
        s.format = {};
        if (col.format.currency) s.format.currency = col.format.currency;
        if (col.format.locale) s.format.locale = col.format.locale;
      }
      push(s, col);
    } else {
      let options: FilterOption[] | undefined;
      if (opts.rows) {
        const own = (col.options ?? []).map(optionOf);
        const listed = new Set(own.map((o) => o.value));
        const pool = narrow(opts.rows, cols, { view: opts.q.view, search: '', filters: {} }, { views: opts.views });
        const found: string[] = [];
        for (const row of pool) for (const v of cellValues(col, row)) if (!listed.has(v)) {
          listed.add(v);
          found.push(v);
        }
        found.sort(collator.compare);
        const counts = new Map<string, number>();
        for (const row of narrow(opts.rows, cols, opts.q, { views: opts.views, searchKeys: opts.searchKeys, except: col.key })) {
          for (const v of cellValues(col, row)) counts.set(v, (counts.get(v) ?? 0) + 1);
        }
        options = [...own, ...found.map((v) => ({ value: v, label: v }))].map((o) => ({ ...o, count: counts.get(o.value) ?? 0 }));
      } else if (opts.facets?.[col.key]) {
        options = opts.facets[col.key];
      } else if (col.options?.length) {
        options = col.options.map(optionOf);
      }
      if (!options) continue;
      const s: FilterSection = { key: col.key, label: col.label, kind, options };
      if (equals) s.single = true;
      push(s, col);
    }
  }
  return out;
}

/** options="A,B" from a column attribute; undefined when there are none. */
export function parseOptions(attr: string | null | undefined): string[] | undefined {
  const list = (attr ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  return list.length ? list : undefined;
}

// "a:b, c:d" as [a, b] pairs, split at each part's last ":"; parts with none are left out.
function pairs(attr: string | null | undefined): [string, string][] {
  return (attr ?? '').split(',').filter((p) => p.includes(':')).map((p) => {
    const at = p.lastIndexOf(':');
    return [p.slice(0, at).trim(), p.slice(at + 1).trim()];
  });
}

/** ranges="1900s:1900..1999,Recent:2020.." from a column attribute; bad parts are left out. */
export function parseRanges(attr: string | null | undefined): { label: string; from?: string; to?: string }[] | undefined {
  const out: { label: string; from?: string; to?: string }[] = [];
  for (const [label, span] of pairs(attr)) {
    const dots = span.indexOf('..');
    if (!label || dots < 0) continue;
    const r: { label: string; from?: string; to?: string } = { label };
    const from = span.slice(0, dots).trim();
    const to = span.slice(dots + 2).trim();
    if (from) r.from = from;
    if (to) r.to = to;
    if (from || to) out.push(r);
  }
  return out.length ? out : undefined;
}

/** plural="Perennial:perennials,Fern:ferns" from a column attribute; bad parts are left out. */
export function parsePlural(attr: string | null | undefined): Record<string, string> | undefined {
  const list = pairs(attr).filter(([value, noun]) => value && noun);
  return list.length ? Object.fromEntries(list) : undefined;
}
