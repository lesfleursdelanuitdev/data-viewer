// @lesfleursdelanuitdev/filter/views: the `views` filter style (saved views first, handoff 2b),
// its words and pure helpers, with no Lit inside (it draws with the kit it is given). It has no
// element of its own: it needs a host that keeps the views (the data viewer's views add-on). The
// shared parts are in @lesfleursdelanuitdev/filter/parts.
export { viewsStyle, viewsCss } from './styles/views.ts';
export {
  builderRows, canSaveView, defaultViewsWords, newViewLabel, saveLabel, type BuilderChip, type BuilderRow, type ViewsWords,
} from './styles/views-logic.ts';
export type {
  FilterKit, FilterStyleHandlers, FilterStyleView, FilterStyleViews, SavedView, ViewsFilterStyle, ViewTab,
} from './core/style-types.ts';
