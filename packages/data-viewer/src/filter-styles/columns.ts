// The `columns` filter style for the viewer: importing this module (or loading
// data-viewer-filter-columns.js) makes filter-style="columns" work. It registers `panel` too, the
// columns' fallback in cards view. It draws with the viewer's own Lit, so the file carries none.
import { panelStyle } from '@lesfleursdelanuitdev/filter/panel';
import { columnsStyle } from '@lesfleursdelanuitdev/filter/columns';
import { registerFilterStyle } from '../core/filter-styles.ts';

export { columnsStyle, panelStyle };
registerFilterStyle('panel', panelStyle);
registerFilterStyle('columns', columnsStyle);
