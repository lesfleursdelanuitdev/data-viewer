// The `search` filter style for the viewer: importing this module (or loading
// data-viewer-filter-search.js) makes filter-style="search" work: the list's search and its
// filters in one field. It registers `panel` too, as the rail and columns add-ons do. It draws
// with the viewer's own Lit, so the file carries none.
import { panelStyle } from '@lesfleursdelanuitdev/filter/panel';
import { searchFilterStyle } from '@lesfleursdelanuitdev/search-filter/style';
import { registerFilterStyle } from '../core/filter-styles.ts';

export { panelStyle, searchFilterStyle };
registerFilterStyle('panel', panelStyle);
registerFilterStyle('search', searchFilterStyle);
