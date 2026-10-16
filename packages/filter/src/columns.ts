// @lesfleursdelanuitdev/filter/columns: the `columns` filter style and its fallback, with no Lit
// inside (it draws with the kit it is given). It has no element of its own: it needs a table, so
// it is drawn by the data viewer's headers. The shared parts are in
// @lesfleursdelanuitdev/filter/parts, and `panel`, its fallback in cards view, in /panel.
export { columnsStyle, columnsCss } from './styles/columns.ts';
export { columnsFallback } from './styles/columns-logic.ts';
export type { FilterKit, FilterStyle, FilterStyleHandlers, FilterStyleView } from './core/style-types.ts';
