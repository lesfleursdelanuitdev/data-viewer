import { LfdlnDataViewer } from './element/data-viewer.ts';

export { LfdlnDataViewer, defaultWords } from './element/data-viewer.ts';
export type { Layout, Words } from './element/data-viewer.ts';
export type { CardParts, Column, Content, MenuItem, Query, View } from './core/types.ts';

// The browser lets one class be defined only once, so later names get a subclass.
let classUsed = false;

/**
 * Registers the element under `name`. Does nothing if the name is already taken (another
 * copy of this package, or another library). Importing this module registers nothing;
 * the standalone script calls define() for you.
 */
export function define(name = 'lfdln-data-viewer'): void {
  if (customElements.get(name)) return;
  customElements.define(name, classUsed ? class extends LfdlnDataViewer {} : LfdlnDataViewer);
  classUsed = true;
}
