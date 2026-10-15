import { LfdlnPagination } from './lfdln-pagination.ts';

export { LfdlnPagination } from './lfdln-pagination.ts';
export type { PaginationEventMap } from './lfdln-pagination.ts';
export { clampPage, pageAfterResize, pageNumbers, pageRange, pageSizeChoices, pageSizeOf, parsePageSizes } from './paging.ts';
export {
  defaultPaginationWords, focusCurrentPage, renderPagination,
  type Pager, type PaginationHandlers, type PaginationView, type PaginationWords,
} from './render.ts';
export { addPaginationStyles, paginationCss } from './styles.ts';

// The browser lets one class be defined only once, so later names get a subclass.
let classUsed = false;

/**
 * Registers <lfdln-pagination> (or `name`). A name already taken (another copy of this package,
 * or another library) is left alone, so calling it twice, or loading two standalone scripts, is
 * safe. Importing this module registers nothing; the standalone script calls define() for you.
 */
export function define(name = 'lfdln-pagination'): void {
  if (customElements.get(name)) return;
  customElements.define(name, classUsed ? class extends LfdlnPagination {} : LfdlnPagination);
  classUsed = true;
}
