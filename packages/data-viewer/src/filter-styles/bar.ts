// The `bar` filter style for the viewer: importing this module (or loading
// data-viewer-filter-bar.js) makes filter-style="bar" work. It draws with the viewer's own Lit,
// so the file carries none.
import { barStyle } from '@lesfleursdelanuitdev/filter/bar';
import { registerFilterStyle } from '../core/filter-styles.ts';

export { barStyle };
registerFilterStyle('bar', barStyle);
