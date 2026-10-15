import type { TemplateResult } from 'lit';

// Anything a cell or card part can show.
export type Content = string | Node | TemplateResult;

export type Column<T> = {
  key: string; // also what sorting by it is called
  label: string;
  type?: 'text' | 'number' | 'money' | 'date' | 'badge' | 'image' | 'link' | 'tags' | 'bool';
  value?: (row: T) => unknown; // default: row[key]
  render?: (row: T) => Content; // replaces the type's drawing
  sortable?: boolean;
  align?: 'left' | 'right'; // numbers and money default to right
  format?: { currency?: string; locale?: string; date?: Intl.DateTimeFormatOptions };
};

export type MenuItem = {
  id: string;
  label: string; // the item's name: always text
  href?: string;
  danger?: boolean;
  disabled?: boolean;
  why?: string; // shown under a disabled item's label (in place of the description)
  confirm?: string; // asked in a built-in dialog before action fires
  icon?: Content; // before the label; a string is text (an emoji works), a Node is copied
  description?: string; // a quieter second line, always shown
  content?: Node; // drawn (copied) in place of the label text: <lfdln-dv-menu-item> markup
};

/** A line between items. */
export type MenuSeparator = { separator: true };
/** A label for the items after it (up to the next separator or heading). */
export type MenuHeading = { heading: string };
export type MenuEntry = MenuItem | MenuSeparator | MenuHeading;

export type CardParts = {
  title: string;
  href?: string;
  badge?: Content;
  picture?: Content;
  facts?: Content[];
  meta?: Content;
  value?: Content;
  action?: { id: string; label: string; href?: string };
  menu?: MenuEntry[];
  actionsAt?: 'menu' | 'footer'; // this card's own placement of its menu items (cards only)
};

export type View<T> = {
  key: string;
  label: string;
  count?: number;
  where?: (row: T) => boolean; // browser mode only
};

export type Query = {
  page: number;
  search: string;
  sort: string;
  dir: 'asc' | 'desc';
  view: string;
  /** Rows per page: the visitor's pick when there is a page-size picker, else page-size. */
  size: number;
};
