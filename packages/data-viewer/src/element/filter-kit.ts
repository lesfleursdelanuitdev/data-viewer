import { html, svg, nothing } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { repeat } from 'lit/directives/repeat.js';
import { classMap } from 'lit/directives/class-map.js';
import { live } from 'lit/directives/live.js';
import { renderMenu } from '@lesfleursdelanuitdev/menu';
import type { FilterKit } from '@lesfleursdelanuitdev/filter';

/** The viewer's own Lit, handed to every filter style it draws (see FilterKit), and its ⋯ menu. */
export const viewerKit: FilterKit = {
  html, svg, nothing, ref, repeat, classMap, live,
  menu: (items, id, label, onPick) => renderMenu(items, id, label, (item, button) => onPick(item.id, button)),
};
