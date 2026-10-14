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
  label: string;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
  why?: string;
};

export type CardParts = {
  title: string;
  href?: string;
  badge?: Content;
  picture?: Content;
  facts?: Content[];
  meta?: Content;
  value?: Content;
  action?: { id: string; label: string; href?: string };
  menu?: MenuItem[];
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
};
