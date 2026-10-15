import { LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { clampPage, pageAfterResize, pageSizeChoices, pageSizeOf, parsePageSizes } from './paging.ts';
import { defaultPaginationWords, focusCurrentPage, renderPagination, type Pager, type PaginationWords } from './render.ts';
import { addPaginationStyles } from './styles.ts';

// Formatters are slow to make; a locale the browser doesn't know falls back to its own.
const formats = new Map<string, Intl.NumberFormat>();
function formatterFor(lang: string): Intl.NumberFormat {
  let f = formats.get(lang);
  if (!f) {
    try {
      f = new Intl.NumberFormat(lang || undefined);
    } catch {
      f = new Intl.NumberFormat();
    }
    formats.set(lang, f);
  }
  return f;
}

/**
 * <lfdln-pagination>: pages for any list. Give it `total` (and `page`, `page-size`); it shows
 * "Showing 41–50 of 120 · Page 5 of 12" in a polite live region, Previous and Next, numbered
 * pages with pager="numbers", and "Rows per page" with page-sizes. It moves itself and fires
 * page-change with { page, size }; the page shows the rows. No shadow root: page CSS reaches in.
 */
export class LfdlnPagination extends LitElement {
  static override properties = {
    total: { type: Number },
    page: { type: Number },
    pageSize: { type: Number, attribute: 'page-size' },
    pageSizes: { attribute: 'page-sizes', converter: { fromAttribute: (v: string | null) => parsePageSizes(v) } },
    pager: { type: String },
    label: { type: String },
    words: { attribute: false },
    _picked: { state: true },
  };

  /** How many rows there are in all. */
  declare total: number;
  /** The current page (1 is the first). Kept between 1 and the last page when drawn. */
  declare page: number;
  /** Rows per page; with page-sizes, the starting choice (added to the list in order). */
  declare pageSize: number;
  /** The sizes a visitor may pick from ("Rows per page"); fewer than two valid: no picker. */
  declare pageSizes: number[] | undefined;
  /** 'simple' (Previous / Next, the default) or 'numbers'. */
  declare pager: Pager | undefined;
  /** The <nav>'s name for screen readers (default "Pages"). */
  declare label: string | undefined;
  /** Replaces any of the text. */
  declare words: Partial<PaginationWords>;
  // The visitor's pick from "Rows per page", until the page sets page-size again.
  declare _picked: number | undefined;

  constructor() {
    super();
    this.total = 0;
    this.page = 1;
    this.pageSize = 20;
    this.words = {};
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    addPaginationStyles(this.ownerDocument);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    // A page-size set by the page wins over an earlier pick.
    if (this.hasUpdated && changed.has('pageSize')) this._picked = undefined;
  }

  // The "Rows per page" choices (page-size added in order), or [] for no picker.
  private get _choices(): number[] {
    const sizes = pageSizeChoices(this.pageSizes, pageSizeOf(this.pageSize));
    return sizes.length > 1 ? sizes : [];
  }

  /** The rows per page in use: the visitor's pick when it is one of the choices, else page-size. */
  get size(): number {
    const pick = this._picked;
    return pick !== undefined && this._choices.includes(pick) ? pick : pageSizeOf(this.pageSize);
  }

  /** How many pages there are. */
  get pages(): number {
    return Math.max(1, Math.ceil((Number(this.total) || 0) / this.size));
  }

  private _fire(): void {
    this.dispatchEvent(new CustomEvent('page-change', { detail: { page: this.page, size: this.size }, bubbles: true, composed: true }));
  }

  private _goTo(page: number, number: boolean): void {
    this.page = clampPage(page, this.pages);
    this._fire();
    void this.updateComplete.then(() => focusCurrentPage(this.querySelector(':scope > .lfdln-pagination-nav'), number));
  }

  // The visitor picked a size: keep the first row they were looking at on screen.
  private _setSize(size: number): void {
    if (size === this.size || !this._choices.includes(size)) return;
    const page = pageAfterResize(clampPage(this.page, this.pages), this.size, size);
    this._picked = size;
    this.page = page;
    this._fire();
  }

  protected override render(): TemplateResult {
    const total = Math.max(0, Number(this.total) || 0);
    const f = formatterFor(this.lang);
    return renderPagination({
      page: clampPage(this.page, this.pages),
      size: this.size,
      total,
      pager: this.pager === 'numbers' ? 'numbers' : 'simple',
      sizes: this._choices,
      label: this.label,
      words: { ...defaultPaginationWords, ...this.words },
      format: (n) => f.format(n),
    }, { onPage: (p, n) => this._goTo(p, n), onSize: (s) => this._setSize(s) });
  }
}

/** The events <lfdln-pagination> fires. It bubbles and is composed. */
export type PaginationEventMap = {
  'page-change': CustomEvent<{ page: number; size: number }>;
};

declare global {
  interface HTMLElementTagNameMap {
    'lfdln-pagination': LfdlnPagination;
  }
  interface HTMLElementEventMap extends PaginationEventMap {}
}
