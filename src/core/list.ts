import type { Column, Query, View } from './types.ts';

type SortValue = string | number | null;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function rawValue<T>(col: Column<T>, row: T): unknown {
  return col.value ? col.value(row) : (row as Record<string, unknown>)[col.key];
}

// What a column sorts by. Anything missing or unreadable is null, which sorts last.
export function sortValue<T>(col: Column<T>, row: T): SortValue {
  const v = rawValue(col, row);
  if (v === null || v === undefined || v === '') return null;
  switch (col.type) {
    case 'number':
    case 'money': {
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    }
    case 'date': {
      const t = v instanceof Date ? v.getTime() : typeof v === 'number' ? v : Date.parse(String(v));
      return Number.isNaN(t) ? null : t;
    }
    case 'bool':
      return v ? 1 : 0;
    default:
      return Array.isArray(v) ? v.join(' ') : String(v);
  }
}

function compare(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

// The text search looks at for one cell.
function searchText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(searchText).join(' ');
  if (v instanceof Date) return v.toISOString();
  return typeof v === 'object' ? '' : String(v);
}

export function applyQuery<T>(
  rows: T[],
  cols: Column<T>[],
  q: Query,
  opts: { views?: View<T>[]; searchKeys?: string[]; pageSize: number },
): { rows: T[]; total: number; page: number } {
  let out = rows;

  // View first, so counts and paging only see its rows.
  const where = opts.views?.find((v) => v.key === q.view)?.where;
  if (where) out = out.filter(where);

  const needle = q.search.trim().toLowerCase();
  if (needle) {
    const searched = opts.searchKeys
      ? opts.searchKeys.map((k) => cols.find((c) => c.key === k) ?? { key: k, label: k })
      : cols;
    out = out.filter((row) => searched.some((c) => searchText(rawValue(c, row)).toLowerCase().includes(needle)));
  }

  const sortCol = q.sort ? cols.find((c) => c.key === q.sort) : undefined;
  if (sortCol) {
    const sign = q.dir === 'desc' ? -1 : 1;
    // Decorate once so each row's value is read a single time; Array.sort is stable.
    const keyed = out.map((row) => ({ row, v: sortValue(sortCol, row) }));
    keyed.sort((a, b) => {
      if (a.v === null || b.v === null) return a.v === b.v ? 0 : a.v === null ? 1 : -1; // missing last either way
      return sign * compare(a.v, b.v);
    });
    out = keyed.map((k) => k.row);
  }

  const total = out.length;
  const pages = Math.max(1, Math.ceil(total / opts.pageSize));
  const page = Math.min(Math.max(1, Math.floor(q.page) || 1), pages);
  const start = (page - 1) * opts.pageSize;
  return { rows: out.slice(start, start + opts.pageSize), total, page };
}

// "21-25 of 25" numbers, and how many pages there are.
export function pageRange(
  page: number,
  pageSize: number,
  total: number,
  shown: number,
): { from: number; to: number; pages: number } {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (shown === 0) return { from: 0, to: 0, pages };
  const from = (page - 1) * pageSize + 1;
  return { from, to: from + shown - 1, pages };
}
