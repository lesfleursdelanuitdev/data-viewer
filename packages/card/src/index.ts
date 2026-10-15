import { LfdlnCard } from './lfdln-card.ts';

export { LfdlnCard, defaultCardWords, partsIn, type CardEventMap, type CardWords } from './lfdln-card.ts';
export { actionsMode, renderCard, type CardActions, type CardHooks, type CardParts } from './render.ts';
export { fitRow, type RowItem, type RowRoom } from './fit.ts';
export { rowFit } from './row-fit.ts';
export { addCardStyles, cardCss } from './styles.ts';

// The browser lets one class be defined only once, so later names get a subclass.
let classUsed = false;

/**
 * Registers <lfdln-card> (or `name`); its children are then <name-header>, <name-body> and
 * <name-footer>, and footer actions are <menuName-item>. A name already taken (another copy of
 * this package, or another library) is left alone, so calling it twice, or loading two
 * standalone scripts, is safe. Importing this module registers nothing.
 */
export function define(name = 'lfdln-card', menuName = 'lfdln-menu'): void {
  if (customElements.get(name)) return;
  const card = classUsed ? class extends LfdlnCard {} : LfdlnCard;
  card.tag = name;
  card.menuTag = menuName;
  customElements.define(name, card);
  classUsed = true;
}
