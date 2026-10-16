import type { SelectAddon } from '../core/select-types.ts';
import { bar } from './bar.ts';
import { box, pageBox } from './boxes.ts';
import { addSelectStyles } from './css.ts';

/** The select add-on: the boxes, the header box and the selection bar, drawn with the viewer's kit. */
export const select: SelectAddon = { styles: () => addSelectStyles(), bar, pageBox, box };
