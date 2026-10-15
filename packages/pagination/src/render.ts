import { html, nothing, type TemplateResult } from 'lit';
import { live } from 'lit/directives/live.js';
import { pageNumbers, pageRange } from './paging.ts';

export type Pager = 'simple' | 'numbers';

/** Every piece of text the pager shows. The numbers handed in are already formatted. */
export type PaginationWords = {
  pages: string; // the <nav>'s name
  previous: string;
  next: string;
  empty: string; // what the live region says when there is nothing to page through
  showing: (from: string, to: string, total: string) => string;
  pageOf: (page: string, pages: string) => string;
  pageNumbers: string;
  pageNumber: (page: string) => string;
  rowsPerPage: string;
};

export const defaultPaginationWords: PaginationWords = {
  pages: 'Pages',
  previous: 'Previous',
  next: 'Next',
  empty: 'Nothing to show.',
  showing: (from, to, total) => `Showing ${from}–${to} of ${total}`,
  pageOf: (page, pages) => `Page ${page} of ${pages}`,
  pageNumbers: 'Page numbers',
  pageNumber: (page) => `Page ${page}`,
  rowsPerPage: 'Rows per page',
};

/** What one drawing of the pager shows. */
export type PaginationView = {
  page: number; // the current page, already within 1 … pages
  size: number; // rows per page in use
  total: number;
  shown?: number; // rows really on this page (a server may send fewer); default from the total
  pager?: Pager; // 'simple' (Previous / Next) or 'numbers'
  sizes?: number[]; // the "Rows per page" choices; fewer than two: no picker
  label?: string; // the <nav>'s name, else words.pages
  words: PaginationWords;
  format?: (n: number) => string; // numbers for the locale
};

export type PaginationHandlers = {
  /**
   * Previous or Next (`number` false) or a page number (`number` true) was pressed. Call
   * focusCurrentPage(nav, number) once the new page is drawn.
   */
  onPage: (page: number, number: boolean) => void;
  /** A new size was picked from "Rows per page". */
  onSize: (size: number) => void;
};

/**
 * The pager: the one drawing shared by <lfdln-pagination> and the data viewer. A polite live
 * region says "Showing 41–50 of 120 · Page 5 of 12"; Previous and Next; with pager="numbers",
 * numbered buttons (the current page is no button) that collapse to "Page 5 of 12" on a phone;
 * and "Rows per page" when there are sizes to pick from.
 */
export function renderPagination(v: PaginationView, on: PaginationHandlers): TemplateResult {
  const w = v.words;
  const num = v.format ?? String;
  const label = v.label || w.pages;
  const picker = renderPicker(v, on);
  // With nothing to page through, only the live region stays (so "Nothing to show." is still
  // announced); the host shows its own empty box, which screen readers may skip.
  if (v.total === 0) {
    return html`<nav class="lfdln-pagination-nav" aria-label=${label}><span role="status" aria-live="polite"
      class="lfdln-pagination-status lfdln-pagination-sr">${w.empty}</span>${picker}</nav>`;
  }
  const page = v.page;
  const r = pageRange(page, v.size, v.total, v.shown);
  const pageOf = w.pageOf(num(page), num(r.pages));
  const status = html`<span role="status" aria-live="polite" class="lfdln-pagination-status">${w.showing(num(r.from), num(r.to), num(v.total))}<span
    class="lfdln-pagination-sep" aria-hidden="true"> · </span><span class="lfdln-pagination-sr">, </span><span
    class="lfdln-pagination-page">${pageOf}</span></span>`;
  const numbers = v.pager === 'numbers' ? pageNumbers(page, r.pages) : [];
  const arrow = (a: string) => (numbers.length ? html`<span aria-hidden="true">${a}</span>` : nothing);
  const prev = html`<button type="button" ?disabled=${page <= 1}
    @click=${() => on.onPage(page - 1, false)}>${arrow('‹ ')}${w.previous}</button>`;
  const next = html`<button type="button" ?disabled=${page >= r.pages}
    @click=${() => on.onPage(page + 1, false)}>${w.next}${arrow(' ›')}</button>`;
  if (!numbers.length) {
    return html`<nav class="lfdln-pagination-nav" aria-label=${label}>
      ${prev}${picker === nothing ? status : html`<div class="lfdln-pagination-info">${status}${picker}</div>`}${next}
    </nav>`;
  }
  // Numbers: ‹ Previous 1 … 4 [5] 6 … 12 Next ›. On a phone the numbers give way to
  // "Page 5 of 12" (.lfdln-pagination-now, hidden from screen readers: the status says it already).
  return html`<nav class="lfdln-pagination-nav" aria-label=${label}>
    <div class="lfdln-pagination-info">${status}${picker}</div>
    <div class="lfdln-pagination-pager">
      ${prev}
      <span class="lfdln-pagination-numbers" role="group" aria-label=${w.pageNumbers}>${numbers.map((n) =>
        n === 'gap'
          ? html`<span class="lfdln-pagination-gap" aria-hidden="true">…</span>`
          : n === page
            ? html`<span class="lfdln-pagination-current" aria-current="page" tabindex="-1"><span
                class="lfdln-pagination-sr">${w.pageNumber(num(n))}</span><span aria-hidden="true">${num(n)}</span></span>`
            : html`<button type="button" aria-label=${w.pageNumber(num(n))}
                @click=${() => on.onPage(n, true)}>${num(n)}</button>`)}</span>
      <span class="lfdln-pagination-now" aria-hidden="true">${pageOf}</span>
      ${next}
    </div>
  </nav>`;
}

// "Rows per page", when there is a choice.
function renderPicker(v: PaginationView, on: PaginationHandlers): TemplateResult | typeof nothing {
  const sizes = v.sizes ?? [];
  if (sizes.length < 2) return nothing;
  const num = v.format ?? String;
  return html`<label class="lfdln-pagination-size"><span>${v.words.rowsPerPage}</span><select
    @change=${(e: Event) => on.onSize(Number((e.target as HTMLSelectElement).value))}>
    ${sizes.map((n) => html`<option value=${n} .selected=${live(n === v.size)}>${num(n)}</option>`)}
  </select></label>`;
}

/**
 * After a page button: pressing a number turns it into the current page, which is no button, so
 * focus moves to the current page (focusable from script only) instead of being lost or left on a
 * button that now says another number. After Previous or Next, focus stays where it is, unless the
 * button left the pager or can't be pressed any more (the first or last page).
 */
export function focusCurrentPage(nav: Element | null | undefined, number = false): void {
  if (!nav) return;
  const at = document.activeElement;
  if (!number && nav.contains(at) && !(at as HTMLButtonElement | null)?.disabled) return;
  nav.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
}
