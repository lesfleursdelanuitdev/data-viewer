import type { Column, Query, View } from './types.ts';
import { narrow, rawValue } from './filters.ts';

type SortValue = string | number | null;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

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

export function applyQuery<T>(
  rows: T[],
  cols: Column<T>[],
  q: Query,
  opts: { views?: View<T>[]; searchKeys?: string[]; pageSize: number },
): { rows: T[]; total: number; page: number } {
  // View first, so counts and paging only see its rows; then the search (the "Search in"
  // column, or every searchable one) and the filters.
  let out = narrow(rows, cols, q, opts);

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
