import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { copyOf, nextId, openConfirm, renderConfirm, renderMenu, safeUrl } from '@lesfleursdelanuitdev/menu';
import {
  defaultPaginationWords, focusCurrentPage, pageAfterResize, pageSizeChoices, pageSizeOf, parsePageSizes,
  renderPagination, type PaginationWords,
} from '@lesfleursdelanuitdev/pagination';
import { renderCard, renderCardActions, type CardActions, type CardHooks } from '@lesfleursdelanuitdev/card';
import { defaultSearchWords, renderSearch, type SearchWords } from '@lesfleursdelanuitdev/search';
import {
  defaultFilterWords, isSet, normalise, removeChip, renderFilter, renderFilterChips,
  type FilterHandlers, type FilterSection, type FilterStyleHandlers, type FilterStyleView,
  type FilterValue, type FilterView, type FilterWords,
} from '@lesfleursdelanuitdev/filter';
import type { SearchFilterWords } from '@lesfleursdelanuitdev/search-filter/style';
import type { ViewsWords } from '@lesfleursdelanuitdev/filter/views';
import type { SentenceWords } from '@lesfleursdelanuitdev/filter/sentence';
import type { AdapterSupports, CardParts, Column, Content, FilterOption, MenuItem, Query, SavedView, View } from '../core/types.ts';
import { applyQuery } from '../core/list.ts';
import { countMatching, filterKind, filterSections, narrow, searchColumns } from '../core/filters.ts';
import { DraftCount } from '../core/draft-count.ts';
import { formatCell, formatNumber } from '../core/format.ts';
import { fieldText, fieldValue } from '../core/card-template.ts';
import { readQuery, writeQuery, type AddressQuery, type FilterKinds } from '../core/address.ts';
import { addStyles } from './styles.ts';
import { columnsIn } from './column.ts';
import { CustomCards, planOf, type CardMount, type CardSource, type CardTemplate } from './custom-cards.ts';
import { adapterNamed, whenRegistered } from '../adapters/register.ts';
import { newWarnings, splitConfig } from '../core/config.ts';
import { filterStyle, onFilterStyle, pickFilterStyle, sameFilterStyle, type ViewerFilterStyle } from '../core/filter-styles.ts';
import type { ViewsStore } from './views-store.ts';
import { onSelectAddon, selectAddon, warnNoSelect } from '../core/select-addon.ts';
import { NONE, countOf, keep, keyOf, pageState, scopeOf, seen, tick, tickAll, tickPage, ticked, type Selection } from '../core/selection.ts';
import type { SelectAddon, SelectHandlers, SelectView, SelectWords } from '../core/select-types.ts';
import { viewerKit } from './filter-kit.ts';
import { selectKit } from './select-kit.ts';
import type { ListConfig } from './setup.ts';
import type { LfdlnDvColumn } from './column.ts';

export type Layout = 'table' | 'cards';
export type Pager = 'simple' | 'numbers';
export type LayoutSwitch = 'none' | 'text' | 'icons' | 'both';
/** Icons for the layout switch. A string is shown as text (never HTML); a Node is copied per drawing. */
export type LayoutIcons = { table?: Content; cards?: Content };

// The ×s of the viewer's chips row: the root's child, or .dv-main's beside a side style (not the
// draft chips inside today's dialog).
const CHIP_XS = ':scope > .dv-root > .lfdln-filter-chips .lfdln-filter-chip-x, :scope > .dv-root > .dv-main > .lfdln-filter-chips .lfdln-filter-chip-x';

// The built-in switch icons: a table (rows under a header) and cards (four tiles), in currentColor.
const tableIcon = html`<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor"
  stroke-width="1.5" focusable="false"><rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1.5"/><path
  d="M1.75 6.25h12.5M1.75 9.75h12.5M6 6.25v7"/></svg>`;
const cardsIcon = html`<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor"
  stroke-width="1.5" focusable="false"><rect x="1.75" y="1.75" width="5.25" height="5.25" rx="1.25"/><rect
  x="9" y="1.75" width="5.25" height="5.25" rx="1.25"/><rect x="1.75" y="9" width="5.25" height="5.25" rx="1.25"/><rect
  x="9" y="9" width="5.25" height="5.25" rx="1.25"/></svg>`;

// Every piece of text the list shows. Plain English defaults; a page can replace any of them.
// The pager's words (pages, previous, next, empty, showing, pageOf, pageNumbers, pageNumber,
// rowsPerPage) are the pagination package's; the search box's (search, searchIn, allFields, clear)
// the search package's; the filter's (filter, apply, clearAll, none, any, …) the filter package's;
// filter-style="search"'s (searchOrFilter, addFilter, searchFor, …) the search-filter package's;
// filter-style="views"'s (allViews, newView, saveView, …) the filter package's views words;
// filter-style="sentence"'s (sentenceStart, and, listComma, things, …) its sentence words.
// The selection's words (selectedCount, selectRow, …) have their defaults in the select add-on.
export type Words = PaginationWords & SearchWords & FilterWords & Partial<SearchFilterWords> & Partial<ViewsWords> & Partial<SentenceWords> & Partial<SelectWords> & {
  views: string;
  showTable: string;
  showCards: string;
  actions: string;
  loadFailed: string;
  tryAgain: string;
  cancel: string;
  ok: string;
  menuFor: (title: string) => string;
  moreFor: (title: string) => string;
  more: string;
  configFailed: (file: string) => string;
};

export const defaultWords: Words = {
  ...defaultPaginationWords,
  ...defaultSearchWords,
  ...defaultFilterWords,
  views: 'Views',
  showTable: 'Show a table',
  showCards: 'Show cards',
  actions: 'What you can do',
  loadFailed: "Couldn't load this list.",
  tryAgain: 'Try again',
  cancel: 'Cancel',
  ok: 'OK',
  menuFor: (title) => `What you can do with ${title}`,
  moreFor: (title) => `More for ${title}`,
  more: 'More',
  configFailed: (file) => `Couldn't load this list's setup from ${file}.`,
};

// The query as the viewer keeps it: size is the visitor's pick (unchecked), undefined when none.
const blank: AddressQuery = { page: 1, search: '', sort: '', dir: 'asc', view: '' };
const PHONE = '(max-width: 640px)';
const FILTER_PHONE = '(max-width: 639px)'; // the filter's bottom sheet, as in the filter package
const DEBOUNCE_MS = 300;
const warnedKeys = new Set<string>(); // unknown config keys, warned about once per page
const warnedIds = new Set<string>(); // card-template ids not found, warned about once per page

// What the built-in confirm dialog is asking about.
type Ask<T> = { item: MenuItem; row: T; button: HTMLElement };

// With an adapter: not known until the first answer, then browser (all rows came) or server.
type LoadMode = 'unknown' | 'browser' | 'server';

/**
 * <lfdln-data-viewer>: one list of rows, drawn as a table or as cards.
 * Browser mode (no `total`): it searches, sorts, filters and pages `rows` itself.
 * Server mode (`total` set): it shows `rows` as given and fires `dv-query` for the host to answer.
 * With `adapter` and `src` it loads its own rows through that adapter (HTML only, no page code):
 * an answer without a total is browser mode, with one it is server mode and every query reloads.
 */
export class LfdlnDataViewer<T = Record<string, unknown>> extends LitElement {
  static override properties = {
    label: { type: String },
    rows: { attribute: false, noAccessor: true },
    total: { type: Number, noAccessor: true },
    columns: { attribute: false },
    cardOf: { attribute: false },
    cardTemplate: { attribute: false },
    cardMount: { attribute: false },
    views: { attribute: false },
    savedViews: { attribute: false },
    pageSize: { type: Number, attribute: 'page-size' },
    pageSizes: { attribute: 'page-sizes', converter: { fromAttribute: (v: string | null) => parsePageSizes(v) } },
    pager: { type: String },
    tableLabel: { type: String, attribute: 'table-label' },
    cardsLabel: { type: String, attribute: 'cards-label' },
    layoutSwitch: { type: String, attribute: 'layout-switch' },
    layoutIcons: { attribute: false },
    cardActions: { type: String, attribute: 'card-actions' },
    cardActionsMax: { type: Number, attribute: 'card-actions-max' },
    cardMoreLabel: { type: String, attribute: 'card-more-label' },
    layout: { type: String, reflect: true },
    phoneLayout: { type: String, attribute: 'phone-layout' },
    rememberAs: { type: String, attribute: 'remember-as' },
    compact: { type: Boolean },
    words: { attribute: false },
    state: { attribute: false },
    searchKeys: { attribute: false },
    busy: { type: Boolean, reflect: true },
    urlState: { type: String, attribute: 'url-state' },
    cardTitle: { type: String, attribute: 'card-title' },
    cardPicture: { type: String, attribute: 'card-picture' },
    cardFacts: { type: String, attribute: 'card-facts' },
    cardMeta: { type: String, attribute: 'card-meta' },
    cardValue: { type: String, attribute: 'card-value' },
    cardHref: { type: String, attribute: 'card-href' },
    cardTemplateId: { type: String, attribute: 'card-template' },
    adapter: { type: String },
    openEvent: { type: Boolean, attribute: 'open-event' },
    src: { type: String },
    config: { type: String },
    facets: { attribute: false },
    searchIn: { type: Boolean, attribute: 'search-in' },
    searchSubmitLabel: { type: String, attribute: 'search-submit-label' },
    filterLabel: { type: String, attribute: 'filter-label' },
    filterChips: { type: String, attribute: 'filter-chips' },
    filterStyle: { type: String, attribute: 'filter-style' },
    selectable: { type: Boolean },
    rowKey: { attribute: 'row-key' },
    batchActions: { attribute: false },
    _sel: { state: true },
    _q: { state: true },
    _fDraft: { state: true },
    _fActive: { state: true },
    _fMenu: { state: true },
    _fSearch: { state: true },
    _fPhone: { state: true },
    _phone: { state: true },
    _configuring: { state: true },
    _failReason: { state: true },
    _failed: { state: true },
    _searchText: { state: true },
    _typed: { state: true },
    _ask: { state: true },
  };

