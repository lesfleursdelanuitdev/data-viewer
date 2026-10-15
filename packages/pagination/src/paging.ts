// Paging rules: the page-size choices, the numbered page buttons, and the "Showing" numbers. No DOM here.

// One size: a whole number of rows, at least 1. Anything else is not a size.
function sizeOf(v: unknown): number | undefined {
  if (typeof v !== 'number' && typeof v !== 'string') return undefined;
  if (typeof v === 'string' && !/^\s*\d+(\.\d+)?\s*$/.test(v)) return undefined;
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 1 ? n : undefined;
}

/**
 * The page sizes a visitor may pick from: page-sizes="10,20,50" (commas or spaces) or an array.
 * Junk and anything below 1 are dropped, duplicates go, and the rest are sorted.
 */
export function parsePageSizes(input: unknown): number[] {
  const parts = typeof input === 'string' ? input.split(/[\s,]+/) : Array.isArray(input) ? input : [];
  const sizes = new Set<number>();
  for (const p of parts) {
    const n = sizeOf(p);
    if (n !== undefined) sizes.add(n);
  }
  return [...sizes].sort((a, b) => a - b);
}

/** The picker's sizes with the starting size added in order, or [] when none is valid (no picker). */
export function pageSizeChoices(input: unknown, start: number): number[] {
  const sizes = parsePageSizes(input);
  if (!sizes.length) return [];
  return sizes.includes(start) ? sizes : [...sizes, start].sort((a, b) => a - b);
}

/** After a new page size, the page that keeps the first row the visitor was looking at on screen. */
export function pageAfterResize(page: number, oldSize: number, newSize: number): number {
  const first = (Math.max(1, page) - 1) * oldSize;
  return Math.floor(first / newSize) + 1;
}

/**
 * The numbered buttons: the first page, the last, and the current one with its neighbours, with
 * 'gap' where pages are left out. A gap that would hide a single page shows that page instead.
 * One page or none: no numbers.
 */
export function pageNumbers(page: number, pages: number): (number | 'gap')[] {
  if (pages <= 1) return [];
  const shown = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...shown].sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  let last = 0;
  for (const n of sorted) {
    if (n - last === 2) out.push(n - 1);
    else if (n - last > 2) out.push('gap');
    out.push(n);
    last = n;
  }
  return out;
}

/** A page size that pages: a whole number of at least 1; anything unreadable (NaN, 0, ∞) is 20. */
export function pageSizeOf(n: unknown): number {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v !== 0 ? Math.max(1, v) : 20;
}

/**
 * The "Showing 21–25 of 25" numbers, and how many pages there are. `shown` is how many rows the
 * page really has (a server may send fewer); leave it out to work it out from the total.
 */
export function pageRange(
  page: number,
  pageSize: number,
  total: number,
  shown?: number,
): { from: number; to: number; pages: number } {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const rows = shown ?? Math.max(0, Math.min(pageSize, total - (page - 1) * pageSize));
  if (rows === 0) return { from: 0, to: 0, pages };
  const from = (page - 1) * pageSize + 1;
  return { from, to: from + rows - 1, pages };
}

/** A page number to show: a whole number from 1 to the last page (bad input is page 1). */
export function clampPage(page: unknown, pages: number): number {
  const n = Math.floor(Number(page));
  return Math.min(Math.max(1, Number.isFinite(n) ? n : 1), Math.max(1, pages));
}
