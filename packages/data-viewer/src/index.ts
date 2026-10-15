import { LfdlnDataViewer } from './element/data-viewer.ts';
import { LfdlnDvColumn } from './element/column.ts';

export { LfdlnDataViewer, defaultWords } from './element/data-viewer.ts';
export { LfdlnDvColumn } from './element/column.ts';
export type { DataViewerEventMap, Layout, LayoutIcons, LayoutSwitch, Pager, Words } from './element/data-viewer.ts';
export type {
  CardActions, CardParts, Column, Content, MenuEntry, MenuHeading, MenuItem, MenuSeparator, Query, View,
} from './core/types.ts';
export { registerAdapter } from './adapters/register.ts';
export { configure, defineList } from './element/setup.ts';
export type { ListColumn, ListConfig, ListSetup } from './element/setup.ts';
export type { Adapter } from './adapters/types.ts';

// The browser lets one class be defined only once, so later names get a subclass.
let classUsed = false;
let columnClassUsed = false;

/**
 * Registers the viewer under `name` and the column element under `columnName`. A name already
 * taken (another copy of this package, or another library) is left alone, so calling it twice is
 * safe. The viewer draws its menus, pages and cards itself (with the menu, pagination and card
 * packages' code), so it needs no other tag; to use <lfdln-menu>, <lfdln-pagination> or
 * <lfdln-card> on their own, call those packages' define(). Importing this module registers
 * nothing; the standalone script registers every tag.
 */
export function define(name = 'lfdln-data-viewer', columnName = 'lfdln-dv-column'): void {
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
