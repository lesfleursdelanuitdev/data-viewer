// The `rail` filter style for the viewer: importing this module (or loading
// data-viewer-filter-rail.js) makes filter-style="rail" work. It registers `panel` too, the
// rail's fallback when the list is narrower than 720 px. It draws with the viewer's own Lit, so
// the file carries none.
import { panelStyle } from '@lesfleursdelanuitdev/filter/panel';
import { railStyle } from '@lesfleursdelanuitdev/filter/rail';
import { registerFilterStyle } from '../core/filter-styles.ts';

export { panelStyle, railStyle };
registerFilterStyle('panel', panelStyle);
registerFilterStyle('rail', railStyle);
