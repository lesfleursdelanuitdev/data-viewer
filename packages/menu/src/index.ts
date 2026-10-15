import { LfdlnMenu } from './element/lfdln-menu.ts';

export { LfdlnMenu, entriesIn } from './element/lfdln-menu.ts';
export type { MenuEventMap } from './element/lfdln-menu.ts';
export type { Content, MenuEntry, MenuHeading, MenuItem, MenuSeparator } from './core/types.ts';
export { entryFromAttrs, isItem, menuItems, menuLayout, type MenuBlock } from './core/menu.ts';
export { DISMISS_GUARD, openConfirm, renderConfirm, renderMenu, type MenuOptions } from './element/render.ts';
export { addMenuStyles, menuCss } from './element/styles.ts';
export { nextId } from './element/ids.ts';
export { safeUrl } from './element/safe-url.ts';
export { copyOf } from './element/content.ts';

// The browser lets one class be defined only once, so later names get a subclass.
let classUsed = false;

/**
 * Registers <lfdln-menu> (or `name`); its children are then <name-item>, <name-separator> and
 * <name-heading>. A name already taken (another copy of this package, or another library) is
 * left alone, so calling it twice, or loading two standalone scripts, is safe. Importing this
 * module registers nothing; the standalone script calls define() for you.
 */
export function define(name = 'lfdln-menu'): void {
  if (customElements.get(name)) return;
  const menu = classUsed ? class extends LfdlnMenu {} : LfdlnMenu;
  menu.tag = name;
  customElements.define(name, menu);
  classUsed = true;
}
