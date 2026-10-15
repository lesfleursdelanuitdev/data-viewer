import { LfdlnDataViewer } from './element/data-viewer.ts';
import { LfdlnDvColumn } from './element/column.ts';
import { LfdlnDvMenu } from './element/dv-menu.ts';

export { LfdlnDataViewer, defaultWords } from './element/data-viewer.ts';
export { LfdlnDvColumn } from './element/column.ts';
export { LfdlnDvMenu } from './element/dv-menu.ts';
export type { DvMenuEventMap } from './element/dv-menu.ts';
export type { DataViewerEventMap, Layout, LayoutIcons, LayoutSwitch, Pager, Words } from './element/data-viewer.ts';
export type { CardParts, Column, Content, MenuEntry, MenuHeading, MenuItem, MenuSeparator, Query, View } from './core/types.ts';
export { registerAdapter } from './adapters/register.ts';
export { configure, defineList } from './element/setup.ts';
export type { ListColumn, ListConfig, ListSetup } from './element/setup.ts';
export type { Adapter } from './adapters/types.ts';

// The browser lets one class be defined only once, so later names get a subclass.
let classUsed = false;
let columnClassUsed = false;
let menuClassUsed = false;

/**
 * Registers the viewer under `name`, the column element under `columnName` and the standalone menu
 * under `menuName`. A name already
 * taken (another copy of this package, or another library) is left alone. Importing this module
 * registers nothing; the standalone script calls define() for you.
 */
export function define(name = 'lfdln-data-viewer', columnName = 'lfdln-dv-column', menuName = 'lfdln-dv-menu'): void {
  if (!customElements.get(menuName)) {
    const menu = menuClassUsed ? class extends LfdlnDvMenu {} : LfdlnDvMenu;
    menu.tag = menuName; // its children are <menuName-item>, <menuName-separator>, <menuName-heading>
    customElements.define(menuName, menu);
    menuClassUsed = true;
  }
  if (!customElements.get(columnName)) {
    customElements.define(columnName, columnClassUsed ? class extends LfdlnDvColumn {} : LfdlnDvColumn);
    columnClassUsed = true;
  }
  if (customElements.get(name)) return;
  const viewer = classUsed ? class extends LfdlnDataViewer {} : LfdlnDataViewer;
  // Each viewer name knows its column tag, so two define() calls don't mix them up.
  viewer.columnTag = columnName;
  customElements.define(name, viewer);
  classUsed = true;
}
