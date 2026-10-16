import type { CardActions, CardParts, Column, FilterOption, Query, View } from '../core/types.ts';
import type { DataViewerEventMap, LayoutIcons, LayoutSwitch, LfdlnDataViewer, Pager, Words } from './data-viewer.ts';
import type { CardMount, CardTemplate } from './custom-cards.ts';

/** A column in a list's setup: its key is a row key, unless it reads its own value or draws itself. */
export type ListColumn<T> =
  | (Column<T> & { key: Extract<keyof T, string> })
  | (Column<T> & { value: (row: T) => unknown })
  | (Column<T> & { render: NonNullable<Column<T>['render']> });

/**
 * A list's setup as one object: the default export of a `config` module, or what configure()
 * gets. Every key is optional. `on` handlers are added to the element (and removed when the setup
 * is replaced); `load` gives the rows, with the list busy until it answers.
 */
export type ListSetup<T = Record<string, unknown>> = {
  columns?: ListColumn<T>[];
  views?: View<T>[];
  cardOf?: (row: T) => CardParts;
  /** Your own card for each row, drawn with Lit (or an element). See "Your own cards". */
  cardTemplate?: CardTemplate<T>;
  /** Your own card mounted into an empty element (React and other frameworks). */
  cardMount?: CardMount<T>;
  /** The id of a <template> on the page to draw the cards from (the card-template attribute). */
  cardTemplateId?: string;
  rows?: T[];
  total?: number;
  load?: (list: LfdlnDataViewer<T>) => T[] | Promise<T[]>;
  on?: { [K in keyof DataViewerEventMap<T>]?: (e: DataViewerEventMap<T>[K]) => void };
  label?: string;
  searchKeys?: string[];
  words?: Partial<Words>;
  cardTitle?: string;
  cardPicture?: string;
  cardFacts?: string;
  cardMeta?: string;
  cardValue?: string;
  cardHref?: string;
  openEvent?: boolean;
  pageSize?: number;
  pageSizes?: number[];
  pager?: Pager;
  layout?: 'table' | 'cards';
  phoneLayout?: 'table' | 'cards';
  layoutSwitch?: LayoutSwitch;
  tableLabel?: string;
  cardsLabel?: string;
  layoutIcons?: LayoutIcons;
  cardActions?: CardActions;
  cardActionsMax?: number;
  cardMoreLabel?: string;
  rememberAs?: string;
  compact?: boolean;
  urlState?: string;
  state?: Partial<Query>;
  adapter?: string;
  src?: string;
  facets?: Record<string, FilterOption[]>;
  searchIn?: boolean;
  searchSubmitLabel?: string;
  filterLabel?: string;
  filterChips?: 'on' | 'off';
};

/** The setup, or a function that gets the element and sets it up (and may return a setup too). */
export type ListConfig<T = Record<string, unknown>> =
  | ListSetup<T>
  | ((list: LfdlnDataViewer<T>) => void | ListSetup<T> | Promise<void | ListSetup<T>>);

/** Returns the config unchanged; it is there so TypeScript knows the row type in your module. */
export function defineList<T = Record<string, unknown>>(config: ListConfig<T>): ListConfig<T> {
  return config;
}

/**
 * Sets a viewer up from a config (the same object or function a `config` module exports): for
 * apps with a bundler, and React (`configure(ref.current, plants)` in an effect). It replaces the
 * viewer's previous config and its `on` handlers. Resolves once the setup (and load) is done.
 */
export function configure<T>(el: LfdlnDataViewer<T>, config: ListConfig<T>): Promise<void> {
  return el.configure(config);
}