  declare label: string;
  declare columns: Column<T>[];
  declare cardOf: ((row: T) => CardParts) | undefined;
  /** Each card drawn by a function: Lit content or an element. Wins over card templates. */
  declare cardTemplate: CardTemplate<T> | undefined;
  /** Each card mounted into an empty element (React and other frameworks); may return a cleanup. Wins over cardTemplate. */
  declare cardMount: CardMount<T> | undefined;
  declare views: View<T>[] | undefined;
  /**
   * filter-style="views": the visitor's saved views, kept by the page (its server, say). Set, the
   * viewer shows these and never reads or writes localStorage; it still fires views-change on
   * every change and keeps its own copy until the page sets them again. Unset: localStorage
   * under `<remember-as>.views`, or memory only without remember-as.
   */
  declare savedViews: SavedView[] | undefined;
  declare pageSize: number;
  /** The sizes a visitor may pick from ("Rows per page"); none valid means no picker. */
  declare pageSizes: number[] | undefined;
  /** 'simple' (Previous / Next, the default) or 'numbers' (numbered page buttons as well). */
  declare pager: Pager | undefined;
  /** What the layout switch's buttons say (else words.showTable / words.showCards). */
  declare tableLabel: string | undefined;
  declare cardsLabel: string | undefined;
  /**
   * The table-or-cards switch: words ('text', the default; anything unknown is 'text'), icons only
   * ('icons'), an icon before the words ('both'), or no switch ('none').
   */
  declare layoutSwitch: LayoutSwitch | undefined;
  declare layoutIcons: LayoutIcons | undefined;
  /**
   * Cards: their menu items in a ⋯ menu ('menu', the default), as footer buttons that wrap
   * ('wrap'; 'footer' is its older name), or as one row of buttons that never wraps ('row').
   */
  declare cardActions: CardActions | undefined;
  /** Wrap and row: how many items are buttons at most before the rest go into a menu (default 3). */
  declare cardActionsMax: number | undefined;
  /** Row: the words on the More button (default words.more, "More"). */
  declare cardMoreLabel: string | undefined;
  /** The layout on screens wider than 640 px: 'cards', else a table. */
  declare layout: Layout | undefined;
  /** The layout on phones (640 px or less): 'table', else cards. Not reflected. */
  declare phoneLayout: Layout | undefined;
  declare rememberAs: string | undefined;
  declare compact: boolean;
  declare words: Partial<Words>;
  declare state: Partial<Query> | undefined;
  declare searchKeys: string[] | undefined;
  declare busy: boolean;
  declare urlState: string | undefined;
  // HTML-only cards: each names the row key for one card part (card-facts is a comma list).
  declare cardTitle: string | undefined;
  declare cardPicture: string | undefined;
  declare cardFacts: string | undefined;
  declare cardMeta: string | undefined;
  declare cardValue: string | undefined;
  declare cardHref: string | undefined;
  /** The id of a <template> on the page to draw every card from (wins over a <template card> child). */
  declare cardTemplateId: string | undefined;
  // The <template card> child (read with the columns) and the template in use.
  private _tplChild: HTMLTemplateElement | undefined;
  private _tpl: HTMLTemplateElement | undefined;
  /** A registered adapter's name (json, pammy, …) and the address it loads from. */
  declare adapter: string | undefined;
  declare src: string | undefined;
  /** A module's address (read against the page): its default export sets the list up. */
  declare config: string | undefined;
  /**
   * Server mode: each filterable column's options with counts, from the server (set with rows
   * and total; adapters return them with the rows).
   */
  declare facets: Record<string, FilterOption[]> | undefined;
  /** Show the "Search in" picker beside the search box. */
  declare searchIn: boolean;
  /** A button after the search box with these words; then typing alone doesn't search. */
  declare searchSubmitLabel: string | undefined;
  /** The filter button's words when nothing is set (default words.filter). */
  declare filterLabel: string | undefined;
  /** 'on' (the default) shows the applied filters as chips under the bar; 'off' doesn't. */
  declare filterChips: string | undefined;
  /** The filter's design: 'dialog' (the default) or a registered style's name (see registerFilterStyle). */
  declare filterStyle: string | undefined;
  /** Rows get check boxes and a selection bar while anything is ticked (needs data-viewer-select.js). */
  declare selectable: boolean;
  /** What identifies a row, so ticks survive paging: a field name (default 'id') or a function. */
  declare rowKey: string | ((row: T) => string) | undefined;
  /** The selection bar's actions, shaped like the row menu's items. */
  declare batchActions: MenuItem[] | undefined;
  // The selection; in server mode the rows seen by key; and what this drawing's boxes draw from.
  declare _sel: Selection;
  private _seen = new Map<string, T>();
  private _selNow: { a: SelectAddon; v: SelectView; on: SelectHandlers } | undefined;
  private _unSel: (() => void) | undefined;
  // The filter's state: its draft (null while closed), its open section, its option search.
  declare _fDraft: FilterValue | null;
  declare _fActive: string | null;
  declare _fMenu: string | null; // an instant style's open menu (its section key)
  declare _fSearch: string;
  declare _fPhone: boolean;
  // A phone (PHONE matches): read by _shown and _setLayout.
  declare _phone: boolean;
  private _media: MediaQueryList | undefined;
  private _onMedia = () => {
    this._phone = Boolean(this._media?.matches);
  };
  private _fMedia: MediaQueryList | undefined;
  private _onFMedia = () => {
    this._fPhone = Boolean(this._fMedia?.matches);
  };
  // The filter style in use (undefined: the dialog), and the registry listener that draws again
  // when a style is registered (it may be the one asked for, or its fallback).
  private _fStyle: ViewerFilterStyle | undefined;
  // The saved views store, made by the first style that draws views and brings one (views add-on).
  private _vs: ViewsStore | undefined;
  private _unStyle: (() => void) | undefined;
  // The list's width (.dv-root's), for a style's fallback: watched by a ResizeObserver only while
  // the style asked for has a fallback; before its first answer, the element's own width.
  private _width: number | undefined;
  private _ro: ResizeObserver | undefined;
  private _roOn: Element | undefined;
  declare _configuring: boolean;
  declare _failReason: string | undefined;
  // Config: the newest setup wins; its on handlers are kept so they can be taken off again.
  private _cfgSeq = 0;
  private _cfgOn: [string, (e: Event) => void][] = [];
  private _retry: (() => void) | undefined;
  /**
   * Rows without href fire dv-open from a button (the first cell, the card's title). That is the
   * default when columns are set from script; a viewer whose columns are written in HTML has no
   * script listening, so its rows are plain text unless it says open-event.
   */
  declare openEvent: boolean;
  private _fromMarkup = false;
  /** The child tag read as columns in HTML; define() sets it per registered name. */
  static columnTag = 'lfdln-dv-column';
  declare _q: AddressQuery;
  declare _searchText: string;
  // filter-style="search": the text typed in its field, not yet searched.
  declare _typed: string;
  declare _ask: Ask<T> | undefined;
  declare _failed: boolean;
  private _uid = nextId('dv'); // unique on the page, even beside other copies of the menu code
  // Custom cards (a card template): built once per row object and kept between drawings.
  private _custom = new CustomCards<T>({
    uid: this._uid,
    href: (row) => safeUrl(this._parts(row).href),
    opens: () => this._opens,
    fields: (row) => ({
      text: (k) => fieldText(k, row, this.columns, this.lang || undefined),
      value: (k) => {
        const c = this.columns.find((x) => x.key === k);
        return c?.value ? c.value(row) : fieldValue(row, k);
      },
      url: safeUrl,
    }),
    text: (row, k) => fieldText(k, row, this.columns, this.lang || undefined),
    menu: (row, id) => {
      const p = this._parts(row);
      return renderMenu(p.menu, id, this.text.menuFor(p.title), (item, button) => this._pick(item, row, button));
    },
    actions: (row, id) => {
      const p = this._parts(row);
      return renderCardActions(p, this._hooks(row, p, id));
    },
    open: (row) => this._open(row),
    action: (row, id, label) => this._action(id, row, { id, label }),
    box: (row) => this._box(row) ?? nothing,
    ticked: (row) => this._ticked(row),
  });

  private _timer: ReturnType<typeof setTimeout> | undefined;
  // Set when the host hands over rows or a total, so busy clears even if the host
  // answered inside its dv-query listener (same update as the busy flag).
  private _answered = false;
  private _rows: T[] = [];
  private _total: number | undefined;

