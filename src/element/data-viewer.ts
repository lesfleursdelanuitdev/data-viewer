import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { live } from 'lit/directives/live.js';
import type { CardParts, Column, Content, MenuItem, Query, View } from '../core/types.ts';
import { applyQuery, pageRange } from '../core/list.ts';
import { formatCell } from '../core/format.ts';
import { readQuery, writeQuery } from '../core/address.ts';
import { addStyles } from './styles.ts';
import { safeUrl } from './safe-url.ts';
import { dvCard } from './card.ts';
import { dvMenu } from './menu.ts';
import { columnsIn } from './column.ts';
import { adapterNamed, whenRegistered } from '../adapters/register.ts';

export type Layout = 'table' | 'cards';

// Every piece of text the list shows. Plain English defaults; a page can replace any of them.
export type Words = {
  search: string;
  views: string;
  pages: string;
  previous: string;
  next: string;
  showTable: string;
  showCards: string;
  actions: string;
  empty: string;
  loadFailed: string;
  tryAgain: string;
  cancel: string;
  ok: string;
  menuFor: (title: string) => string;
  showing: (from: string, to: string, total: string) => string;
  pageOf: (page: string, pages: string) => string;
};

export const defaultWords: Words = {
  search: 'Search',
  views: 'Views',
  pages: 'Pages',
  previous: 'Previous',
  next: 'Next',
  showTable: 'Show a table',
  showCards: 'Show cards',
  actions: 'What you can do',
  empty: 'Nothing to show.',
  loadFailed: "Couldn't load this list.",
  tryAgain: 'Try again',
  cancel: 'Cancel',
  ok: 'OK',
  menuFor: (title) => `What you can do with ${title}`,
  showing: (from, to, total) => `Showing ${from}–${to} of ${total}`,
  pageOf: (page, pages) => `Page ${page} of ${pages}`,
};

const blank: Query = { page: 1, search: '', sort: '', dir: 'asc', view: '' };
const PHONE = '(max-width: 640px)';
const DEBOUNCE_MS = 300;
let lists = 0; // gives each list its own prefix for menu ids

// What the built-in confirm dialog is asking about.
type Ask<T> = { item: MenuItem; row: T; button: HTMLElement };

// With an adapter: not known until the first answer, then browser (all rows came) or server.
type LoadMode = 'unknown' | 'browser' | 'server';

