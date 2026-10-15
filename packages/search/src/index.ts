import { LfdlnSearch } from './lfdln-search.ts';

export { LfdlnSearch } from './lfdln-search.ts';
export type { SearchEventMap } from './lfdln-search.ts';
export { debounce } from './debounce.ts';
export {
  defaultSearchWords, renderSearch,
  type SearchField, type SearchHandlers, type SearchView, type SearchWords,
} from './render.ts';
export { addSearchStyles, searchCss } from './styles.ts';

// The browser lets one class be defined only once, so later names get a subclass.
let classUsed = false;

/**
 * Registers <lfdln-search> (or `name`). A name already taken (another copy of this package, or
 * another library) is left alone, so calling it twice, or loading two standalone scripts, is
 * safe. Importing this module registers nothing; the standalone script calls define() for you.
 */
export function define(name = 'lfdln-search'): void {
  if (customElements.get(name)) return;
  customElements.define(name, classUsed ? class extends LfdlnSearch {} : LfdlnSearch);
  classUsed = true;
}
