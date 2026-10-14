import type { Column } from '../core/types.ts';

/**
 * <lfdln-dv-column>: one column of a viewer, written in HTML. It only holds attributes and
 * draws nothing; the viewer reads them with getAttribute, so this element need not be defined yet.
 */
export class LfdlnDvColumn extends HTMLElement {}

const TYPES = new Set(['text', 'number', 'money', 'date', 'badge', 'image', 'link', 'tags', 'bool']);

// One column from one element's attributes. An unknown type is text; align is only left or right.
export function columnFrom<T>(el: Element): Column<T> {
  const key = el.getAttribute('key') ?? '';
  const type = el.getAttribute('type') ?? '';
  const align = el.getAttribute('align');
  const currency = el.getAttribute('currency');
  const col: Column<T> = {
    key,
    label: el.getAttribute('label') ?? key,
    type: (TYPES.has(type) ? type : 'text') as Column<T>['type'],
    sortable: el.hasAttribute('sortable'),
  };
  if (align === 'left' || align === 'right') col.align = align;
  if (currency) col.format = { currency };
  return col;
}

// The columns written as direct children of a viewer, in order.
export function columnsIn<T>(host: Element, tag: string): Column<T>[] {
  return [...host.children].filter((el) => el.localName === tag).map((el) => columnFrom<T>(el));
}
