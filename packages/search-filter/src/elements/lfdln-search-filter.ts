import { LitElement, html, nothing, svg, type TemplateResult } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { live } from 'lit/directives/live.js';
import { ref } from 'lit/directives/ref.js';
import { repeat } from 'lit/directives/repeat.js';
import { addFilterStyles, defaultFilterWords, normalise } from '@lesfleursdelanuitdev/filter';
import type { FilterKit, FilterSection, FilterValue, FilterWords } from '@lesfleursdelanuitdev/filter';
import type { SearchFilterWords } from '../core/words.ts';
import { searchFilterStyle } from '../style/search-filter.ts';

const PHONE = '(max-width: 639px)';
const NARROW = searchFilterStyle.narrowBelow!;
const kit: FilterKit = { html, svg, nothing, ref, repeat, classMap, live };

// Ids unique on the page, shared with the other packages' copies (a registered symbol).
const IDS = Symbol.for('lfdln.ids');
function nextId(): string {
  const g = globalThis as unknown as Record<symbol, number | undefined>;
  g[IDS] = (g[IDS] ?? 0) + 1;
  return `lfdln-sf${g[IDS]}`;
}

/** What `countFor` is asked: the typed text as the search, in the applied "Search in", with the applied filters. */
export type SearchFilterQuery = { search: string; in: string; value: FilterValue };

/**
 * <lfdln-search-filter>: the list's search and its filters in one field (the `search` filter
 * style on its own). Typing suggests filters; picking one, or searching the text, applies at
 * once: `search-change { search, in }` or `filter-change { value }`, then
 * `search-filter-change { search, value }`. Below 480 px of its own width, or on a phone, the
 * suggestions open as a bottom sheet. Counts are the options' own `count`; the "Search for" row's
 * is `countFor`'s. No shadow root.
 */
export class LfdlnSearchFilter extends LitElement {
  static override properties = {
    sections: { attribute: false },
    value: { attribute: false },
    search: { type: String },
    in: { type: String },
    fields: { attribute: false },
    words: { attribute: false },
    label: { type: String },
    countFor: { attribute: false },
    _menu: { state: true },
    _typed: { state: true },
    _phone: { state: true },
  };

  /** The parts of the filter, in order. */
  declare sections: FilterSection[];
  /** The applied filters, by section key. */
  declare value: FilterValue;
  /** The applied search text. */
  declare search: string;
  /** The applied "Search in" field's key; '' searches every column. */
  declare in: string;
  /** The "Search in" fields, offered as "Name has “q”" rows; none, no rows. */
  declare fields: { key: string; label: string }[];
  /** Replaces any of the text. */
  declare words: Partial<SearchFilterWords & FilterWords>;
  /** The field's accessible name (default "Search or filter"). */
  declare label: string | undefined;
  /** How many rows the typed text would leave, for the "Search for" row; null or none: not shown. */
  declare countFor: ((q: SearchFilterQuery) => number | null) | undefined;
  declare _menu: string | null;
  declare _typed: string;
  declare _phone: boolean;

  private _uid = nextId();
  private _media: MediaQueryList | undefined;
  private _resize: ResizeObserver | undefined;
  private _width = Infinity;
  private _frame = 0;
  private _narrow = (): boolean => Boolean(this._media?.matches) || this._width < NARROW;
  // Redraw on the next frame, and only when the phone flag flips.
  private _check = () => {
    if (this._frame) return;
    this._frame = requestAnimationFrame(() => {
      this._frame = 0;
      const phone = this._narrow();
      if (phone === this._phone) return;
      this._menu = null;
      this._phone = phone;
    });
  };

  constructor() {
    super();
    this.sections = [];
    this.value = {};
    this.search = '';
    this.in = '';
    this.fields = [];
    this.words = {};
    this._menu = null;
    this._typed = '';
    this._phone = false;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    addFilterStyles(this.ownerDocument);
    searchFilterStyle.styles();
    this._media = matchMedia(PHONE);
    this._media.addEventListener('change', this._check);
    this._resize = new ResizeObserver(([e]) => {
      if (e) this._width = e.contentRect.width;
      this._check();
    });
    this._resize.observe(this);
    this._phone = this._narrow();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._media?.removeEventListener('change', this._check);
    this._resize?.disconnect();
    cancelAnimationFrame(this._frame);
    this._frame = 0;
    this._menu = null;
  }

  private _fire(type: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  /** Applies a filter value: sets `value` (ranges tidied, empty sections dropped), fires filter-change, then search-filter-change. Unchanged, nothing. */
  apply(value: FilterValue): void {
    const next = normalise(this.sections ?? [], value ?? {});
    if (JSON.stringify(next) === JSON.stringify(normalise(this.sections ?? [], this.value ?? {}))) return;
    this.value = next;
    this._fire('filter-change', { value: this.value });
    this._fire('search-filter-change', { search: this.search, value: this.value });
  }

  /** Applies a search (in `searchIn`, else the "Search in" already applied); fires search-change, then search-filter-change. Unchanged, nothing. */
  setSearch(text: string, searchIn: string = this.in ?? ''): void {
    if (text === (this.search ?? '') && searchIn === (this.in ?? '')) return;
    this.search = text;
    this.in = searchIn;
    this._fire('search-change', { search: this.search, in: this.in });
    this._fire('search-filter-change', { search: this.search, value: this.value ?? {} });
  }

  protected override render(): TemplateResult {
    const words = { ...defaultFilterWords, ...this.words } as FilterWords;
    const value = this.value ?? {};
    const typed = this._typed;
    const none = () => {};
    const typedCount = typed.trim() && this.countFor ? this.countFor({ search: typed.trim(), in: this.in ?? '', value }) ?? null : null;
    return searchFilterStyle.render({
      sections: this.sections ?? [],
      value,
      draft: null,
      open: false,
      active: null,
      phone: this._phone,
      optionSearch: '',
      words,
      uid: this._uid,
      label: this.label || undefined,
      countFor: null,
      results: null,
      total: null,
      menu: this._menu,
      search: { text: this.search ?? '', in: this.in ?? '', fields: this.fields ?? [], only: null, typed, typedCount },
    }, {
      onOpen: none,
      onClose: () => {
        this._menu = null;
      },
      onSection: none,
      onDraft: none,
      onOptionSearch: none,
      onApply: none,
      onClearAll: () => this.apply({}),
      onApplyNow: (next) => this.apply(next),
      onMenu: (key) => {
        this._menu = key;
      },
      onSearch: (text, searchIn) => this.setSearch(text, searchIn),
      onTyped: (text) => {
        this._typed = text;
      },
    }, kit);
  }
}

// The browser lets one class be defined only once, so later names get a subclass.
let used = false;

/** Registers <lfdln-search-filter> (or `name`); a name already taken is left alone. */
export function define(name = 'lfdln-search-filter'): void {
  if (customElements.get(name)) return;
  customElements.define(name, used ? class extends LfdlnSearchFilter {} : LfdlnSearchFilter);
  used = true;
}

declare global {
  interface HTMLElementTagNameMap {
    'lfdln-search-filter': LfdlnSearchFilter;
  }
}
