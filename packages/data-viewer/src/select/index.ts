// The select add-on for the viewer: importing this module (or loading data-viewer-select.js)
// makes `selectable` lists draw their boxes and the selection bar. It draws with the viewer's own
// Lit, so the file carries none.
import { registerSelect } from '../core/select-addon.ts';
import { select } from './addon.ts';

export { select };
export { defaultSelectWords } from './words.ts';
registerSelect(select);