  // Loading through an adapter. Each load gets a number; only the latest one's answer is used,
  // even when an adapter ignores the abort signal (an older answer must not replace newer rows).
  private _seq = 0;
  private _ctrl: AbortController | undefined;
  private _loadQueued = false;
  private _unwait: (() => void) | undefined;
  private _mode: LoadMode = 'unknown';
  private _stale = false; // a load was cut off by leaving the page
  // Server mode: the open filter draft's count, asked of the adapter (see _askCount).
  private _countFor = new DraftCount(() => this.requestUpdate());
  // ... and the typed text's (filter-style="search").
  private _typedCount = new DraftCount(() => this.requestUpdate());
  // The page size the host was last told about (undefined: none yet), and the page last drawn.
  private _toldSize: number | undefined;
  private _page = 1;

  get rows(): T[] {
    return this._rows;
  }
  set rows(v: T[]) {
    const old = this._rows;
    this._rows = v;
    this._answered = true;
    this.requestUpdate('rows', old);
  }
  get total(): number | undefined {
    return this._total;
  }
  set total(v: number | undefined) {
    const old = this._total;
    this._total = v;
    this._answered = true;
    this.requestUpdate('total', old);
  }
  private _onPop = () => this._readAddress(true);

  constructor() {
    super();
    this.label = '';
    this.columns = [];
    this.pageSize = 20;
    this.layout = undefined;
    this.compact = false;
    this.openEvent = false;
    this.words = {};
    this.busy = false;
    this._q = { ...blank };
    this._searchText = this._typed = '';
    this._failed = false;
    this._configuring = false;
    this.searchIn = false;
    this._fDraft = null;
    this._fActive = null;
    this._fMenu = null;
    this._fSearch = '';
    this._fPhone = false;
    this._phone = false;
    this.selectable = false;
    this._sel = NONE;
  }

