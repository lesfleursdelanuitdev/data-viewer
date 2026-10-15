import type { Column } from './types.ts';

// Formatters are slow to make, so each locale + options pair is made once. A locale or option
// the browser doesn't know (a typo such as "en_US" or currency "EURO") must not blank the list:
// the locale falls back to the browser's own, and bad options to `fallback`.
const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

function made<F>(kind: 'n' | 'd', loc: string | undefined, opts: object, make: (l: string | undefined, o: object) => F, fallback: object): F {
  const key = `${kind}|${loc ?? ''}|${JSON.stringify(opts)}`;
  let f = cache.get(key) as F | undefined;
  if (!f) {
    try {
      f = make(loc, opts);
    } catch {
      try {
        f = make(undefined, opts); // the locale was the problem
      } catch {
        f = make(undefined, fallback); // the options were
      }
    }
    cache.set(key, f as Intl.NumberFormat);
  }
  return f;
}

const numberFormat = (loc: string | undefined, opts: Intl.NumberFormatOptions = {}, fallback: Intl.NumberFormatOptions = {}) =>
  made('n', loc, opts, (l, o) => new Intl.NumberFormat(l, o), fallback);
const dateFormat = (loc: string | undefined, opts: Intl.DateTimeFormatOptions) =>
  made('d', loc, opts, (l, o) => new Intl.DateTimeFormat(l, o), { dateStyle: 'medium' });

/** A plain number in `locale` (or the browser's locale when that one isn't known). */
export function formatNumber(n: number, locale?: string): string {
  return numberFormat(locale).format(n);
}

// The text a cell shows (also what search matches). Missing or unreadable values give ''.
export function formatCell<T>(col: Column<T>, row: T, locale?: string): string {
  const raw = col.value ? col.value(row) : (row as Record<string, unknown>)[col.key];
  if (raw === null || raw === undefined || raw === '') return '';
  const loc = col.format?.locale ?? locale; // undefined = the browser's own

  switch (col.type) {
    case 'number': {
      const n = Number(raw);
      return Number.isFinite(n) ? formatNumber(n, loc) : '';
    }
    case 'money': {
      const n = Number(raw);
      if (!Number.isFinite(n)) return '';
      // An unknown currency shows the plain amount: a wrong symbol would be worse than none.
      const plain = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
      return numberFormat(loc, { style: 'currency', currency: col.format?.currency ?? 'USD' }, plain).format(n);
    }
    case 'date': {
      const d = raw instanceof Date ? raw : new Date(raw as string | number);
      if (Number.isNaN(d.getTime())) return '';
      return dateFormat(loc, col.format?.date ?? { dateStyle: 'medium' }).format(d);
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
