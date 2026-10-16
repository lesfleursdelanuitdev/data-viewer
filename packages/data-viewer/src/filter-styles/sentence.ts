// The `sentence` filter style for the viewer: importing this module (or loading
// data-viewer-filter-sentence.js) makes filter-style="sentence" work: the filter written out as a
// sentence above the list, each underlined phrase a menu. It draws with the viewer's own Lit, so
// the file carries none.
import { sentenceStyle } from '@lesfleursdelanuitdev/filter/sentence';
import { registerFilterStyle } from '../core/filter-styles.ts';

export { sentenceStyle };
registerFilterStyle('sentence', sentenceStyle);