  // Light DOM, so page CSS reaches in.
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    addStyles(this.ownerDocument);
    this._fMedia = matchMedia(FILTER_PHONE);
    this._fMedia.addEventListener('change', this._onFMedia);
    this._onFMedia();
    this._unStyle = onFilterStyle(() => {
      if (this.filterStyle) this.requestUpdate();
    });
    this._unSel = onSelectAddon(() => {
      if (this.selectable) this.requestUpdate();
    });
    this._media = matchMedia(PHONE);
    this._media.addEventListener('change', this._onMedia);
    this._onMedia();
    this.layout = this._remembered('wide') ?? this.layout ?? 'table';
    this.phoneLayout = this._remembered('phone') ?? this.phoneLayout;
    if (this._prefix) {
      window.addEventListener('popstate', this._onPop);
      this._readAddress(false);
    }
    // Back on the page after a load was cut off: ask again.
    if (this.hasUpdated && this._stale) this._requestLoad();
    // The config's handlers come back with the element (never twice: same functions).
    for (const [type, fn] of this._cfgOn) this.addEventListener(type, fn);
    // Custom cards mounted by cardMount were cleaned up on leaving: mount them again.
    if (this.hasUpdated) this.requestUpdate();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this._onPop);
    this._fMedia?.removeEventListener('change', this._onFMedia);
    this._media?.removeEventListener('change', this._onMedia);
    this._unStyle?.();
    this._unStyle = undefined;
    this._unSel?.();
    this._unSel = undefined;
    this._ro?.disconnect();
    this._ro = this._roOn = undefined;
    this._fDraft = null;
    this._countFor.stop();
    this._typedCount.stop();
    this._vs?.stop();
    for (const [type, fn] of this._cfgOn) this.removeEventListener(type, fn);
    clearTimeout(this._timer);
    // A load still running or waiting for its adapter is dropped, and redone on return.
    if (this._ctrl || this._unwait || this._loadQueued) this._stale = true;
    this._ctrl?.abort();
    this._ctrl = undefined;
    this._unwait?.();
    this._unwait = undefined;
    this._seq++;
    this._custom.unmountAll();
  }

  // HTML only: what the markup says, read before the first drawing clears the children. The
  // columns are children; adapter and src are attributes (Lit has usually read them already).
  private _readMarkup(): void {
    if (!this.columns?.length) {
      const cols = columnsIn<T>(this, (this.constructor as typeof LfdlnDataViewer).columnTag);
      if (cols.length) {
        this.columns = cols;
        this._fromMarkup = true;
      }
    }
    // A card template written as a child: <template card>.
    this._tplChild = [...this.children].find((c): c is HTMLTemplateElement => c instanceof HTMLTemplateElement && c.hasAttribute('card'));
    this.adapter ??= this.getAttribute('adapter') ?? undefined;
    this.src ??= this.getAttribute('src') ?? undefined;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    // HTML only: before the first drawing, columns written as children are read (when no
    // columns were given), then the children go, since the viewer draws into its own light DOM.
    if (!this.hasUpdated) {
      this._readMarkup();
      this.replaceChildren();
    }
    if (!this.hasUpdated || changed.has('cardTemplateId')) this._findTemplate();
    if (changed.has('columns')) this._custom.forget(); // {{key}} follows the columns' formats
    // A config module: load it (again when the attribute changes).
    if (changed.has('config') && (this.config ?? '').trim()) void this._fromModule(this.config!.trim());
    // A new adapter or address: start again from the first answer.
    if ((changed.has('adapter') || changed.has('src')) && this._adapted) {
      this._mode = 'unknown';
      this._failed = false;
      this._requestLoad();
    }
    if (changed.has('state') && this.state) {
      this._q = tidy({ ...this._q, ...this.state });
      this._searchText = this._q.search;
      this._untype();
    }
    if (this.selectable && !selectAddon()) warnNoSelect();
    // A new search, "Search in", filters or view clears the selection (sorting and paging don't).
    const oldQ = changed.get('_q') as AddressQuery | undefined;
    if (oldQ && this._sel !== NONE && scopeOf(oldQ) !== scopeOf(this._q)) this._setSel(NONE);
    // New rows: in server mode, under "all matching", they join the rows seen (and are ticked); in
    // browser mode keys whose rows are gone are dropped, with no event.
    if (changed.has('rows')) {
      if (this._server) { if (this.selectable && this._sel.all) this._sel = seen(this._sel, this._keys(this.rows ?? [])); }
      else if (this._sel !== NONE) this._setSel(keep(this._sel, new Set(this._keys(this.rows ?? []))), false);
    }
    // rememberAs is often set after the element connects; the stored choices still win.
    if (changed.has('rememberAs')) {
      const wide = this._remembered('wide');
      const phone = this._remembered('phone');
      if (wide) this.layout = wide;
      if (phone) this.phoneLayout = phone;
    }
    // A remembered page size, when the address names none (the address wins). It goes into the
    // address too, so Back from a later entry returns to what is on screen now.
    if ((!this.hasUpdated || changed.has('rememberAs') || changed.has('pageSizes') || changed.has('pageSize'))
      && !this._choices.includes(this._q.size ?? NaN)) {
      const stored = this._storedSize();
      if (stored !== undefined && this._choices.includes(stored)) {
        this._q = { ...this._q, size: stored };
        this._writeAddress(true);
      }
    }
    // The size in use changed without a pick (restored from the address or storage before the
    // list of sizes arrived, or new sizes from the host): ask for rows of that size.
    if (this._choices.length && this._size !== (this._toldSize ?? pageSizeOf(this.pageSize))) this._announce();
    this._toldSize ??= this._size;
    // A server page past the end (an old bookmark, or rows deleted) moves to the last page, but
    // only once the host has answered the query: a placeholder total (0 before the first answer)
    // must not move a bookmarked page. This runs first, so a host that answers the new query at
    // once still clears busy below.
    if (this._server && this._answered) {
      const pages = Math.max(1, Math.ceil((Number(this.total) || 0) / this._size));
      const page = Math.min(Math.max(1, this._q.page), pages);
      if (page !== this._q.page) this._change({ page }, true);
    }
    // New rows or a new total from the host answer the last query in server mode.
    if (this._answered && this._server) this.busy = false;
    this._answered = false;
    this._pickStyle();
    // After the style, which may drop the draft (Lit adds that change to `changed`).
    if (changed.has('_fDraft')) this._askCount();
  }

  // The filter style for this drawing, after its fallback for the list's width and layout.
  // Another style (a new filter-style, a style registered late, a fallback) closes the filter
  // and drops its draft. Styles are compared by name: rail.js and columns.js each bundle their
  // own panel, so loading both registers a second "panel" object that is the same style.
  private _pickStyle(): void {
    const style = this._styleFor();
    if (!sameFilterStyle(style, this._fStyle) && this.hasUpdated) {
      this._fDraft = null;
      this._fMenu = null;
      this._untype();
    }
    this._fStyle = style;
    style?.styles();
  }

  // No filter-style: no lookup, and no width read (it forces a layout). Before the observer's
  // first answer the width is .dv-root's, or before the first drawing the parent's (the element
  // itself is inline, so it has none of its own).
  private _styleFor(): ViewerFilterStyle | undefined {
    if (!this.filterStyle) return undefined;
    const width = this._width ?? (this.querySelector(':scope > .dv-root') ?? this.parentElement)?.clientWidth ?? 0;
    return pickFilterStyle(this.filterStyle, { width, layout: this._shown });
  }

  /**
   * The ticked keys, in the order they were ticked. Under "all matching" in browser mode, every
   * matching row's key but the unticked ones; in server mode, the keys on the pages seen. Setting
   * it replaces the selection (keys become strings; empty and repeated ones go) and fires nothing.
   */
  get selected(): string[] {
    return this._selKeys(this._sel);
  }
  private _selKeys(s: Selection): string[] {
    if (!s.all || this._server) return [...s.keys];
    return this._keys(narrow(this.rows ?? [], this.columns, this._q, { views: this.views, searchKeys: this.searchKeys }))
      .filter((k) => !s.except.includes(k));
  }
  set selected(keys: (string | number)[]) {
    this._setSel({ keys: [...new Set((keys ?? []).filter((k) => k !== '' && k != null).map(String))], all: false, except: [] }, false);
  }

  /** True after "Select all N matching". */
  get selectedAll(): boolean {
    return this._sel.all;
  }

  /** Clears the selection and fires dv-select. */
  clearSelection(): void {
    this._setSel(NONE);
  }

  // Every change goes through here. A selection that counts 0 is none (and the rows seen go).
  // Under "all matching" in browser mode the count is the rows' own (rows may have just been set
  // again); otherwise the rows matching are the last drawing's (null before an adapter's first
  // answer). In server mode the rows on screen join those seen once anything is ticked.
  private _setSel(next: Selection, fire = true): void {
    if (!(next.all && !this._server ? this._selKeys(next).length : countOf(next, this._selNow?.v.matching ?? null))) {
      next = NONE;
      this._seen = new Map();
    }
    this._sel = next;
    if (this._server && next !== NONE) this._keys(this.rows ?? []);
    if (fire) this.dispatchEvent(new CustomEvent('dv-select', { detail: { keys: this._selKeys(next), all: next.all, except: [...next.except] }, bubbles: true, composed: true }));
  }

  // The rows' keys (rows without one left out). In server mode, while anything is ticked, a
  // selectable list also keeps each row by its key, among the rows seen (for dv-batch's rows).
  private _keys(rows: T[]): string[] {
    const out: string[] = [];
    for (const r of rows) {
      const k = keyOf(r, this.rowKey);
      if (k === undefined) continue;
      out.push(k);
      if (this.selectable && this._server && this._sel !== NONE) this._seen.set(k, r);
    }
    return out;
  }

  // What the add-on draws from, for this page's tickable keys. The select-all line: never in a
  // compact list or without a known total; offered once the page is ticked and more rows match
  // than it holds (all its rows, those without a key too), and kept while "all matching" is on.
  private _selView(keys: string[], rows: number, matching: number | null): SelectView {
    const s = this._sel;
    const page = pageState(s, keys);
    return {
      count: countOf(s, matching), all: s.all, page, pageCount: keys.length, matching,
      offerAll: !this.compact && matching !== null && (s.all || (page === 'all' && matching > rows)),
      actions: this.batchActions ?? [], words: this.words ?? {}, rowKey: this.rowKey, num: (n) => this._num(n), uid: `${this._uid}-x`,
    };
  }

  private _selOn(keys: string[]): SelectHandlers {
    return {
      onPage: (on) => this._setSel(tickPage(this._sel, keys, on)),
      onAll: () => this._setSel(tickAll(this._sel, keys)),
      onClear: () => this._setSel(NONE),
      // dv-batch: the keys, their rows (browser mode: from rows; server mode: from the pages seen),
      // and the query. Unless the page prevents it, the selection then clears (and dv-select fires).
      onAction: (item) => {
        if (item.disabled) return;
        const s = this._sel;
        const keys = this.selected;
        const by = this._server ? this._seen : new Map((this.rows ?? []).map((r) => [keyOf(r, this.rowKey), r]));
        if (this.dispatchEvent(new CustomEvent('dv-batch', {
          detail: { action: item.id, keys, rows: keys.map((k) => by.get(k)).filter((r) => r !== undefined), all: s.all, except: [...s.except], query: this._query },
          bubbles: true, composed: true, cancelable: true,
        }))) this._setSel(NONE);
      },
    };
  }

  // One row's box (nothing without the add-on). The row's name is its card title, as its menu's.
  private _box(row: T): TemplateResult | undefined {
    const n = this._selNow;
    if (!n) return undefined;
    const key = keyOf(row, this.rowKey);
    return n.a.box({ key, name: this._parts(row).title, ticked: this._ticked(row) }, n.v,
      (on) => key !== undefined && this._setSel(tick(this._sel, key, on)), selectKit);
  }

  private _ticked(row: T): boolean {
    const key = this._selNow ? keyOf(row, this.rowKey) : undefined;
    return key !== undefined && ticked(this._sel, key);
  }

  /** The words in use: the defaults with the page's own on top. */
  get text(): Words {
    return { ...defaultWords, ...this.words };
  }

  // The page size in use: the visitor's pick when it is one of the choices, else page-size.
  // A bad page-size attribute ("abc", "0") pages by 20, not by NaN.
  private get _size(): number {
    const pick = this._q.size;
    return pick !== undefined && this._choices.includes(pick) ? pick : pageSizeOf(this.pageSize);
  }

  // The picker's sizes (page-size added in order), or [] for no picker. One size is no choice.
  private get _choices(): number[] {
    const sizes = pageSizeChoices(this.pageSizes, pageSizeOf(this.pageSize));
    return sizes.length > 1 ? sizes : [];
  }

  // The query as the host and adapters see it: always with the size in use.
  private get _query(): Query {
    return { ...this._q, size: this._size };
  }

  private get _sizeKey(): string | undefined {
    return this.rememberAs ? `${this.rememberAs}.size` : undefined;
  }

  private _storedSize(): number | undefined {
    if (!this._sizeKey) return undefined;
    try {
      const n = Number(localStorage.getItem(this._sizeKey));
      return Number.isInteger(n) && n >= 1 ? n : undefined;
    } catch {
      return undefined; // storage blocked: just don't remember
    }
  }

  private get _server(): boolean {
    return this.total !== undefined && this.total !== null;
  }

  // An adapter is enough: src is passed on ('' when unset), and the adapter decides if it needs it.
  private get _adapted(): boolean {
    return Boolean(this.adapter?.trim());
  }

  // Whether a row without href is drawn as something that fires dv-open (see openEvent).
  private get _opens(): boolean {
    return this.openEvent || !this._fromMarkup;
  }

  private get _prefix(): string {
    return (this.urlState ?? '').trim();
  }

  // The layout drawn: on a phone, cards unless phone-layout="table"; else a table unless
  // layout="cards".
  private get _shown(): Layout {
    return this._phone ? (this.phoneLayout === 'table' ? 'table' : 'cards') : (this.layout === 'cards' ? 'cards' : 'table');
  }

  // A stored layout choice for one mode: wide screens under <remember-as>, phones under
  // <remember-as>.phone.
  private _layoutKey(mode: 'wide' | 'phone'): string | undefined {
    return this.rememberAs ? (mode === 'phone' ? `${this.rememberAs}.phone` : this.rememberAs) : undefined;
  }

  private _remembered(mode: 'wide' | 'phone'): Layout | undefined {
    const key = this._layoutKey(mode);
    if (!key) return undefined;
    try {
      const v = localStorage.getItem(key);
      return v === 'table' || v === 'cards' ? v : undefined;
    } catch {
      return undefined; // storage blocked: just don't remember
    }
  }

  private _readAddress(announce: boolean): void {
    const q = readQuery(new URLSearchParams(location.search), this._prefix, this._filterKinds);
    clearTimeout(this._timer);
    this._q = q;
    this._searchText = q.search;
    this._untype();
    // A restored or Back-button state that isn't the default needs the host's rows.
    if (announce || JSON.stringify(q) !== JSON.stringify(blank)) this._announce();
    // (A size from the address that the list of sizes, set later, makes valid is asked for in willUpdate.)
  }

  private _writeAddress(replace: boolean): void {
    if (!this._prefix) return;
    const params = writeQuery(new URLSearchParams(location.search), this._prefix, this._query, this._startSize);
    const search = params.toString();
    const url = `${location.pathname}${search ? `?${search}` : ''}${location.hash}`;
    if (url === `${location.pathname}${location.search}${location.hash}`) return;
    if (replace) history.replaceState(history.state, '', url);
    else history.pushState(history.state, '', url);
  }

  // The starting size for the address: only a list with a picker puts its size there.
  private get _startSize(): number | undefined {
    return this._choices.length ? pageSizeOf(this.pageSize) : undefined;
  }

  private _announce(): void {
    this._answered = false;
    if (this._server) this.busy = true;
    this._toldSize = this._size;
    this.dispatchEvent(new CustomEvent<Query>('dv-query', { detail: this._query, bubbles: true, composed: true }));
    // With an adapter the element answers itself, unless it already has every row.
    if (this._adapted && this._mode !== 'browser') this._requestLoad();
  }

  // Several changes in one task (address, attributes, a page clamp) make one load.
  private _requestLoad(): void {
    if (this._loadQueued) return;
    this._loadQueued = true;
    queueMicrotask(() => {
      this._loadQueued = false;
      void this._load();
    });
  }

  private async _load(): Promise<void> {
    if (!this._adapted || !this.isConnected) return;
    this._stale = false;
    this._ctrl?.abort(); // a newer query cancels the one still running
    this._ctrl = undefined;
    this._unwait?.();
    this._unwait = undefined;
    const seq = ++this._seq;
    this.busy = true;
    const name = this.adapter!.trim();
    const adapter = adapterNamed(name);
    if (!adapter) {
      // Its script hasn't run yet: wait for it to register, no polling.
      this._unwait = whenRegistered(name, () => {
        this._unwait = undefined;
        this._requestLoad();
      });
      return;
    }
    const ctrl = new AbortController();
    this._ctrl = ctrl;
    try {
      const out = await adapter.load(this._query, { signal: ctrl.signal, src: (this.src ?? '').trim(), pageSize: this._size });
      if (seq !== this._seq) return; // a newer load was asked for meanwhile
      this._mode = out.total === undefined || out.total === null ? 'browser' : 'server';
      this._failed = false;
      this.total = this._mode === 'server' ? out.total : undefined;
      this.facets = out.facets;
      this.rows = (out.rows ?? []) as T[];
      this.busy = false;
    } catch (err) {
      if (seq !== this._seq) return; // cancelled, or overtaken: not this query's failure
      // The last rows stay; the error box offers Try again. The reason is for developers.
      this._failed = true;
      this.busy = false;
      console.warn(err);
    } finally {
      if (this._ctrl === ctrl) this._ctrl = undefined;
    }
  }

  // A filter style in server mode with an adapter: ask for the open draft's count
  // (adapter.count, else a load of one row and its total), 300 ms after the draft last changed.
  // Otherwise (today's dialog shows no count), or once the draft is closed, there is none
  // (browser mode counts in _styled).
  private _askCount(): void {
    const sections = this._fDraft !== null ? this._sections() : [];
    this._count(this._countFor, sections.length ? { ...this._draftQ, filters: normalise(sections, this._fDraft!) } : undefined);
  }

  // A style that draws views saves a draft as filters + search with view '' (views-store), so while
  // its builder is open the preview and the counts drop the page view too: what you see is saved.
  private get _draftQ(): Partial<Query> {
    return this._fStyle?.drawsViews ? { view: '' } : {};
  }

  // Asks `into` for the count of the query with `over` on top, as _askCount says; none: stops it.
  private _count(into: DraftCount, over?: Partial<Query>): void {
    const adapter = over && this._fStyle && this._adapted && this._server ? adapterNamed(this.adapter!.trim()) : undefined;
    if (!adapter) return into.stop();
    const q: Query = { ...this._query, page: 1, ...over };
    const src = (this.src ?? '').trim();
    into.ask((signal) => adapter.count
      ? adapter.count(q, { signal, src })
      : adapter.load({ ...q, size: 1 }, { signal, src, pageSize: 1 }).then((a) => a.total));
  }

  /**
   * Sets the list up from a config: an object of properties (plus `on` handlers and `load`), or a
   * function that gets the element. Replaces the previous config and its handlers. Properties set
   * on the element afterwards win. See also the `config` attribute and configure().
   */
  configure(config: ListConfig<T>): Promise<void> {
    return this._use(config, ++this._cfgSeq, 'configure()');
  }

  private async _fromModule(spec: string): Promise<void> {
    const seq = ++this._cfgSeq;
    this._configuring = true;
    this.busy = true;
    let mod: { default?: unknown };
    try {
      // Read against the page (not this script), and left alone by bundlers.
      mod = await import(/* @vite-ignore */ new URL(spec, document.baseURI).href);
    } catch (err) {
      if (seq !== this._cfgSeq) return;
      this._fail(this.text.configFailed(spec), () => void this._fromModule(spec), err);
      return;
    }
    if (seq !== this._cfgSeq) return;
    await this._use(mod.default as ListConfig<T>, seq, spec);
  }

  private _fail(reason: string | undefined, retry: () => void, err: unknown): void {
    this._configuring = false;
    this._failed = true;
    this._failReason = reason;
    this._retry = retry;
    this.busy = false;
    console.error(err);
  }

  private async _use(config: ListConfig<T>, seq: number, name: string): Promise<void> {
    this._configuring = true;
    this.busy = true;
    let setup: unknown = config;
    try {
      if (typeof config === 'function') setup = await config(this);
    } catch (err) {
      if (seq === this._cfgSeq) this._fail(this.text.configFailed(name), () => void this._use(config, ++this._cfgSeq, name), err);
      return;
    }
    if (seq !== this._cfgSeq) return;
    const split = splitConfig(setup ?? {});
    for (const k of newWarnings(split.unknown, warnedKeys)) console.warn(`<lfdln-data-viewer> config ${name}: unknown key "${k}" ignored`);
    for (const p of split.problems) console.warn(`<lfdln-data-viewer> config ${name}: ${p}, ignored`);
    for (const [type, fn] of this._cfgOn) this.removeEventListener(type, fn);
    this._cfgOn = split.on;
    for (const [type, fn] of this._cfgOn) this.addEventListener(type, fn);
    const self = this as unknown as Record<string, unknown>;
    for (const [k, v] of split.props) self[k] = v;
    this._failed = false;
    this._failReason = undefined;
    this._retry = undefined;
    if (split.load) {
      const load = split.load as unknown as (list: this) => unknown;
      try {
        const rows = await load(this);
        if (seq !== this._cfgSeq) return;
        this.rows = (Array.isArray(rows) ? rows : []) as T[];
      } catch (err) {
        if (seq === this._cfgSeq) this._fail(undefined, () => void this._use(config, ++this._cfgSeq, name), err);
        return;
      }
    }
    this._configuring = false;
    // An adapter set by the config says when it is busy itself.
    if (!this._adapted) this.busy = false;
  }

  // One change to what is shown: store it, put it in the address, tell the host. "Search in" and
  // the filters are left out of the query when unset, so hosts see them only when they matter.
  /** @internal views add-on contract (ViewsHost): keep its name and signature. */
  _change(over: Partial<AddressQuery>, replace = false): void {
    this._q = tidy({ ...this._q, ...over });
    this._writeAddress(replace);
    this._announce();
  }

  // card-template names a <template> on the page (looked up again when it changes); a missing
  // one gives the built-in card and one warning. Without it, the <template card> child.
  private _findTemplate(): void {
    const id = (this.cardTemplateId ?? '').trim();
    if (!id) {
      this._tpl = this._tplChild;
      return;
    }
    const el = this.ownerDocument.getElementById(id);
    this._tpl = el instanceof HTMLTemplateElement ? el : undefined;
    if (!this._tpl && !warnedIds.has(id)) {
      warnedIds.add(id);
      console.warn(`<lfdln-data-viewer> card-template="${id}": no <template> with that id; the built-in card is used`);
    }
  }

  // Where custom cards come from, if anywhere: cardMount, then cardTemplate, then a template.
  private get _source(): CardSource<T> | undefined {
    if (this.cardMount) return { kind: 'mount', fn: this.cardMount };
    if (this.cardTemplate) return { kind: 'lit', fn: this.cardTemplate };
    return this._tpl ? { kind: 'html', plan: planOf(this._tpl) } : undefined;
  }

  protected override updated(): void {
    this._custom.after();
    this._watchWidth();
  }

  // A ResizeObserver on .dv-root while the style asked for has a fallback (rail: the panel under
  // 720 px) or a narrowBelow (search: the bottom sheet under 480 px), so a list that narrows or
  // widens without a new drawing switches; none otherwise.
  private _watchWidth(): void {
    const asked = this.filterStyle ? filterStyle(this.filterStyle.trim().toLowerCase()) : undefined;
    const root = ((asked?.fallback || asked?.narrowBelow) && this.querySelector(':scope > .dv-root')) || undefined;
    if (root === this._roOn) return;
    this._ro?.disconnect();
    this._roOn = root;
    // A width from a root no longer watched is stale: the next pick reads the root afresh.
    this._width = undefined;
    // A new width draws again only when it changes the style (every pixel would redraw the list),
    // and on the next frame: drawing inside the callback resizes .dv-root again in the same frame,
    // which the browser reports as a "ResizeObserver loop" error.
    this._ro = root ? new ResizeObserver(([e]) => {
      const narrow = this._narrow();
      this._width = Math.round(e!.contentRect.width);
      if (!sameFilterStyle(this._styleFor(), this._fStyle) || narrow !== this._narrow()) requestAnimationFrame(() => this.isConnected && this.requestUpdate());
    }) : undefined;
    this._ro?.observe(root!);
  }

  private _open(row: T): void {
    this.dispatchEvent(new CustomEvent('dv-open', { detail: { row }, bubbles: true, composed: true }));
  }

  // item: what a data-action element in a custom card said (its id and its text).
  private _action(id: string, row: T, item?: { id: string; label: string }): void {
    this.dispatchEvent(new CustomEvent('dv-action', { detail: item ? { id, item, row } : { id, row }, bubbles: true, composed: true }));
  }

  // A menu choice. Only an item with confirm text is asked about here; the host asks for the rest.
  private _pick(item: MenuItem, row: T, button: HTMLElement): void {
    if (!item.confirm) return this._action(item.id, row);
    this._ask = { item, row, button };
    void this.updateComplete.then(() =>
      openConfirm(this.querySelector<HTMLDialogElement>(':scope > .dv-root > dialog.lfdln-menu-confirm')));
  }

  // Closing by Cancel, Escape or OK all land here; only OK sets returnValue to "ok".
  private _onConfirmClose(e: Event): void {
    const ask = this._ask;
    this._ask = undefined;
    if (!ask) return;
    ask.button.focus();
    if ((e.currentTarget as HTMLDialogElement).returnValue === 'ok') this._action(ask.item.id, ask.row);
  }

  // What a server can do with filters and "Search in" (its adapter's supports; else everything).
  private get _supports(): AdapterSupports | undefined {
    return this._adapted ? adapterNamed(this.adapter!.trim())?.supports : undefined;
  }

  // How each filterable column's value is written in the address.
  private get _filterKinds(): FilterKinds {
    const kinds: FilterKinds = {};
    for (const c of this.columns ?? []) {
      const k = c.filterable ? filterKind(c) : null;
      if (k) kinds[c.key] = k;
    }
    return kinds;
  }

  private _searchNow(over: Partial<AddressQuery> = {}): void {
    clearTimeout(this._timer);
    const search = this._searchText.trim();
    const next = { search, ...over };
    if (search === this._q.search && Object.entries(over).every(([k, v]) => this._q[k as keyof AddressQuery] === v)) return;
    this._change({ ...next, page: 1 }, true);
  }

  private _searchBox(w: Words): TemplateResult {
    const supports = this._supports;
    const fields = searchColumns(this.columns ?? [], this.searchKeys).map((c) => ({ key: c.key, label: c.label }));
    const submit = Boolean(this.searchSubmitLabel);
    return renderSearch({
      value: this._searchText,
      in: this._q.searchIn ?? '',
      fields,
      searchIn: this.searchIn && supports?.searchIn !== false && fields.length > 1,
      submitLabel: this.searchSubmitLabel || undefined,
      submit,
      label: w.search,
      words: w,
      uid: `${this._uid}-s`,
    }, {
      onInput: (text) => {
        this._searchText = text;
        if (submit) return;
        clearTimeout(this._timer);
        this._timer = setTimeout(() => this._searchNow(), DEBOUNCE_MS);
      },
      onIn: (key) => {
        if (this._searchText.trim() || !submit) return this._searchNow({ searchIn: key || undefined });
        this._q = tidy({ ...this._q, searchIn: key || undefined });
        this._writeAddress(true);
      },
      onSubmit: () => this._searchNow(),
      onClear: () => {
        this._searchText = '';
        this._searchNow();
      },
    });
  }

  private _applyFilters(value: FilterValue, sections: FilterSection[]): void {
    this._change({ filters: normalise(sections, value), page: 1 });
  }

  // What the filter shows and does: the dialog's, and the start of a style's.
  private _filterView(w: Words, sections: FilterSection[]): FilterView {
    return {
      sections,
      value: this._q.filters ?? {},
      draft: this._fDraft,
      open: this._fDraft !== null,
      active: this._fActive,
      phone: this._fPhone,
      optionSearch: this._fSearch,
      words: w,
      uid: `${this._uid}-f`,
      label: this.filterLabel || undefined,
    };
  }

  private _filterHandlers(sections: FilterSection[]): FilterHandlers {
    return {
      onOpen: () => {
        this._fDraft = structuredClone(this._q.filters ?? {});
        this._fActive = this._fPhone ? null : sections[0]?.key ?? null;
        this._fSearch = '';
      },
      onClose: () => {
        this._fDraft = null;
        this._fSearch = '';
      },
      onSection: (key) => {
        this._fActive = key;
        this._fSearch = '';
      },
      onDraft: (next) => {
        if (this._fDraft !== null) this._fDraft = next;
      },
      onOptionSearch: (text) => {
        this._fSearch = text;
      },
      onApply: () => {
        const draft = this._fDraft ?? {};
        this._fDraft = null;
        this._fSearch = '';
        this._applyFilters(draft, sections);
      },
      onClearAll: () => {
        this._fDraft = {};
        this._applyFilters({}, sections);
      },
    };
  }

  // The style's view and handlers. results: the rows the applied filters leave; total: all rows
  // in browser mode (null in server mode). countFor: the rows the open draft would leave, at
  // once in browser mode, from the server in server mode (null: no draft, or not known yet).
  // A style that replaces the search gets the search too, with the count of the typed text
  // (counted the same way); "Search in" fields as the search box would offer them.
  private _styled(w: Words, sections: FilterSection[], results: number | null): { view: FilterStyleView; on: FilterStyleHandlers } {
    const count = (q: Partial<Query>, server?: DraftCount) => results === null ? null : this._server ? server!.value
      : countMatching(this.rows ?? [], this.columns, { ...this._q, ...q }, { views: this.views, searchKeys: this.searchKeys });
    const typed = this._typed.trim();
    // A style that draws views: the tabs and handlers of the saved views store its add-on brings.
    const style = this._fStyle!;
    // One store per viewer for its lifetime: a later views style (or a style switch) keeps it.
    const vs = style.drawsViews ? (this._vs ??= style.store(this)).draw(sections, count) : undefined;
    const fields = searchColumns(this.columns, this.searchKeys).map((c) => ({ key: c.key, label: c.label }));
    return {
      view: {
        ...this._filterView(w, sections),
        phone: this._fPhone || this._narrow(),
        countFor: this._fDraft === null ? null : count({ ...this._draftQ, filters: normalise(sections, this._fDraft) }, this._countFor),
        search: {
          text: this._q.search,
          in: this._q.searchIn ?? '',
          fields: this.searchIn && this._supports?.searchIn !== false && fields.length > 1 ? fields : [],
          only: fields.length === 1 ? fields[0]!.label : null,
          typed: this._typed,
          typedCount: typed ? count({ search: typed }, this._typedCount) : null,
        },
        results,
        total: this._server ? null : (this.rows ?? []).length,
        menu: this._fMenu,
        // The list's box, for a style's popovers (the panel right-aligns against it).
        bounds: () => (this.querySelector(':scope > .dv-root') ?? this).getBoundingClientRect(),
        ...vs?.view,
      },
      on: {
        ...this._filterHandlers(sections),
        onApplyNow: (next) => this._applyFilters(next, sections),
        onMenu: (key) => {
          this._fMenu = key;
        },
        // No searchIn: the "Search in" already applied; '' searches every column.
        onSearch: (text, searchIn) => {
          this._typedCount.stop();
          this._searchText = text;
          this._searchNow(searchIn === undefined ? {} : { searchIn: searchIn || undefined });
        },
        onTyped: (text) => {
          this._typed = text;
          this._count(this._typedCount, text.trim() ? { search: text.trim() } : undefined);
        },
        ...vs?.on,
      },
    };
  }

  // The search style's typed text goes (and its count) when the address, state or style changes.
  private _untype(): void {
    this._typed = '';
    this._typedCount.stop();
  }

  // Whether the list is narrower than the style's narrowBelow (then view.phone is set).
  private _narrow(): boolean {
    const below = this._fStyle?.narrowBelow;
    return Boolean(below && (this._width ?? below) < below);
  }

  private _filter(w: Words, sections: FilterSection[], styled?: { view: FilterStyleView; on: FilterStyleHandlers }): TemplateResult {
    if (this._fStyle && styled) return this._fStyle.render(styled.view, styled.on, viewerKit);
    return renderFilter(this._filterView(w, sections), this._filterHandlers(sections));
  }

  // The applied filters as chips under the bar. After a removal, focus goes to the next chip's
  // ×, or to the filter button when none is left.
  private _chips(w: Words, sections: FilterSection[]): TemplateResult | typeof nothing {
    if ((this.filterChips ?? '').trim().toLowerCase() === 'off' || this._fStyle?.showsApplied) return nothing;
    // The row is the root's child, or .dv-main's beside a side style; with none left, focus goes
    // to today's filter button, or else to the style's first control.
    const xsOf = () => [...this.querySelectorAll<HTMLElement>(CHIP_XS)];
    const refocus = (index: number) => void this.updateComplete.then(() => {
      const xs = xsOf();
      (xs[Math.min(index, xs.length - 1)] ?? this.querySelector<HTMLElement>(':scope > .dv-root .lfdln-filter-button')
        ?? this.querySelector<HTMLElement>(':scope > .dv-root :is(.dv-filter, .dv-side) :is(button, input)'))?.focus();
    });
    return renderFilterChips(sections, this._q.filters ?? {}, w, (chip) => {
      const xs = xsOf();
      const at = Math.max(0, xs.indexOf(document.activeElement as HTMLElement));
      this._applyFilters(removeChip(this._q.filters ?? {}, chip), sections);
      refocus(at);
    }, () => {
      this._applyFilters({}, sections);
      refocus(0);
    });
  }

  // The filter's sections: one per filterable column, with options from the rows (browser mode)
  // or the facets and column options (server mode). While a style's draft is open, the counts
  // follow the draft (today's dialog keeps counting the applied filters).
  private _sections(): FilterSection[] {
    if (!(this.columns ?? []).some((c) => c.filterable)) return [];
    return filterSections(this.columns, {
      rows: this._server ? undefined : this.rows ?? [],
      facets: this.facets,
      supports: this._supports,
      q: this._fStyle && this._fDraft ? { ...this._q, ...this._draftQ, filters: this._fDraft } : this._q,
      views: this.views,
      searchKeys: this.searchKeys,
      rangeCounts: Boolean(this._fStyle),
    });
  }

  private _sortBy(key: string): void {
    const dir = this._q.sort === key && this._q.dir === 'asc' ? 'desc' : 'asc';
    this._change({ sort: key, dir, page: 1 });
  }

  // The visitor picked a page size: keep the first row they were looking at on screen.
  private _setSize(size: number): void {
    if (size === this._size || !this._choices.includes(size)) return;
    const page = pageAfterResize(this._page, this._size, size);
    if (this._sizeKey) {
      try {
        localStorage.setItem(this._sizeKey, String(size));
      } catch {
        // storage blocked: the choice lasts until the page closes
      }
    }
    this._change({ size, page });
  }

  // A page button. Pressing a number turns it into the current page, which is no button, so
  // focus moves to the current page (focusable from script only) instead of being lost.
  private _goTo(page: number, number: boolean): void {
    this._change({ page });
    void this.updateComplete.then(() => focusCurrentPage(this.querySelector(':scope > .dv-root > .lfdln-pagination-nav, :scope > .dv-root > .dv-main > .lfdln-pagination-nav'), number));
  }

  // A switch press sets the layout for the mode on screen (phone or wide) and stores it for that mode.
  private _setLayout(layout: Layout): void {
    if (layout === this._shown) return;
    const mode = this._phone ? 'phone' : 'wide';
    if (mode === 'phone') this.phoneLayout = layout;
    else this.layout = layout;
    const key = this._layoutKey(mode);
    if (key) {
      try {
        localStorage.setItem(key, layout);
      } catch {
        // storage blocked: the choice lasts until the page closes
      }
    }
    this.dispatchEvent(new CustomEvent('dv-layout', { detail: { layout }, bubbles: true, composed: true }));
  }

  private _viewHref(key: string): string {
    if (!this._prefix) return '#';
    const params = writeQuery(new URLSearchParams(location.search), this._prefix, { ...this._query, view: key, page: 1 }, this._startSize);
    const s = params.toString();
    return `${location.pathname}${s ? `?${s}` : ''}`;
  }

  private _num(n: number): string {
    return formatNumber(n, this.lang || undefined);
  }

  protected override render(): TemplateResult {
    const w = this.text;
    let rows: T[];
    let total: number;
    let page: number;
    const sections = this.compact ? [] : this._sections();
    const style = this._fStyle;
    // A style that previews its draft (views) shows, in browser mode, the rows the draft leaves.
    const preview = !this._server && style?.previewsDraft && this._fDraft !== null;
    if (this._server) {
      rows = this.rows ?? [];
      total = Number(this.total) || 0;
      page = this._q.page;
    } else {
      const out = applyQuery(this.rows ?? [], this.columns, preview ? { ...this._query, ...this._draftQ, filters: normalise(sections, this._fDraft!), page: 1 } : this._query, {
        views: this.views,
        searchKeys: this.searchKeys,
        pageSize: this._size,
      });
      ({ rows, total, page } = out);
    }
    this._page = page;
    this._custom.reset();
    // Before an adapter's first answer there is nothing to say yet ("Nothing to show." would be wrong).
    const first = ((this._adapted && this._mode === 'unknown') || this._configuring) && !this._failed && rows.length === 0;
    // A load that failed with no rows to keep shows only the error box.
    const failedEmpty = this._failed && rows.length === 0;

    // With a filter style: what it is drawn from, shared by the bar and the table's header hook.
    // results is not known before an adapter's first answer; a host's own total is.
    const styled = this._fStyle && sections.length
      ? this._styled(w, sections, this._adapted && this._mode === 'unknown' ? null : total)
      : undefined;
    // A style's open draft (not one that applies at once) dims the results behind it.
    const dim = style && !style.instant && !preview && this._fDraft !== null;
    // A style drawn beside the list (rail) gets a column of its own; the rest go in .dv-main.
    const side = Boolean(styled && this._fStyle!.side);
    // A style drawn in the table's headers (columns) has nothing in the bar, and keeps the
    // headers even with no rows, so a pick that leaves nothing can be undone there. The layout
    // test looks like a repeat of columns' own cards fallback, but `_pickStyle` (in willUpdate)
    // only applies a fallback a style declares: a header-hook style without one has no headers
    // in cards view, so it is drawn in the bar like any other style.
    const inHead = Boolean(styled && this._fStyle!.header && this._shown !== 'cards');
    // A style drawn above the bar (views, sentence), full width.
    const above = Boolean(styled && style!.above);
    // Selectable with the add-on: its boxes, and its bar in .dv-bar's place while anything is
    // ticked (above the list in a compact one). Like the bar, .dv-above is hidden while selecting.
    const addon = this.selectable ? selectAddon() : undefined;
    this._selNow = undefined;
    let selBar: TemplateResult | undefined;
    if (addon) {
      addon.styles();
      const keys = this._keys(rows);
      const v = this._selView(keys, rows.length, this._adapted && this._mode === 'unknown' ? null : total);
      this._selNow = { a: addon, v, on: this._selOn(keys) };
      if (v.count) selBar = addon.bar(v, this._selNow.on, selectKit);
    }
    const main = html`
      ${above && !selBar ? html`<div class="dv-above">${this._filter(w, sections, styled)}</div>` : nothing}
      ${selBar ?? (this.compact ? nothing : this._bar(w, sections, styled, side || inHead || above))}
      ${this.compact ? nothing : styled && this._fStyle!.summary ? this._fStyle!.summary(styled.view, styled.on, viewerKit) : this._chips(w, sections)}
      ${this._failed
        ? html`<div class="dv-error" role="alert">
            <p>${this._failReason ?? w.loadFailed}</p>
            <button type="button" @click=${() => (this._retry ? this._retry() : this._requestLoad())}>${w.tryAgain}</button>
          </div>`
        : nothing}
      ${first || failedEmpty
        ? nothing
        : rows.length === 0
          ? html`${inHead ? this._table(rows, w, sections, styled) : nothing}<p class="dv-empty" aria-hidden="true">${(styled && style!.empty?.(styled.view)) || w.empty}</p>`
          : this._shown === 'cards'
            ? this._cards(rows)
            : this._table(rows, w, sections, styled)}
      ${this.compact || first || failedEmpty ? nothing : this._pages(w, page, total, rows.length)}`;
    return html`<div class="dv-root" aria-busy=${this.busy ? 'true' : 'false'} data-filter-open=${dim ? '' : nothing}
      data-filter-side=${side ? '' : nothing} data-selecting=${selBar ? '' : nothing}>${side
        ? html`<div class="dv-side">${this._filter(w, sections, styled)}</div><div class="dv-main">${main}</div>`
        : main}${this._confirm(w)}</div>`;
  }

  // elsewhere: the style is drawn beside the list (side) or in the headers, not in the bar.
  private _bar(w: Words, sections: FilterSection[], styled?: { view: FilterStyleView; on: FilterStyleHandlers }, elsewhere = false): TemplateResult {
    const one = styled && this._fStyle!.replacesSearch;
    return html`<div class="dv-bar">
      <div class=${one ? 'dv-search dv-search-filter' : 'dv-search'}>${one ? this._filter(w, sections, styled) : this._searchBox(w)}</div>
      ${sections.length && !elsewhere && !one ? html`<div class="dv-filter">${this._filter(w, sections, styled)}</div>` : nothing}
      ${this.views?.length && !(styled && this._fStyle!.drawsViews)
        ? html`<nav class="dv-views" aria-label=${w.views}>
            ${this.views.map((v) => {
              const current = v.key === this._q.view;
              return html`<a href=${this._viewHref(v.key)} aria-current=${current ? 'true' : nothing}
                @click=${(e: Event) => {
                  e.preventDefault();
                  if (!current) this._change({ view: v.key, page: 1 });
                }}>${v.label}${v.count !== undefined ? html` <span class="dv-count">${this._num(v.count)}</span>` : nothing}</a>`;
            })}
          </nav>`
        : nothing}
      ${this.layoutSwitch !== 'none'
        ? html`<div class="dv-layout" role="group">
            ${this._switchButton('table', this.tableLabel || w.showTable)}${this._switchButton('cards', this.cardsLabel || w.showCards)}
          </div>`
        : nothing}
    </div>`;
  }

  // One button of the layout switch. With icons only, the words stay as its name (hidden text)
  // and its title.
  private _switchButton(which: Layout, label: string): TemplateResult {
    const mode = this.layoutSwitch === 'icons' || this.layoutSwitch === 'both' ? this.layoutSwitch : 'text';
    const mine = this.layoutIcons?.[which];
    const icon = mine === undefined || mine === null
      ? (which === 'table' ? tableIcon : cardsIcon)
      : copyOf(mine);
    return html`<button type="button" aria-pressed=${this._shown === which ? 'true' : 'false'}
      title=${mode === 'icons' ? label : nothing} @click=${() => this._setLayout(which)}>${mode === 'text'
        ? nothing
        : html`<span class="dv-layout-icon" aria-hidden="true">${icon}</span>`}<span
      class=${mode === 'icons' ? 'dv-layout-text dv-sr' : 'dv-layout-text'}>${label}</span></button>`;
  }

  // One cell's drawing. Row text goes through text bindings, so it is always escaped;
  // only render() returning a Node or a TemplateResult can add markup.
  private _cell(col: Column<T>, row: T): Content | typeof nothing {
    if (col.render) return col.render(row);
    const text = formatCell(col, row, this.lang || undefined);
    const raw = col.value ? col.value(row) : (row as Record<string, unknown>)[col.key];
    switch (col.type) {
      case 'image': {
        const src = safeUrl(raw);
        return src ? html`<img src=${src} alt="" loading="lazy" />` : nothing;
      }
      case 'link': {
        const href = safeUrl(raw);
        return href ? html`<a href=${href}>${text}</a>` : text;
      }
      case 'badge':
        return text ? html`<span class="dv-badge">${text}</span>` : '';
      default:
        return text;
    }
  }

  // The first cell is the row's header: the card's picture (if any) beside the way in, which is
  // the card's link or a button that fires dv-open. A cell that draws its own content (render, or a
  // link column) keeps it as is, so nothing nests.
  private _firstCell(col: Column<T>, row: T, p: CardParts): Content | typeof nothing {
    const content = this._cell(col, row);
    const href = safeUrl(p.href);
    const way = col.render || col.type === 'link'
      ? content
      : href
        ? html`<a class="dv-open" href=${href}>${content}</a>`
        : this._opens
          ? html`<button type="button" class="dv-open" @click=${() => this._open(row)}>${content}</button>`
          : content;
    if (p.picture === undefined) return way;
    return html`<span class="dv-row-head"><span class="dv-row-picture" aria-hidden="true">${p.picture}</span>${way}</span>`;
  }

  private _right(col: Column<T>): boolean {
    return col.align ? col.align === 'right' : col.type === 'number' || col.type === 'money';
  }

  private _table(rows: T[], w: Words, sections: FilterSection[] = [], styled?: { view: FilterStyleView; on: FilterStyleHandlers }): TemplateResult {
    const cols = this.columns;
    const sel = this._selNow;
    // A style's header hook, drawn after the sort button in each column that has a section.
    const style = this._fStyle;
    const head = (c: Column<T>, index: number) => {
      const s = style?.header && styled ? sections.find((x) => x.key === c.key) : undefined;
      return s ? style!.header!(s, { index, of: cols.length }, styled!.view, styled!.on, viewerKit) : nothing;
    };
    // With a header hook, a filtered column's header and cells carry dv-filtered (the style tints them).
    const filtered = new Set(style?.header && styled ? sections.filter((x) => isSet(x, styled.view.value[x.key])).map((x) => x.key) : []);
    const cls = (c: Column<T>) => [this._right(c) ? 'dv-right' : '', filtered.has(c.key) ? 'dv-filtered' : ''].join(' ').trim();
    return html`<div class="dv-table-wrap">
      <table class="dv-table" aria-label=${this.label || nothing}>
        <thead>
          <tr>
            ${sel ? html`<th scope="col" class="dv-select-cell">${sel.a.pageBox(sel.v, sel.on, selectKit)}</th>` : nothing}
            ${cols.map((c, i) => {
              const sorted = this._q.sort === c.key;
              const ariaSort = sorted ? (this._q.dir === 'desc' ? 'descending' : 'ascending') : nothing;
              return html`<th scope="col" class=${cls(c)} aria-sort=${ariaSort}>
                ${c.sortable
                  ? html`<button type="button" @click=${() => this._sortBy(c.key)}>${c.label}<span
                        aria-hidden="true">${sorted ? (this._q.dir === 'desc' ? '↓' : '↑') : ''}</span></button>`
                  : c.label}${head(c, i)}
              </th>`;
            })}
            <th scope="col"><span class="dv-sr">${w.actions}</span></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, r) => {
            const p = this._parts(row);
            const t = this._ticked(row);
            return html`<tr class=${t ? 'dv-selected' : nothing} aria-selected=${t ? 'true' : nothing}>
              ${sel ? html`<td class="dv-select-cell">${this._box(row)}</td>` : nothing}
              ${cols.map((c, i) => i === 0
                ? html`<th scope="row" class=${cls(c)}>${this._firstCell(c, row, p)}</th>`
                : html`<td class=${cls(c)}>${this._cell(c, row)}</td>`)}
              <td class="dv-row-menu">${renderMenu(p.menu, `${this._uid}-t${r}`, w.menuFor(p.title),
                (item, button) => this._pick(item, row, button))}</td>
            </tr>`;
          })}
        </tbody>
      </table>
    </div>`;
  }

  // Without cardOf, the card-* attributes make the card; without those either, the first column
  // is the title and the next two are facts.
  private _parts(row: T): CardParts {
    if (this.cardOf) return this.cardOf(row);
    if (this._fromAttributes) return this._attrParts(row);
    const [first, ...rest] = this.columns;
    return {
      title: first ? formatCell(first, row, this.lang || undefined) : '',
      // A link column is plain text here: nothing in a card's body can be pressed.
      facts: rest.slice(0, 2)
        .map((c) => (c.type === 'link' ? formatCell(c, row, this.lang || undefined) : this._cell(c, row)))
        .filter((x): x is Content => x !== nothing && x !== ''),
    };
  }

  private get _fromAttributes(): boolean {
    return [this.cardTitle, this.cardPicture, this.cardFacts, this.cardMeta, this.cardValue, this.cardHref]
      .some((a) => a !== undefined && a !== null);
  }

  // The text for one row key: its column's format when it is a column, else the plain value.
  private _textOf(key: string, row: T): string {
    const col = this.columns.find((c) => c.key === key) ?? { key, label: key };
    return formatCell(col, row, this.lang || undefined);
  }

  private _attrParts(row: T): CardParts {
    const raw = (key: string | undefined) => (key ? (row as Record<string, unknown>)[key] : undefined);
    const text = (key: string | undefined) => (key?.trim() ? this._textOf(key.trim(), row) : '');
    const titleKey = this.cardTitle?.trim() || this.columns[0]?.key;
    const p: CardParts = { title: titleKey ? this._textOf(titleKey, row) : '' };
    // A picture only from a web or relative address; anything else shows no picture.
    const src = safeUrl(raw(this.cardPicture?.trim()));
    if (src && /^https?:/.test(src)) p.picture = html`<img src=${src} alt="" loading="lazy" />`;
    const facts = (this.cardFacts ?? '').split(',').map((k) => k.trim()).filter(Boolean).slice(0, 2)
      .map((k) => this._textOf(k, row)).filter(Boolean);
    if (facts.length) p.facts = facts;
    const meta = text(this.cardMeta);
    if (meta) p.meta = meta;
    const value = text(this.cardValue);
    if (value) p.value = value;
    const href = safeUrl(raw(this.cardHref?.trim()));
    if (href) p.href = href;
    return p;
  }

  // The card hooks for one row: the built-in card's, and a custom card's <dv-actions>.
  private _hooks(row: T, p: CardParts, menuId: string): CardHooks {
    const w = this.text;
    return {
      menuId,
      menuLabel: w.menuFor(p.title),
      onOpen: this._opens ? () => this._open(row) : undefined,
      onAction: (id) => this._action(id, row),
      onPick: (item, button) => this._pick(item, row, button),
      actions: this.cardActions ?? 'menu',
      max: Number.isFinite(Number(this.cardActionsMax)) && this.cardActionsMax !== undefined && this.cardActionsMax !== null
        ? Number(this.cardActionsMax) : 3,
      moreLabel: w.moreFor(p.title),
      moreText: this.cardMoreLabel || w.more,
      as: 'li',
      headStart: this._box(row),
      className: this._ticked(row) ? 'dv-selected' : undefined,
    };
  }

  private _cards(rows: T[]): TemplateResult {
    const custom = this._source;
    if (custom) return this._custom.list(rows, custom, this.label);
    return html`<ul class="dv-cards" aria-label=${this.label || nothing}>
      ${rows.map((row, r) => {
        const p = this._parts(row);
        return renderCard(p, this._hooks(row, p, `${this._uid}-c${r}`));
      })}
    </ul>`;
  }

  private _confirm(w: Words): TemplateResult {
    return renderConfirm(this._uid, this._ask?.item, w, this._onConfirmClose);
  }

  // The pager: the pagination package's drawing, with the viewer's words and numbers.
  private _pages(w: Words, page: number, total: number, shown: number): TemplateResult {
    return renderPagination({
      page,
      size: this._size,
      total,
      shown,
      pager: this.pager === 'numbers' ? 'numbers' : 'simple',
      sizes: this._choices,
      words: w,
      format: (n) => this._num(n),
    }, { onPage: (n, num) => this._goTo(n, num), onSize: (n) => this._setSize(n) });
  }
}

