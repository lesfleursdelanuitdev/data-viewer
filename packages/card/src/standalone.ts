// The one-script build for plain pages: the card with Lit and the menu inside. It registers
// <lfdln-card> and <lfdln-menu> (for a menu in a card's header) on load.
import { define as defineMenu } from '@lesfleursdelanuitdev/menu';
import { define } from './index.ts';

export * from './index.ts';
defineMenu();
define();
