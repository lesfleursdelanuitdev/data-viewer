import type { Content } from '@lesfleursdelanuitdev/menu';

// Anything a cell or card part can show (string, Node or TemplateResult), and the menu and card
// types, come from the menu and card packages; they are re-exported here for the viewer's users.
export type { Content, MenuEntry, MenuHeading, MenuItem, MenuSeparator } from '@lesfleursdelanuitdev/menu';
export type { CardActions, CardParts } from '@lesfleursdelanuitdev/card';

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
