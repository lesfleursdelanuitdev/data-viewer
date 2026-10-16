// The `views` filter style for the viewer: importing this module (or loading
// data-viewer-filter-views.js) makes filter-style="views" work: saved views first, as tabs above
// the list. It brings the saved views store with it (the standalone viewer carries none), and it
// draws with the viewer's own Lit, so the file carries none.
import { viewsStyle } from '@lesfleursdelanuitdev/filter/views';
import { registerFilterStyle, type ViewerFilterStyle } from '../core/filter-styles.ts';
import { viewsStore } from '../element/views-store.ts';

/**
 * The style this module registers as "views": the filter package's viewsStyle joined with the
 * viewer's saved views store. Register it under another name with registerFilterStyle(); the bare
 * viewsStyle has no store, so registerFilterStyle()'s type refuses it.
 */
export const viewerViewsStyle: ViewerFilterStyle = { ...viewsStyle, store: viewsStore };

export { viewsStyle, viewsStore };
registerFilterStyle('views', viewerViewsStyle);
