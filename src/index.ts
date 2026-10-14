import { LfdlnDataViewer } from './element/data-viewer.ts';

export { LfdlnDataViewer, defaultWords } from './element/data-viewer.ts';
export type { Layout, Words } from './element/data-viewer.ts';
export type { CardParts, Column, Content, MenuItem, Query, View } from './core/types.ts';

/**
 * Registers the element. Does nothing if the name is already taken (another copy of this
 * package, or another library). A second name gets its own subclass, because the browser
 * lets one class be defined only once.
 */
export function define(name = 'lfdln-data-viewer'): void {
  if (customElements.get(name)) return;
  const taken = customElements.getName?.(LfdlnDataViewer);
  customElements.define(name, taken ? class extends LfdlnDataViewer {} : LfdlnDataViewer);
}

// A plain page only adds the script and the tag, so the default name is registered on import.
define();