// A query without the parts that are unset: no "Search in" and no empty filters.
function tidy(q: AddressQuery): AddressQuery {
  const out = { ...q };
  if (!out.searchIn) delete out.searchIn;
  if (!out.filters || !Object.keys(out.filters).length) delete out.filters;
  return out;
}

/** The events a viewer fires. All bubble and are composed; check `e.target` when lists nest. */
export type DataViewerEventMap<T = Record<string, unknown>> = {
  'dv-open': CustomEvent<{ row: T }>;
  /** item: only from a data-action element in a custom card (its id and its text). */
  'dv-action': CustomEvent<{ id: string; row: T; item?: { id: string; label: string } }>;
  'dv-query': CustomEvent<Query>;
  'dv-layout': CustomEvent<{ layout: Layout }>;
  /** filter-style="views": the user views after every save, rename, delete and undo. */
  'views-change': CustomEvent<{ views: SavedView[] }>;
  /** The selection changed: by the visitor, a query change or clearSelection() (not by setting selected). */
  'dv-select': CustomEvent<{ keys: string[]; all: boolean; except: string[] }>;
  /** A selection bar action; cancelable (preventDefault() keeps the selection). */
  'dv-batch': CustomEvent<{ action: string; keys: string[]; rows: T[]; all: boolean; except: string[]; query: Query }>;
};

declare global {
  interface HTMLElementTagNameMap {
    'lfdln-data-viewer': LfdlnDataViewer;
    'lfdln-dv-column': LfdlnDvColumn;
  }
  // So addEventListener('dv-query', e => e.detail.page) is typed on any element they bubble to.
  interface HTMLElementEventMap extends DataViewerEventMap {}
}
