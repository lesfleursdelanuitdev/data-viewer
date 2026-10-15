// The one-script build for plain pages: everything (Lit, the menu, the pager and the card inside),
// with every tag registered on load: <lfdln-data-viewer>, <lfdln-dv-column>, <lfdln-menu>,
// <lfdln-pagination> and <lfdln-card>. A tag another script registered first is left alone.
import { define as defineMenu, LfdlnMenu } from '@lesfleursdelanuitdev/menu';
import { define as definePagination, LfdlnPagination } from '@lesfleursdelanuitdev/pagination';
import { define as defineCard, LfdlnCard } from '@lesfleursdelanuitdev/card';
import { define } from './index.ts';

export * from './index.ts';
export { LfdlnMenu, LfdlnPagination, LfdlnCard };
defineMenu();
definePagination();
defineCard();
define();
