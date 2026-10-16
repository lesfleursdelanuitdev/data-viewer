// The `panel` filter style for the viewer: importing this module (or loading
// data-viewer-filter-panel.js) makes filter-style="panel" work. It draws with the viewer's own
// Lit, so the file carries none.
import { panelStyle } from '@lesfleursdelanuitdev/filter/panel';
import { registerFilterStyle } from '../core/filter-styles.ts';

export { panelStyle };
registerFilterStyle('panel', panelStyle);
