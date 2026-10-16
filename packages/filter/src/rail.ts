// @lesfleursdelanuitdev/filter/rail: the `rail` filter style and its helpers, with no Lit inside
// (it draws with the kit it is given). <lfdln-filter-rail>, the element, is
// @lesfleursdelanuitdev/filter/rail-element. The shared parts and `panel`, the rail's fallback,
// are in @lesfleursdelanuitdev/filter/panel.
export { railStyle, railCss } from './styles/rail.ts';
export { anySet, railFallback, railRows, RAIL_MIN_WIDTH, type RailRow } from './styles/rail-logic.ts';
export type { FilterKit, FilterStyle, FilterStyleHandlers, FilterStyleView } from './core/style-types.ts';
