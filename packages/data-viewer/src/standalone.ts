// The one-script build for plain pages: everything (Lit, the menu, the pager, the card, the
// search box and the filter inside), with every tag registered on load: <lfdln-data-viewer>,
// <lfdln-dv-column>, <lfdln-menu>, <lfdln-pagination>, <lfdln-card>, <lfdln-search>,
// <lfdln-filter> and <lfdln-filter-chips>. A tag another script registered first is left alone.
import { define as defineMenu, LfdlnMenu } from '@lesfleursdelanuitdev/menu';
import { define as definePagination, LfdlnPagination } from '@lesfleursdelanuitdev/pagination';
import { define as defineCard, LfdlnCard } from '@lesfleursdelanuitdev/card';
import { define as defineSearch, LfdlnSearch } from '@lesfleursdelanuitdev/search';
import { define as defineFilter, LfdlnFilter, LfdlnFilterChips } from '@lesfleursdelanuitdev/filter';
import { define } from './index.ts';

export * from './index.ts';
export { LfdlnMenu, LfdlnPagination, LfdlnCard, LfdlnSearch, LfdlnFilter, LfdlnFilterChips };
defineMenu();
definePagination();
defineCard();
defineSearch();
defineFilter();
define();
