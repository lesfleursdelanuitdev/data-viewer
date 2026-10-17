import { LfdlnSelect } from './lfdln-select.ts';

export { LfdlnSelect } from './lfdln-select.ts';
export { chevronElement, renderSelect } from './render.ts';
export { addSelectStyles, selectCss } from './styles.ts';

// The browser lets one class be defined only once, so later names get a subclass.
let classUsed = false;

/**
 * Registers <lfdln-select> (or `name`). A name already taken is left alone, so calling it twice,
 * or loading two standalone scripts, is safe. Importing this module registers nothing; the
 * standalone script calls define() for you.
 */
export function define(name = 'lfdln-select'): void {
  if (customElements.get(name)) return;
  customElements.define(name, classUsed ? class extends LfdlnSelect {} : LfdlnSelect);
  classUsed = true;
}
