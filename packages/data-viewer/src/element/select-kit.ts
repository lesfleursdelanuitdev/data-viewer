import { renderMenu } from '@lesfleursdelanuitdev/menu';
import { viewerKit } from './filter-kit.ts';
import type { SelectKit } from '../core/select-types.ts';

/** The viewer's Lit and menu, handed to the select add-on (see SelectKit). */
export const selectKit: SelectKit = { ...viewerKit, menu: renderMenu };
