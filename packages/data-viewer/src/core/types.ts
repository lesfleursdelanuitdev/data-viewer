import type { Content } from '@lesfleursdelanuitdev/menu';
import type { FilterOption, FilterValue } from '@lesfleursdelanuitdev/filter';

// Anything a cell or card part can show (string, Node or TemplateResult), and the menu and card
// types, come from the menu and card packages; they are re-exported here for the viewer's users.
export type { Content, MenuEntry, MenuHeading, MenuItem, MenuSeparator } from '@lesfleursdelanuitdev/menu';
export type { CardActions, CardParts } from '@lesfleursdelanuitdev/card';
export type { FilterOption, FilterSection, FilterValue } from '@lesfleursdelanuitdev/filter';

export type Column<T> = {
  key: string; // also what sorting by it is called
  label: string;
  type?: 'text' | 'number' | 'money' | 'date' | 'badge' | 'image' | 'link' | 'tags' | 'bool';
  value?: (row: T) => unknown; // default: row[key]
  render?: (row: T) => Content; // replaces the type's drawing
  sortable?: boolean;
  align?: 'left' | 'right'; // numbers and money default to right
  format?: { currency?: string; locale?: string; date?: Intl.DateTimeFormatOptions };
  /** Search looks at this column. With none marked (and no searchKeys), search looks at every column. */
  searchable?: boolean;
  /** The filter has a section for this column (its kind follows the type; never for images). */
  filterable?: boolean;
  /** A choice's options, in this order (labels too). Counts still come from the rows or facets. */
  options?: (string | FilterOption)[];
  /** A range's quick ranges, such as { label: '1900s', from: '1900', to: '1999' }. */
  ranges?: { label: string; from?: string; to?: string }[];
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
  /** The one column search looks at ("Search in"); left out for all of them. */
  searchIn?: string;
  /** The applied filters, by column key; left out when there are none. */
  filters?: FilterValue;
};

/** What an adapter's server can do with filters. Adapters without it get everything. */
export type AdapterSupports = {
  /** 'all' (the default) or 'equals': one exact value per column, so choices only, each single. */
  filters?: 'all' | 'equals';
  /** Whether it can search one column ("Search in"). Default yes. */
  searchIn?: boolean;
  /** Whether its answers carry facets (options with counts). */
  facets?: boolean;
};
