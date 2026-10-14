import type { Column } from './types.ts';

// The text a cell shows (also what search matches). Missing or unreadable values give ''.
export function formatCell<T>(col: Column<T>, row: T, locale?: string): string {
  const raw = col.value ? col.value(row) : (row as Record<string, unknown>)[col.key];
  if (raw === null || raw === undefined || raw === '') return '';
  const loc = col.format?.locale ?? locale; // undefined = the browser's own

  switch (col.type) {
    case 'number': {
      const n = Number(raw);
      return Number.isFinite(n) ? new Intl.NumberFormat(loc).format(n) : '';
    }
    case 'money': {
      const n = Number(raw);
      if (!Number.isFinite(n)) return '';
      return new Intl.NumberFormat(loc, { style: 'currency', currency: col.format?.currency ?? 'USD' }).format(n);
    }
    case 'date': {
      const d = raw instanceof Date ? raw : new Date(raw as string | number);
      if (Number.isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat(loc, col.format?.date ?? { dateStyle: 'medium' }).format(d);
    }
    case 'bool':
      return raw ? 'Yes' : 'No';
    case 'tags':
      return (Array.isArray(raw) ? raw : [raw]).map(plainText).filter(Boolean).join(', ');
    default:
      return plainText(raw);
  }
}

// Plain text for one value; NaN, Infinity and objects would print as junk, so they are empty.
function plainText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (typeof v === 'object') return v instanceof Date && !Number.isNaN(v.getTime()) ? v.toString() : '';
  return String(v);
}
