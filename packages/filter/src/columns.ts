// @lesfleursdelanuitdev/filter/columns: the `columns` filter style and its helpers, with no Lit
// inside (it draws with the kit it is given). It has no element of its own: it needs a table, so
// it is drawn by the data viewer's headers. The shared parts and `panel`, its fallback in cards
// view, are in @lesfleursdelanuitdev/filter/panel.
export { columnsStyle, columnsCss } from './styles/columns.ts';
export { columnRows, columnsFallback, columnsSummary, filteredCount, menuAtEnd, menuLeft, menuRoom, type ColumnRow } from './styles/columns-logic.ts';
export type { FilterKit, FilterStyle, FilterStyleHandlers, FilterStyleView } from './core/style-types.ts';