/**
 * <lfdln-data-viewer>: one list of rows, drawn as a table or as cards.
 * Browser mode (no `total`): it searches, sorts, filters and pages `rows` itself.
 * Server mode (`total` set): it shows `rows` as given and fires `query` for the host to answer.
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
    views: { attribute: false },
    pageSize: { type: Number, attribute: 'page-size' },
    layout: { type: String, reflect: true },
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
    adapter: { type: String },
    src: { type: String },
    _q: { state: true },
    _failed: { state: true },
    _searchText: { state: true },
    _ask: { state: true },
  };

  declare label: string;
  declare columns: Column<T>[];
  declare cardOf: ((row: T) => CardParts) | undefined;
  declare views: View<T>[] | undefined;
  declare pageSize: number;
  declare layout: Layout | undefined;
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
  /** A registered adapter's name (json, pammy, …) and the address it loads from. */
  declare adapter: string | undefined;
  declare src: string | undefined;
  /** The child tag read as columns in HTML; define() sets it per registered name. */
  static columnTag = 'lfdln-dv-column';
  declare _q: Query;
  declare _searchText: string;
  declare _ask: Ask<T> | undefined;
  declare _failed: boolean;
  private _uid = `dv${++lists}`;

  private _timer: ReturnType<typeof setTimeout> | undefined;
  // Set when the host hands over rows or a total, so busy clears even if the host
  // answered inside its query listener (same update as the busy flag).
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
    this.words = {};
    this.busy = false;
    this._q = { ...blank };
    this._searchText = '';
    this._failed = false;
  }

  // Light DOM, so page CSS reaches in.
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    addStyles(this.ownerDocument);
    this.layout = this._remembered() ?? this.layout ?? (matchMedia(PHONE).matches ? 'cards' : 'table');
    if (this._prefix) {
      window.addEventListener('popstate', this._onPop);
      this._readAddress(false);
    }
    // Back on the page after a load was cut off: ask again.
    if (this.hasUpdated && this._stale) this._requestLoad();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this._onPop);
    clearTimeout(this._timer);
    // A load still running or waiting for its adapter is dropped, and redone on return.
    if (this._ctrl || this._unwait || this._loadQueued) this._stale = true;
    this._ctrl?.abort();
    this._ctrl = undefined;
    this._unwait?.();
    this._unwait = undefined;
    this._seq++;
  }

  // HTML only: what the markup says, read before the first drawing clears the children. The
  // columns are children; adapter and src are attributes (Lit has usually read them already).
  private _readMarkup(): void {
    if (!this.columns?.length) {
      const cols = columnsIn<T>(this, (this.constructor as typeof LfdlnDataViewer).columnTag);
      if (cols.length) this.columns = cols;
    }
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
    // A new adapter or address: start again from the first answer.
    if ((changed.has('adapter') || changed.has('src')) && this._adapted) {
      this._mode = 'unknown';
      this._failed = false;
      this._requestLoad();
    }
    if (changed.has('state') && this.state) {
      this._q = { ...this._q, ...this.state };
      this._searchText = this._q.search;
    }
    // rememberAs is often set after the element connects; the stored choice still wins.
    if (changed.has('rememberAs')) {
      const remembered = this._remembered();
      if (remembered) this.layout = remembered;
    }
    // A server page past the end (an old bookmark, or rows deleted) moves to the last page.
    // This runs first, so a host that answers the new query at once still clears busy below.
    if (this._server) {
      const pages = Math.max(1, Math.ceil((Number(this.total) || 0) / this.pageSize));
      const page = Math.min(Math.max(1, this._q.page), pages);
      if (page !== this._q.page) this._change({ page }, true);
    }
    // New rows or a new total from the host answer the last query in server mode.
    if (this._answered && this._server) this.busy = false;
    this._answered = false;
  }

  /** The words in use: the defaults with the page's own on top. */
  get text(): Words {
    return { ...defaultWords, ...this.words };
  }

  private get _server(): boolean {
    return this.total !== undefined && this.total !== null;
  }

  private get _adapted(): boolean {
    return Boolean(this.adapter?.trim() && this.src?.trim());
  }

  private get _prefix(): string {
    return (this.urlState ?? '').trim();
  }

  private _remembered(): Layout | undefined {
    if (!this.rememberAs) return undefined;
    try {
      const v = localStorage.getItem(this.rememberAs);
      return v === 'table' || v === 'cards' ? v : undefined;
    } catch {
      return undefined; // storage blocked: just don't remember
    }
  }

  private _readAddress(announce: boolean): void {
    const q = readQuery(new URLSearchParams(location.search), this._prefix);
    clearTimeout(this._timer);
    this._q = q;
    this._searchText = q.search;
    // A restored or Back-button state that isn't the default needs the host's rows.
    if (announce || JSON.stringify(q) !== JSON.stringify(blank)) this._announce();
  }

  private _writeAddress(replace: boolean): void {
    if (!this._prefix) return;
    const params = writeQuery(new URLSearchParams(location.search), this._prefix, this._q);
    const search = params.toString();
    const url = `${location.pathname}${search ? `?${search}` : ''}${location.hash}`;
    if (url === `${location.pathname}${location.search}${location.hash}`) return;
    if (replace) history.replaceState(history.state, '', url);
    else history.pushState(history.state, '', url);
  }

  private _announce(): void {
    this._answered = false;
    if (this._server) this.busy = true;
    this.dispatchEvent(new CustomEvent<Query>('query', { detail: { ...this._q }, bubbles: true, composed: true }));
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
      const out = await adapter.load({ ...this._q }, { signal: ctrl.signal, src: this.src!.trim(), pageSize: this.pageSize });
      if (seq !== this._seq) return; // a newer load was asked for meanwhile
      this._mode = out.total === undefined || out.total === null ? 'browser' : 'server';
      this._failed = false;
      this.total = this._mode === 'server' ? out.total : undefined;
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

  // One change to what is shown: store it, put it in the address, tell the host.
  private _change(over: Partial<Query>, replace = false): void {
    this._q = { ...this._q, ...over };
    this._writeAddress(replace);
    this._announce();
  }

  private _open(row: T): void {
    this.dispatchEvent(new CustomEvent('open', { detail: { row }, bubbles: true, composed: true }));
  }

  private _action(id: string, row: T): void {
    this.dispatchEvent(new CustomEvent('action', { detail: { id, row }, bubbles: true, composed: true }));
  }

  // A menu choice. Only an item with confirm text is asked about here; the host asks for the rest.
  private _pick(item: MenuItem, row: T, button: HTMLElement): void {
    if (!item.confirm) return this._action(item.id, row);
    this._ask = { item, row, button };
    void this.updateComplete.then(() => {
      const d = this.querySelector<HTMLDialogElement>(':scope > .dv-root > dialog.dv-confirm');
      if (!d || d.open) return;
      d.returnValue = '';
      d.showModal();
    });
  }

  // Closing by Cancel, Escape or OK all land here; only OK sets returnValue to "ok".
  private _onConfirmClose(e: Event): void {
    const ask = this._ask;
    this._ask = undefined;
    if (!ask) return;
    ask.button.focus();
    if ((e.currentTarget as HTMLDialogElement).returnValue === 'ok') this._action(ask.item.id, ask.row);
  }

  private _onSearchInput(e: Event): void {
    this._searchText = (e.target as HTMLInputElement).value;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      const search = this._searchText.trim();
      if (search !== this._q.search) this._change({ search, page: 1 }, true);
    }, DEBOUNCE_MS);
  }

  private _sortBy(key: string): void {
    const dir = this._q.sort === key && this._q.dir === 'asc' ? 'desc' : 'asc';
    this._change({ sort: key, dir, page: 1 });
  }

  private _setLayout(layout: Layout): void {
    if (layout === this.layout) return;
    this.layout = layout;
    if (this.rememberAs) {
      try {
        localStorage.setItem(this.rememberAs, layout);
      } catch {
        // storage blocked: the choice lasts until the page closes
      }
    }
    this.dispatchEvent(new CustomEvent('layout', { detail: { layout }, bubbles: true, composed: true }));
  }

  private _viewHref(key: string): string {
    if (!this._prefix) return '#';
    const params = writeQuery(new URLSearchParams(location.search), this._prefix, { ...this._q, view: key, page: 1 });
    const s = params.toString();
    return `${location.pathname}${s ? `?${s}` : ''}`;
  }

  private _num(n: number): string {
    return new Intl.NumberFormat(this.lang || undefined).format(n);
  }

  protected override render(): TemplateResult {
    const w = this.text;
    let rows: T[];
    let total: number;
    let page: number;
    if (this._server) {
      rows = this.rows ?? [];
      total = Number(this.total) || 0;
      page = this._q.page;
    } else {
      const out = applyQuery(this.rows ?? [], this.columns, this._q, {
        views: this.views,
        searchKeys: this.searchKeys,
        pageSize: this.pageSize,
      });
      ({ rows, total, page } = out);
    }
    const range = pageRange(page, this.pageSize, total, rows.length);
    // Before an adapter's first answer there is nothing to say yet ("Nothing to show." would be wrong).
    const first = this._adapted && this._mode === 'unknown' && !this._failed && rows.length === 0;

    return html`<div class="dv-root" aria-busy=${this.busy ? 'true' : 'false'}>
      ${this.compact ? nothing : this._bar(w)}
      ${this._failed
        ? html`<div class="dv-error" role="alert">
            <p>${w.loadFailed}</p>
            <button type="button" @click=${() => this._requestLoad()}>${w.tryAgain}</button>
          </div>`
        : nothing}
      ${first
        ? nothing
        : rows.length === 0
          ? html`<p class="dv-empty">${w.empty}</p>`
          : this.layout === 'cards'
            ? this._cards(rows)
            : this._table(rows, w)}
      ${this.compact || first ? nothing : this._pages(w, page, total, range)}
      ${this._confirm(w)}
    </div>`;
  }

  private _bar(w: Words): TemplateResult {
    return html`<div class="dv-bar">
      <input class="dv-search" type="search" aria-label=${w.search} placeholder=${w.search}
        .value=${live(this._searchText)} @input=${this._onSearchInput} />
      ${this.views?.length
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
      ${this.rememberAs
        ? html`<div class="dv-layout" role="group">
            <button type="button" aria-pressed=${this.layout === 'table' ? 'true' : 'false'}
              @click=${() => this._setLayout('table')}>${w.showTable}</button>
            <button type="button" aria-pressed=${this.layout === 'cards' ? 'true' : 'false'}
              @click=${() => this._setLayout('cards')}>${w.showCards}</button>
          </div>`
        : nothing}
    </div>`;
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
  // the card's link or a button that fires open. A cell that draws its own content (render, or a
  // link column) keeps it as is, so nothing nests.
  private _firstCell(col: Column<T>, row: T, p: CardParts): Content | typeof nothing {
    const content = this._cell(col, row);
    const href = safeUrl(p.href);
    const way = col.render || col.type === 'link'
      ? content
      : href
        ? html`<a class="dv-open" href=${href}>${content}</a>`
        : html`<button type="button" class="dv-open" @click=${() => this._open(row)}>${content}</button>`;
    if (p.picture === undefined) return way;
    return html`<span class="dv-row-head"><span class="dv-row-picture" aria-hidden="true">${p.picture}</span>${way}</span>`;
  }

  private _right(col: Column<T>): boolean {
    return col.align ? col.align === 'right' : col.type === 'number' || col.type === 'money';
  }

  private _table(rows: T[], w: Words): TemplateResult {
    const cols = this.columns;
    return html`<div class="dv-table-wrap">
      <table class="dv-table" aria-label=${this.label || nothing}>
        <thead>
          <tr>
            ${cols.map((c) => {
              const sorted = this._q.sort === c.key;
              const ariaSort = sorted ? (this._q.dir === 'desc' ? 'descending' : 'ascending') : nothing;
              return html`<th scope="col" class=${this._right(c) ? 'dv-right' : ''} aria-sort=${ariaSort}>
                ${c.sortable
                  ? html`<button type="button" @click=${() => this._sortBy(c.key)}>${c.label}<span
                        aria-hidden="true">${sorted ? (this._q.dir === 'desc' ? '↓' : '↑') : ''}</span></button>`
                  : c.label}
              </th>`;
            })}
            <th scope="col"><span class="dv-sr">${w.actions}</span></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, r) => {
            const p = this._parts(row);
            return html`<tr>
              ${cols.map((c, i) => {
                const cls = this._right(c) ? 'dv-right' : '';
                return i === 0
                  ? html`<th scope="row" class=${cls}>${this._firstCell(c, row, p)}</th>`
                  : html`<td class=${cls}>${this._cell(c, row)}</td>`;
              })}
              <td class="dv-row-menu">${dvMenu(p.menu, `${this._uid}-t${r}`, w.menuFor(p.title),
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
      facts: rest.slice(0, 2).map((c) => this._cell(c, row)).filter((x): x is Content => x !== nothing && x !== ''),
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

  private _cards(rows: T[]): TemplateResult {
    const w = this.text;
    return html`<ul class="dv-cards" aria-label=${this.label || nothing}>
      ${rows.map((row, r) => {
        const p = this._parts(row);
        return dvCard(p, {
          menuId: `${this._uid}-c${r}`,
          menuLabel: w.menuFor(p.title),
          onOpen: () => this._open(row),
          onAction: (id) => this._action(id, row),
          onPick: (item, button) => this._pick(item, row, button),
        });
      })}
    </ul>`;
  }

  private _confirm(w: Words): TemplateResult {
    const item = this._ask?.item;
    return html`<dialog class="dv-confirm" aria-labelledby=${`${this._uid}-ask`} @close=${this._onConfirmClose}>
      <form method="dialog">
        <p id=${`${this._uid}-ask`}>${item?.confirm ?? ''}</p>
        <div class="dv-confirm-buttons">
          <button value="cancel" autofocus>${w.cancel}</button>
          <button value="ok" class=${item?.danger ? 'dv-danger' : ''}>${item?.label || w.ok}</button>
        </div>
      </form>
    </dialog>`;
  }

  private _pages(w: Words, page: number, total: number, r: { from: number; to: number; pages: number }): TemplateResult {
    return html`<nav class="dv-pages" aria-label=${w.pages}>
      <button type="button" ?disabled=${page <= 1} @click=${() => this._change({ page: page - 1 })}>${w.previous}</button>
      <span role="status" aria-live="polite">${total === 0
        ? w.empty
        : html`${w.showing(this._num(r.from), this._num(r.to), this._num(total))}<span class="dv-sr">, </span>
            <span class="dv-page">${w.pageOf(this._num(page), this._num(r.pages))}</span>`}</span>
      <button type="button" ?disabled=${page >= r.pages} @click=${() => this._change({ page: page + 1 })}>${w.next}</button>
    </nav>`;
  }
}
