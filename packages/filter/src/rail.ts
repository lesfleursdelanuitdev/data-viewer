// @lesfleursdelanuitdev/filter/rail: the `rail` filter style and its fallback, with no Lit inside
// (it draws with the kit it is given). <lfdln-filter-rail>, the element, is
// @lesfleursdelanuitdev/filter/rail-element. The shared parts are in
// @lesfleursdelanuitdev/filter/parts, and `panel`, the rail's fallback, in /panel.
export { railStyle, railCss } from './styles/rail.ts';
export { railFallback, RAIL_MIN_WIDTH } from './styles/rail-logic.ts';
export type { FilterKit, FilterStyle, FilterStyleHandlers, FilterStyleView } from './core/style-types.ts';
